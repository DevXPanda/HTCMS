import { Op } from 'sequelize';
import { Worker, Ward, AdminManagement, ULB, WorkerTask, WorkerAttendance } from '../models/index.js';
import { sequelize } from '../config/database.js';
import { getEffectiveWardIdsForRequest, getEffectiveUlbForRequest } from '../utils/ulbAccessHelper.js';

/** Allowed worker types (stored in DB as-is; used for validation) */
export const WORKER_TYPES = [
  'ULB',
  'CONTRACTUAL',
  'SWEEPING',
  'TOILET',
  'MRF',
  'GAUSHALA',
  'CLEANING',
  'DRAINAGE',
  'SOLID_WASTE',
  'ROAD_MAINTENANCE',
  'OTHER'
];

/**
 * Generate unique employee code for a worker
 * Format: WRK-{WARD_CODE}-{padded_number}
 */
const generateEmployeeCode = async (wardId) => {
  // Get ward number/code
  const ward = await Ward.findByPk(wardId, {
    attributes: ['id', 'wardNumber']
  });

  if (!ward) {
    throw new Error('Ward not found');
  }

  const wardCode = ward.wardNumber;

  // Count existing workers in this ward
  const count = await Worker.count({
    where: { ward_id: wardId }
  });

  // Generate next number
  let nextNumber = count + 1;
  let employeeCode = `WRK-${wardCode}-${nextNumber.toString().padStart(4, '0')}`;

  // Ensure uniqueness - check if code already exists
  let exists = await Worker.findOne({
    where: { employee_code: employeeCode }
  });

  // If exists, increment until we find a unique code
  while (exists) {
    nextNumber++;
    employeeCode = `WRK-${wardCode}-${nextNumber.toString().padStart(4, '0')}`;
    exists = await Worker.findOne({
      where: { employee_code: employeeCode }
    });
  }

  return employeeCode;
};

/**
 * Create a new worker
 * POST /api/workers
 * Allowed roles: ADMIN, EO
 */
export const createWorker = async (req, res) => {
  try {
    const user = req.user;
    const userRole = user?.role ? user.role.toUpperCase().replace(/-/g, '_') : null;

    // Allowed roles: ADMIN, EO, SUPERVISOR, SFI
    if (userRole !== 'ADMIN' && userRole !== 'EO' && userRole !== 'SUPERVISOR' && userRole !== 'SFI') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only ADMIN, EO, SUPERVISOR, and SFI can create workers.'
      });
    }

    const {
      full_name,
      mobile,
      worker_type,
      worker_type_other,
      ward_id,
      supervisor_id,
      contractor_id,
      status = 'ACTIVE'
    } = req.body;

    // Validation (supervisor_id is optional)
    if (!full_name || !mobile || !ward_id || !worker_type) {
      return res.status(400).json({
        success: false,
        message: 'full_name, mobile, ward_id, and worker_type are required'
      });
    }

    // Validate worker_type
    const normalizedWorkerType = (worker_type || '').toString().toUpperCase().replace(/\s/g, '_');
    if (!WORKER_TYPES.includes(normalizedWorkerType)) {
      return res.status(400).json({
        success: false,
        message: `worker_type must be one of: ${WORKER_TYPES.join(', ')}`
      });
    }

    let ulbId, eoId;

    // Role-based logic
    if (userRole === 'EO') {
      // EO: Get ulb_id and eo_id from token
      const eo = await AdminManagement.findByPk(user.id, {
        attributes: ['id', 'ulb_id', 'role']
      });

      if (!eo || !eo.ulb_id) {
        return res.status(400).json({
          success: false,
          message: 'EO must be assigned to an ULB'
        });
      }

      ulbId = eo.ulb_id;
      eoId = eo.id;

      // Validate ward belongs to EO's ulb_id
      const ward = await Ward.findByPk(ward_id, {
        attributes: ['id', 'ulb_id']
      });

      if (!ward) {
        return res.status(404).json({
          success: false,
          message: 'Ward not found'
        });
      }

      if (ward.ulb_id !== ulbId) {
        return res.status(403).json({
          success: false,
          message: 'Selected ward does not belong to your ULB'
        });
      }
    } else if (userRole === 'SUPERVISOR') {
      // SUPERVISOR: Get ulb_id from supervisor's record (eo_id optional; EO was removed from staff assignment)
      const supervisor = await AdminManagement.findByPk(user.id, {
        attributes: ['id', 'ulb_id', 'eo_id', 'role']
      });

      if (!supervisor || !supervisor.ulb_id) {
        return res.status(400).json({
          success: false,
          message: 'Supervisor must be assigned to an ULB'
        });
      }

      ulbId = supervisor.ulb_id;
      eoId = supervisor.eo_id || null;

      // Validate ward belongs to supervisor's ULB
      const ward = await Ward.findByPk(ward_id, {
        attributes: ['id', 'ulb_id']
      });

      if (!ward) {
        return res.status(404).json({
          success: false,
          message: 'Ward not found'
        });
      }

      if (ward.ulb_id !== ulbId) {
        return res.status(403).json({
          success: false,
          message: 'Selected ward does not belong to your ULB'
        });
      }
    } else if (userRole === 'SFI') {
      // SFI: Get ulb_id from SFI's record (same as supervisor)
      const sfi = await AdminManagement.findByPk(user.id, {
        attributes: ['id', 'ulb_id', 'eo_id', 'role']
      });

      if (!sfi || !sfi.ulb_id) {
        return res.status(400).json({
          success: false,
          message: 'SFI must be assigned to an ULB'
        });
      }

      ulbId = sfi.ulb_id;
      eoId = sfi.eo_id || null;

      const ward = await Ward.findByPk(ward_id, { attributes: ['id', 'ulb_id'] });
      if (!ward) {
        return res.status(404).json({ success: false, message: 'Ward not found' });
      }
      if (ward.ulb_id !== ulbId) {
        return res.status(403).json({
          success: false,
          message: 'Selected ward does not belong to your ULB'
        });
      }
      const sfiWardIds = await getEffectiveWardIdsForRequest(req);
      if (Array.isArray(sfiWardIds) && sfiWardIds.length > 0 && !sfiWardIds.includes(parseInt(ward_id, 10))) {
        return res.status(403).json({
          success: false,
          message: 'You can only create workers in your assigned wards'
        });
      }
    } else if (userRole === 'ADMIN') {
      // ADMIN: ulb_id and eo_id must be passed in request
      if (!req.body.ulb_id || !req.body.eo_id) {
        return res.status(400).json({
          success: false,
          message: 'ulb_id and eo_id are required for ADMIN role'
        });
      }

      ulbId = req.body.ulb_id;
      eoId = req.body.eo_id;

      // Validate ULB exists
      const ulb = await ULB.findByPk(ulbId);
      if (!ulb) {
        return res.status(404).json({
          success: false,
          message: 'ULB not found'
        });
      }

      // Validate EO exists and belongs to the ULB
      const eo = await AdminManagement.findByPk(eoId, {
        attributes: ['id', 'ulb_id', 'role']
      });

      if (!eo) {
        return res.status(404).json({
          success: false,
          message: 'EO not found'
        });
      }

      const normalizedEoRole = eo.role ? eo.role.toUpperCase().replace(/-/g, '_') : null;
      if (normalizedEoRole !== 'EO') {
        return res.status(400).json({
          success: false,
          message: 'Invalid EO ID provided'
        });
      }

      if (eo.ulb_id !== ulbId) {
        return res.status(403).json({
          success: false,
          message: 'EO does not belong to the specified ULB'
        });
      }

      // Validate ward belongs to the ULB
      const ward = await Ward.findByPk(ward_id, {
        attributes: ['id', 'ulb_id']
      });

      if (!ward) {
        return res.status(404).json({
          success: false,
          message: 'Ward not found'
        });
      }

      if (ward.ulb_id !== ulbId) {
        return res.status(403).json({
          success: false,
          message: 'Ward does not belong to the specified ULB'
        });
      }
    }

    // Validate supervisor if provided (optional)
    let finalSupervisorId = null;
    if (supervisor_id) {
      const supervisor = await AdminManagement.findByPk(supervisor_id, {
        attributes: ['id', 'ulb_id', 'ward_id', 'role']
      });

      if (!supervisor) {
        return res.status(404).json({
          success: false,
          message: 'Supervisor not found'
        });
      }

      const normalizedSupervisorRole = supervisor.role ? supervisor.role.toUpperCase().replace(/-/g, '_') : null;
      if (normalizedSupervisorRole !== 'SUPERVISOR') {
        return res.status(400).json({
          success: false,
          message: 'Invalid supervisor ID provided'
        });
      }

      if (supervisor.ulb_id !== ulbId) {
        return res.status(403).json({
          success: false,
          message: 'Supervisor does not belong to the same ULB'
        });
      }

      if (supervisor.ward_id && supervisor.ward_id !== parseInt(ward_id)) {
        return res.status(403).json({
          success: false,
          message: 'Supervisor does not belong to the selected ward'
        });
      }

      finalSupervisorId = parseInt(supervisor_id);
    }

    // Validate contractor if provided
    if (contractor_id) {
      const contractor = await AdminManagement.findByPk(contractor_id, {
        attributes: ['id', 'ulb_id', 'role']
      });

      if (!contractor) {
        return res.status(404).json({
          success: false,
          message: 'Contractor not found'
        });
      }

      const normalizedContractorRole = contractor.role ? contractor.role.toUpperCase().replace(/-/g, '_') : null;
      if (normalizedContractorRole !== 'CONTRACTOR') {
        return res.status(400).json({
          success: false,
          message: 'Invalid contractor ID provided'
        });
      }

      if (contractor.ulb_id !== ulbId) {
        return res.status(403).json({
          success: false,
          message: 'Contractor does not belong to the same ULB'
        });
      }
    }

    // Generate employee code
    const employeeCode = await generateEmployeeCode(ward_id);

    // Create worker
    const worker = await Worker.create({
      employee_code: employeeCode,
      full_name: full_name.trim(),
      mobile: mobile.trim(),
      worker_type: normalizedWorkerType,
      worker_type_other: normalizedWorkerType === 'OTHER' && worker_type_other ? String(worker_type_other).trim().slice(0, 100) : null,
      ulb_id: ulbId,
      ward_id: parseInt(ward_id),
      eo_id: eoId,
      supervisor_id: finalSupervisorId,
      contractor_id: contractor_id ? parseInt(contractor_id) : null,
      status: status.toUpperCase()
    });

    res.status(201).json({
      success: true,
      message: 'Worker created successfully',
      worker: {
        employee_code: worker.employee_code,
        full_name: worker.full_name,
        ward_id: worker.ward_id,
        supervisor_id: worker.supervisor_id
      }
    });
  } catch (error) {
    console.error('createWorker error:', error);

    // Handle unique constraint violation
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Employee code already exists. Please try again.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create worker',
      error: error.message
    });
  }
};

/**
 * Get all workers with their details and proofs (tasks with photos)
 * GET /api/workers
 * Allowed roles: ADMIN, EO
 */
export const getAllWorkers = async (req, res) => {
  try {
    const user = req.user;
    const userRole = user?.role ? user.role.toUpperCase().replace(/-/g, '_') : null;

    // Allowed roles: ADMIN, EO, SUPERVISOR, SFI, SBM (read-only)
    if (userRole !== 'ADMIN' && userRole !== 'EO' && userRole !== 'SUPERVISOR' && userRole !== 'SFI' && userRole !== 'SBM') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only ADMIN, EO, SUPERVISOR, SFI, or SBM can view workers.'
      });
    }

    let whereClause = {};

    // SBM: Global read-only; filter by ulb_id from query if provided
    if (userRole === 'SBM') {
      const { effectiveUlbId } = getEffectiveUlbForRequest(req);
      if (effectiveUlbId) whereClause.ulb_id = effectiveUlbId;
      if (req.query.ward_id) {
        const wardIdNum = parseInt(req.query.ward_id, 10);
        if (!Number.isNaN(wardIdNum)) whereClause.ward_id = wardIdNum;
      }
      if (req.query.status) whereClause.status = req.query.status.toUpperCase();
    }
    // SUPERVISOR: Only show workers assigned to this supervisor (filtered by ULB/modules in dashboard)
    if (userRole === 'SUPERVISOR') {
      whereClause = {
        supervisor_id: user.id,
        status: req.query.status ? req.query.status.toUpperCase() : 'ACTIVE'
      };
    }
    // EO: Only show workers from their ULB
    else if (userRole === 'EO') {
      const eo = await AdminManagement.findByPk(user.id, {
        attributes: ['id', 'ulb_id', 'role']
      });

      if (!eo || !eo.ulb_id) {
        return res.status(400).json({
          success: false,
          message: 'EO must be assigned to an ULB'
        });
      }

      // Get supervisors under this EO
      const supervisorIds = (await AdminManagement.findAll({
        where: {
          eo_id: eo.id,
          ulb_id: eo.ulb_id,
          role: 'SUPERVISOR'
        },
        attributes: ['id']
      })).map(s => s.id);

      whereClause = {
        ulb_id: eo.ulb_id,
        [Op.or]: [
          { eo_id: eo.id },
          ...(supervisorIds.length > 0 ? [{ supervisor_id: { [Op.in]: supervisorIds } }] : [])
        ]
      };
    }
    // ADMIN: Can filter by ulb_id, eo_id, ward_id if provided
    else if (userRole === 'ADMIN') {
      const { ulb_id, eo_id, ward_id, status } = req.query;

      if (ulb_id) {
        whereClause.ulb_id = ulb_id;
      }

      if (eo_id) {
        const eoIdNum = parseInt(eo_id, 10);
        if (!Number.isNaN(eoIdNum)) whereClause.eo_id = eoIdNum;
      }

      if (ward_id != null && ward_id !== '' && String(ward_id) !== 'undefined') {
        const wardIdNum = parseInt(ward_id, 10);
        if (!Number.isNaN(wardIdNum)) whereClause.ward_id = wardIdNum;
      }

      if (status) {
        whereClause.status = status.toUpperCase();
      }
    }
    // SFI: Only show workers from their ULB and assigned wards
    else if (userRole === 'SFI') {
      const sfi = await AdminManagement.findByPk(user.id, { attributes: ['id', 'ulb_id'] });
      if (!sfi || !sfi.ulb_id) {
        return res.status(400).json({
          success: false,
          message: 'SFI must be assigned to an ULB'
        });
      }
      whereClause.ulb_id = sfi.ulb_id;
      const sfiWardIds = await getEffectiveWardIdsForRequest(req);
      if (Array.isArray(sfiWardIds) && sfiWardIds.length > 0) {
        whereClause.ward_id = { [Op.in]: sfiWardIds };
      } else {
        whereClause.ward_id = { [Op.in]: [] };
      }
      if (req.query.status) whereClause.status = req.query.status.toUpperCase();
    }

    const workers = await Worker.findAll({
      where: whereClause,
      include: [
        {
          model: Ward,
          as: 'ward',
          attributes: ['id', 'wardNumber', 'wardName']
        },
        {
          model: AdminManagement,
          as: 'supervisor',
          attributes: ['id', 'full_name', 'employee_id']
        },
        {
          model: AdminManagement,
          as: 'eo',
          attributes: ['id', 'full_name', 'employee_id']
        },
        {
          model: AdminManagement,
          as: 'contractor',
          attributes: ['id', 'full_name', 'employee_id', 'company_name'],
          required: false
        },
        {
          model: ULB,
          as: 'ulb',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Get tasks with proofs for each worker (completed tasks with photos)
    const workerIds = workers.map(w => w.id);
    const tasks = workerIds.length > 0 ? await WorkerTask.findAll({
      where: {
        worker_id: { [Op.in]: workerIds },
        status: 'COMPLETED',
        [Op.or]: [
          { before_photo_url: { [Op.ne]: null } },
          { after_photo_url: { [Op.ne]: null } }
        ]
      },
      include: [
        {
          model: AdminManagement,
          as: 'supervisor',
          attributes: ['id', 'full_name', 'employee_id'],
          required: false
        }
      ],
      order: [['completed_at', 'DESC']]
    }) : [];

    // Filter out tasks with empty string photo URLs
    const tasksWithProofs = tasks.filter(task => {
      const taskData = task.get({ plain: true });
      return (taskData.before_photo_url && taskData.before_photo_url.trim() !== '') ||
        (taskData.after_photo_url && taskData.after_photo_url.trim() !== '');
    });

    // Get attendance proofs (worker_attendance with before/after photo) for each worker
    const attendanceWithPhotos = workerIds.length > 0 ? await WorkerAttendance.findAll({
      where: {
        worker_id: { [Op.in]: workerIds },
        [Op.or]: [
          { before_photo_url: { [Op.ne]: null } },
          { after_photo_url: { [Op.ne]: null } }
        ]
      },
      include: [
        {
          model: AdminManagement,
          as: 'supervisor',
          attributes: ['id', 'full_name', 'employee_id'],
          required: false
        }
      ],
      order: [['attendance_date', 'DESC'], ['checkin_time', 'DESC']]
    }) : [];

    // Group tasks by worker_id
    const tasksByWorker = {};
    tasksWithProofs.forEach(task => {
      const taskData = task.get({ plain: true });
      const workerId = taskData.worker_id;
      if (!tasksByWorker[workerId]) {
        tasksByWorker[workerId] = [];
      }
      tasksByWorker[workerId].push({
        id: `task-${taskData.id}`,
        proof_type: 'task',
        task_type: taskData.task_type,
        area_street: taskData.area_street,
        assigned_date: taskData.assigned_date,
        completed_at: taskData.completed_at,
        before_photo_url: taskData.before_photo_url,
        before_photo_latitude: taskData.before_photo_latitude,
        before_photo_longitude: taskData.before_photo_longitude,
        before_photo_address: taskData.before_photo_address,
        after_photo_url: taskData.after_photo_url,
        after_photo_latitude: taskData.after_photo_latitude,
        after_photo_longitude: taskData.after_photo_longitude,
        after_photo_address: taskData.after_photo_address,
        work_proof_remarks: taskData.work_proof_remarks,
        escalation_flag: taskData.escalation_flag,
        escalation_reason: taskData.escalation_reason,
        supervisor: taskData.supervisor ? {
          id: taskData.supervisor.id,
          full_name: taskData.supervisor.full_name,
          employee_id: taskData.supervisor.employee_id
        } : null
      });
    });

    // Group attendance proofs by worker_id (only include if at least one photo URL is non-empty)
    attendanceWithPhotos.forEach(att => {
      const a = att.get ? att.get({ plain: true }) : att;
      const hasBefore = a.before_photo_url && String(a.before_photo_url).trim() !== '';
      const hasAfter = a.after_photo_url && String(a.after_photo_url).trim() !== '';
      if (!hasBefore && !hasAfter) return;
      const workerId = a.worker_id;
      if (!tasksByWorker[workerId]) {
        tasksByWorker[workerId] = [];
      }
      tasksByWorker[workerId].push({
        id: `att-${a.id}`,
        proof_type: 'attendance',
        task_type: 'Attendance',
        area_street: null,
        assigned_date: a.attendance_date,
        completed_at: a.checkin_time,
        before_photo_url: a.before_photo_url,
        before_photo_latitude: a.latitude,
        before_photo_longitude: a.longitude,
        before_photo_address: null,
        after_photo_url: a.after_photo_url,
        after_photo_latitude: a.latitude,
        after_photo_longitude: a.longitude,
        after_photo_address: null,
        work_proof_remarks: null,
        escalation_flag: false,
        escalation_reason: null,
        supervisor: a.supervisor ? {
          id: a.supervisor.id,
          full_name: a.supervisor.full_name,
          employee_id: a.supervisor.employee_id
        } : null
      });
    });

    // Attach tasks + attendance proofs to workers (combined, sorted by date)
    const workersWithProofs = workers.map(worker => {
      const workerData = worker.get({ plain: true });
      const proofs = tasksByWorker[worker.id] || [];
      proofs.sort((a, b) => {
        const dateA = a.completed_at || a.assigned_date;
        const dateB = b.completed_at || b.assigned_date;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return new Date(dateB) - new Date(dateA);
      });
      workerData.proofs = proofs;
      return workerData;
    });

    res.json({
      success: true,
      data: {
        workers: workersWithProofs,
        total: workersWithProofs.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workers',
      error: error.message
    });
  }
};

/**
 * Get a single worker by ID (read-only)
 * GET /api/workers/:id
 * Allowed: ADMIN, EO, SUPERVISOR, SFI, SBM
 */
export const getWorkerById = async (req, res) => {
  try {
    const userRole = req.user?.role ? req.user.role.toUpperCase().replace(/-/g, '_') : null;
    if (!['ADMIN', 'EO', 'SUPERVISOR', 'SFI', 'SBM'].includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    const workerId = req.params.id;
    const worker = await Worker.findByPk(workerId, {
      include: [
        { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName', 'ulb_id'] },
        { model: AdminManagement, as: 'supervisor', attributes: ['id', 'full_name', 'employee_id'] },
        { model: AdminManagement, as: 'eo', attributes: ['id', 'full_name', 'employee_id'] },
        { model: AdminManagement, as: 'contractor', attributes: ['id', 'full_name', 'employee_id', 'company_name'], required: false },
        { model: ULB, as: 'ulb', attributes: ['id', 'name'], required: false }
      ]
    });
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }
    res.json({ success: true, data: { worker: worker.get({ plain: true }) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch worker', error: error.message });
  }
};

/**
 * Update a worker
 * PUT /api/workers/:id
 * Allowed: ADMIN (any by ULB), EO (under their EO), SUPERVISOR (only workers assigned to them)
 */
export const updateWorker = async (req, res) => {
  try {
    const user = req.user;
    const userRole = user?.role ? user.role.toUpperCase().replace(/-/g, '_') : null;
    const workerId = req.params.id;

    if (userRole !== 'ADMIN' && userRole !== 'EO' && userRole !== 'SUPERVISOR' && userRole !== 'SFI') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only ADMIN, EO, SUPERVISOR, and SFI can update workers.'
      });
    }

    const worker = await Worker.findByPk(workerId, {
      include: [
        { model: Ward, as: 'ward', attributes: ['id', 'ulb_id'] },
        { model: AdminManagement, as: 'supervisor', attributes: ['id', 'ulb_id'] },
        { model: AdminManagement, as: 'eo', attributes: ['id', 'ulb_id'] }
      ]
    });

    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    // Role-based access: who can update this worker?
    if (userRole === 'SUPERVISOR') {
      if (worker.supervisor_id !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only update workers assigned to you.'
        });
      }
    } else if (userRole === 'EO') {
      const eo = await AdminManagement.findByPk(user.id, { attributes: ['id', 'ulb_id'] });
      if (!eo || worker.ulb_id !== eo.ulb_id) {
        return res.status(403).json({
          success: false,
          message: 'You can only update workers in your ULB.'
        });
      }
      const supervisorIds = (await AdminManagement.findAll({
        where: { eo_id: eo.id, ulb_id: eo.ulb_id, role: 'SUPERVISOR' },
        attributes: ['id']
      })).map(s => s.id);
      const underThisEo = worker.eo_id === eo.id || (supervisorIds.length && supervisorIds.includes(worker.supervisor_id));
      if (!underThisEo) {
        return res.status(403).json({
          success: false,
          message: 'You can only update workers under your EO scope.'
        });
      }
    } else if (userRole === 'SFI') {
      const sfi = await AdminManagement.findByPk(user.id, { attributes: ['id', 'ulb_id'] });
      if (!sfi || worker.ulb_id !== sfi.ulb_id) {
        return res.status(403).json({
          success: false,
          message: 'You can only update workers in your ULB.'
        });
      }
      const sfiWardIds = await getEffectiveWardIdsForRequest(req);
      if (Array.isArray(sfiWardIds) && sfiWardIds.length > 0 && !sfiWardIds.includes(worker.ward_id)) {
        return res.status(403).json({
          success: false,
          message: 'You can only update workers in your assigned wards.'
        });
      }
    }
    // ADMIN: can update any worker (optionally restrict by ulb_id in query if needed - not enforced here)

    const {
      full_name,
      mobile,
      worker_type,
      worker_type_other,
      ward_id,
      supervisor_id,
      contractor_id,
      status
    } = req.body;

    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name.trim();
    if (mobile !== undefined) updateData.mobile = mobile.trim();
    if (worker_type !== undefined) {
      const normalized = (worker_type || '').toString().toUpperCase().replace(/\s/g, '_');
      if (!WORKER_TYPES.includes(normalized)) {
        return res.status(400).json({ success: false, message: `worker_type must be one of: ${WORKER_TYPES.join(', ')}` });
      }
      updateData.worker_type = normalized;
    }
    if (worker_type_other !== undefined) {
      const effectiveType = (req.body.worker_type !== undefined ? (req.body.worker_type || '').toUpperCase().replace(/\s/g, '_') : worker.worker_type) || '';
      updateData.worker_type_other = effectiveType === 'OTHER' && worker_type_other ? String(worker_type_other).trim().slice(0, 100) : null;
    }
    if (ward_id !== undefined) {
      const ward = await Ward.findByPk(ward_id, { attributes: ['id', 'ulb_id'] });
      if (!ward || ward.ulb_id !== worker.ulb_id) {
        return res.status(400).json({ success: false, message: 'Ward not found or does not belong to worker ULB' });
      }
      if (userRole === 'SFI') {
        const sfiWardIds = await getEffectiveWardIdsForRequest(req);
        if (Array.isArray(sfiWardIds) && sfiWardIds.length > 0 && !sfiWardIds.includes(parseInt(ward_id, 10))) {
          return res.status(403).json({ success: false, message: 'You can only assign workers to your assigned wards.' });
        }
      }
      updateData.ward_id = parseInt(ward_id);
    }
    if (supervisor_id !== undefined) {
      const sup = await AdminManagement.findByPk(supervisor_id, { attributes: ['id', 'ulb_id', 'role'] });
      const supRole = sup?.role ? sup.role.toUpperCase().replace(/-/g, '_') : null;
      if (!sup || supRole !== 'SUPERVISOR' || sup.ulb_id !== worker.ulb_id) {
        return res.status(400).json({ success: false, message: 'Invalid supervisor or not in same ULB' });
      }
      updateData.supervisor_id = parseInt(supervisor_id);
    }
    if (contractor_id !== undefined) {
      if (contractor_id === null || contractor_id === '') {
        updateData.contractor_id = null;
      } else {
        const c = await AdminManagement.findByPk(contractor_id, { attributes: ['id', 'ulb_id', 'role'] });
        const cRole = c?.role ? c.role.toUpperCase().replace(/-/g, '_') : null;
        if (!c || cRole !== 'CONTRACTOR' || c.ulb_id !== worker.ulb_id) {
          return res.status(400).json({ success: false, message: 'Invalid contractor or not in same ULB' });
        }
        updateData.contractor_id = parseInt(contractor_id);
      }
    }
    if (status !== undefined) {
      const normalized = status.toUpperCase();
      if (!['ACTIVE', 'INACTIVE'].includes(normalized)) {
        return res.status(400).json({ success: false, message: 'status must be ACTIVE or INACTIVE' });
      }
      updateData.status = normalized;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    await worker.update(updateData);

    res.json({
      success: true,
      message: 'Worker updated successfully',
      worker: {
        id: worker.id,
        employee_code: worker.employee_code,
        full_name: worker.full_name,
        ward_id: worker.ward_id,
        supervisor_id: worker.supervisor_id,
        status: worker.status
      }
    });
  } catch (error) {
    console.error('updateWorker error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update worker',
      error: error.message
    });
  }
};

/**
 * Get workers for a specific supervisor
 * GET /api/workers/supervisor/:supervisorId
 */
export const getWorkersBySupervisor = async (req, res) => {
  try {
    const { supervisorId } = req.params;
    const workers = await Worker.findAll({
      where: {
        supervisor_id: supervisorId,
        status: 'ACTIVE'
      },
      attributes: ['id', 'full_name', 'employee_code'],
      order: [['full_name', 'ASC']]
    });

    res.json({
      success: true,
      data: { workers }
    });
  } catch (error) {
    console.error('getWorkersBySupervisor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workers',
      error: error.message
    });
  }
};
