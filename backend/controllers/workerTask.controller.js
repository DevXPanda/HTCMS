import { Op } from 'sequelize';
import { WorkerTask, Worker, AdminManagement, Ward, ULB } from '../models/index.js';

/**
 * Create a new task assignment (SUPERVISOR only)
 * POST /api/worker-tasks
 */
export const createTask = async (req, res) => {
  try {
    const supervisorId = req.user.id;
    const supervisor = await AdminManagement.findByPk(supervisorId, {
      attributes: ['id', 'ward_id', 'ulb_id', 'role']
    });

    // Normalize role to uppercase for comparison
    const normalizedRole = supervisor?.role ? supervisor.role.toUpperCase().replace(/-/g, '_') : null;
    if (!supervisor || normalizedRole !== 'SUPERVISOR') {
      return res.status(403).json({ success: false, message: 'Access denied. SUPERVISOR role required.' });
    }

    if (!supervisor.ulb_id) {
      return res.status(400).json({ success: false, message: 'Supervisor must be assigned to an ULB' });
    }

    const { worker_id, task_type, area_street, shift, special_instructions } = req.body;

    if (!worker_id || !task_type || !area_street || !shift) {
      return res.status(400).json({ success: false, message: 'worker_id, task_type, area_street, and shift are required' });
    }

    // Validate worker belongs to this supervisor and same ULB
    const worker = await Worker.findByPk(worker_id, {
      attributes: ['id', 'supervisor_id', 'ward_id', 'ulb_id', 'status']
    });

    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    if (worker.supervisor_id !== supervisorId) {
      return res.status(403).json({ success: false, message: 'Worker does not belong to you' });
    }

    if (worker.ulb_id !== supervisor.ulb_id) {
      return res.status(403).json({ success: false, message: 'Worker does not belong to the same ULB' });
    }

    if (worker.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Worker is not active' });
    }

    // Validate ward matches supervisor's ward
    if (worker.ward_id !== supervisor.ward_id) {
      return res.status(403).json({ success: false, message: 'Worker does not belong to your assigned ward' });
    }

    const task = await WorkerTask.create({
      worker_id,
      supervisor_id: supervisorId,
      ward_id: supervisor.ward_id,
      ulb_id: supervisor.ulb_id,
      task_type: task_type.toUpperCase(),
      area_street,
      shift: shift.toUpperCase(),
      special_instructions: special_instructions || null,
      status: 'ASSIGNED',
      assigned_date: new Date().toISOString().slice(0, 10)
    });

    res.status(201).json({
      success: true,
      message: 'Task assigned successfully',
      data: task
    });
  } catch (error) {
    console.error('createTask error:', error);
    res.status(500).json({ success: false, message: 'Failed to create task', error: error.message });
  }
};

/**
 * Get tasks for supervisor's workers (SUPERVISOR only)
 * GET /api/worker-tasks?status=ASSIGNED&worker_id=xxx
 */
export const getTasks = async (req, res) => {
  try {
    const supervisorId = req.user.id;
    const supervisor = await AdminManagement.findByPk(supervisorId, {
      attributes: ['id', 'ward_id', 'ulb_id', 'role']
    });

    // Normalize role to uppercase for comparison
    const normalizedRole = supervisor?.role ? supervisor.role.toUpperCase().replace(/-/g, '_') : null;
    if (!supervisor || normalizedRole !== 'SUPERVISOR') {
      return res.status(403).json({ success: false, message: 'Access denied. SUPERVISOR role required.' });
    }

    const { status, worker_id, assigned_date } = req.query;

    const where = {
      supervisor_id: supervisorId,
      ulb_id: supervisor.ulb_id
    };

    if (status) {
      where.status = status.toUpperCase();
    }

    if (worker_id) {
      where.worker_id = worker_id;
    }

    if (assigned_date) {
      where.assigned_date = assigned_date;
    }

    const tasks = await WorkerTask.findAll({
      where,
      include: [
        {
          model: Worker,
          as: 'worker',
          attributes: ['id', 'full_name', 'mobile']
        }
      ],
      order: [['assigned_date', 'DESC'], ['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('getTasks error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tasks', error: error.message });
  }
};

/**
 * Update task status or upload work proof (SUPERVISOR only)
 * PUT /api/worker-tasks/:id
 */
export const updateTask = async (req, res) => {
  try {
    const supervisorId = req.user.id;
    const supervisor = await AdminManagement.findByPk(supervisorId, {
      attributes: ['id', 'ward_id', 'ulb_id', 'role']
    });

    // Normalize role to uppercase for comparison
    const normalizedRole = supervisor?.role ? supervisor.role.toUpperCase().replace(/-/g, '_') : null;
    if (!supervisor || normalizedRole !== 'SUPERVISOR') {
      return res.status(403).json({ success: false, message: 'Access denied. SUPERVISOR role required.' });
    }

    const taskId = req.params.id;
    const task = await WorkerTask.findByPk(taskId);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Ensure task belongs to this supervisor
    if (task.supervisor_id !== supervisorId || task.ulb_id !== supervisor.ulb_id) {
      return res.status(403).json({ success: false, message: 'Access denied. Task does not belong to you.' });
    }

    const { 
      status, 
      before_photo_url, 
      after_photo_url, 
      before_photo_latitude,
      before_photo_longitude,
      before_photo_address,
      after_photo_latitude,
      after_photo_longitude,
      after_photo_address,
      work_proof_remarks, 
      escalation_flag, 
      escalation_reason 
    } = req.body;

    const updates = {};
    if (status) {
      updates.status = status.toUpperCase();
      if (status.toUpperCase() === 'COMPLETED') {
        updates.completed_at = new Date();
      }
    }
    if (before_photo_url !== undefined) updates.before_photo_url = before_photo_url;
    if (after_photo_url !== undefined) updates.after_photo_url = after_photo_url;
    if (before_photo_latitude !== undefined) updates.before_photo_latitude = before_photo_latitude;
    if (before_photo_longitude !== undefined) updates.before_photo_longitude = before_photo_longitude;
    if (before_photo_address !== undefined) updates.before_photo_address = before_photo_address;
    if (after_photo_latitude !== undefined) updates.after_photo_latitude = after_photo_latitude;
    if (after_photo_longitude !== undefined) updates.after_photo_longitude = after_photo_longitude;
    if (after_photo_address !== undefined) updates.after_photo_address = after_photo_address;
    if (work_proof_remarks !== undefined) updates.work_proof_remarks = work_proof_remarks;
    if (escalation_flag !== undefined) updates.escalation_flag = escalation_flag;
    if (escalation_reason !== undefined) updates.escalation_reason = escalation_reason;

    await task.update(updates);

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: task
    });
  } catch (error) {
    console.error('updateTask error:', error);
    res.status(500).json({ success: false, message: 'Failed to update task', error: error.message });
  }
};
