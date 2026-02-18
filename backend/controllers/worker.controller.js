import { Op } from 'sequelize';
import { Worker, Ward, AdminManagement, ULB, WorkerTask } from '../models/index.js';
import { sequelize } from '../config/database.js';

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

    // Check role access - Only ADMIN and EO can create workers
    if (userRole === 'SUPERVISOR') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. SUPERVISOR role cannot create workers.'
      });
    }

    if (userRole !== 'ADMIN' && userRole !== 'EO') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only ADMIN and EO roles can create workers.'
      });
    }

    const {
      full_name,
      mobile,
      worker_type,
      ward_id,
      supervisor_id,
      contractor_id,
      status = 'ACTIVE'
    } = req.body;

    // Validation
    if (!full_name || !mobile || !ward_id || !supervisor_id || !worker_type) {
      return res.status(400).json({
        success: false,
        message: 'full_name, mobile, ward_id, supervisor_id, and worker_type are required'
      });
    }

    // Validate worker_type
    const normalizedWorkerType = worker_type.toUpperCase();
    if (!['ULB', 'CONTRACTUAL'].includes(normalizedWorkerType)) {
      return res.status(400).json({
        success: false,
        message: 'worker_type must be either ULB or CONTRACTUAL'
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

    // Validate supervisor exists and belongs to same ULB
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

    // Validate supervisor belongs to same ULB
    if (supervisor.ulb_id !== ulbId) {
      return res.status(403).json({
        success: false,
        message: 'Supervisor does not belong to the same ULB'
      });
    }

    // Validate supervisor belongs to same ward (if specified)
    if (supervisor.ward_id && supervisor.ward_id !== parseInt(ward_id)) {
      return res.status(403).json({
        success: false,
        message: 'Supervisor does not belong to the selected ward'
      });
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
      ulb_id: ulbId,
      ward_id: parseInt(ward_id),
      eo_id: eoId,
      supervisor_id: parseInt(supervisor_id),
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

    // Check role access - Only ADMIN and EO can view workers
    if (userRole !== 'ADMIN' && userRole !== 'EO') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only ADMIN and EO roles can view workers.'
      });
    }

    let whereClause = {};

    // EO: Only show workers from their ULB
    if (userRole === 'EO') {
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
        whereClause.eo_id = parseInt(eo_id);
      }
      
      if (ward_id) {
        whereClause.ward_id = parseInt(ward_id);
      }
      
      if (status) {
        whereClause.status = status.toUpperCase();
      }
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

    // Group tasks by worker_id
    const tasksByWorker = {};
    tasksWithProofs.forEach(task => {
      const taskData = task.get({ plain: true });
      const workerId = taskData.worker_id;
      if (!tasksByWorker[workerId]) {
        tasksByWorker[workerId] = [];
      }
      tasksByWorker[workerId].push({
        id: taskData.id,
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

    // Attach tasks/proofs to workers
    const workersWithProofs = workers.map(worker => {
      const workerData = worker.get({ plain: true });
      workerData.proofs = tasksByWorker[worker.id] || [];
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
    console.error('getAllWorkers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workers',
      error: error.message
    });
  }
};
