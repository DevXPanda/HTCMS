import { AdminManagement, User, Ward, ULB } from '../models/index.js';
import { validationResult } from 'express-validator';

/**
 * Get all employees managed by admin
 */
export const getAllEmployees = async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause - Only show staff roles (including field worker hierarchy)
    // Normalize role to uppercase for comparison, support multiple comma-separated roles
    const staffRoles = ['CLERK', 'INSPECTOR', 'OFFICER', 'COLLECTOR', 'EO', 'SUPERVISOR', 'FIELD_WORKER', 'CONTRACTOR'];
    let requestedRoles = [];
    if (role) {
      requestedRoles = role.toUpperCase().split(',').map(r => r.trim().replace(/-/g, '_'));
      // Filter out non-staff roles
      requestedRoles = requestedRoles.filter(r => staffRoles.includes(r));
    }

    const whereClause = {
      role: {
        [AdminManagement.sequelize.Sequelize.Op.in]: requestedRoles.length > 0 ? requestedRoles : staffRoles
      }
    };
    if (status) whereClause.status = status;

    // Add search functionality
    if (search) {
      whereClause[AdminManagement.sequelize.Sequelize.Op.or] = [
        { full_name: { [AdminManagement.sequelize.Sequelize.Op.iLike]: `%${search}%` } },
        { email: { [AdminManagement.sequelize.Sequelize.Op.iLike]: `%${search}%` } },
        { phone_number: { [AdminManagement.sequelize.Sequelize.Op.iLike]: `%${search}%` } },
        { employee_id: { [AdminManagement.sequelize.Sequelize.Op.iLike]: `%${search}%` } }
      ];
    }

    const employees = await AdminManagement.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    // Get wards information for ward names
    const wards = await Ward.findAll({
      attributes: ['id', 'wardNumber', 'wardName']
    });

    const wardMap = {};
    wards.forEach(ward => {
      wardMap[ward.id] = `${ward.wardNumber} - ${ward.wardName}`;
    });

    const formattedEmployees = employees.rows.map(employee => {
      const empData = employee.get({ plain: true });
      let ward_names = empData.ward_ids ? empData.ward_ids.map(wardId => wardMap[wardId] || `Ward ${wardId}`) : [];
      if (ward_names.length === 0 && empData.ward_id && wardMap[empData.ward_id]) {
        ward_names = [wardMap[empData.ward_id]];
      }
      return {
        ...empData,
        ward_names,
        password: undefined
      };
    });

    res.json({
      employees: formattedEmployees,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(employees.count / limit),
        totalEmployees: employees.count,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ message: 'Error fetching employees', error: error.message });
  }
};

/**
 * Get employees by ULB (for EO access)
 * Allows EO to fetch supervisors and contractors within their ULB
 */
export const getEmployeesByUlb = async (req, res) => {
  try {
    const { role, ulb_id } = req.query;
    const userUlbId = req.user?.ulb_id;

    // Validate ULB access - EO can only access their own ULB
    if (!userUlbId) {
      return res.status(403).json({ message: 'ULB ID not found in user token' });
    }

    // If ulb_id is provided in query, validate it matches user's ULB
    if (ulb_id && ulb_id !== userUlbId) {
      return res.status(403).json({ message: 'Access denied: Cannot access other ULB data' });
    }

    // Normalize role to uppercase
    const normalizedRole = role ? role.toUpperCase().replace(/-/g, '_') : role;

    // Only allow fetching SUPERVISOR and CONTRACTOR roles for EO
    const allowedRoles = ['SUPERVISOR', 'CONTRACTOR'];
    if (normalizedRole && !allowedRoles.includes(normalizedRole)) {
      return res.status(400).json({
        message: `Invalid role. Only ${allowedRoles.join(' or ')} can be fetched by EO`
      });
    }

    const whereClause = {
      ulb_id: userUlbId,
      status: 'active' // Only return active employees
    };

    if (normalizedRole) {
      whereClause.role = normalizedRole;
    } else {
      // If no role specified, return both SUPERVISOR and CONTRACTOR
      whereClause.role = {
        [AdminManagement.sequelize.Sequelize.Op.in]: allowedRoles
      };
    }

    const employees = await AdminManagement.findAll({
      where: whereClause,
      attributes: ['id', 'employee_id', 'full_name', 'role', 'ward_id', 'ulb_id', 'phone_number', 'email'],
      order: [['full_name', 'ASC']]
    });

    res.json({
      success: true,
      employees: employees.map(emp => emp.get({ plain: true }))
    });
  } catch (error) {
    console.error('Error fetching employees by ULB:', error);
    res.status(500).json({ message: 'Error fetching employees', error: error.message });
  }
};

/**
 * Get employee by ID
 */
export const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await AdminManagement.findByPk(id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'], required: false },
        { model: AdminManagement, as: 'eo', attributes: ['id', 'employee_id', 'full_name'], required: false },
        { model: AdminManagement, as: 'supervisor', attributes: ['id', 'employee_id', 'full_name'], required: false },
        { model: AdminManagement, as: 'contractor', attributes: ['id', 'employee_id', 'full_name', 'company_name'], required: false }
      ]
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const wards = await Ward.findAll({
      attributes: ['id', 'wardNumber', 'wardName'],
      where: { id: employee.ward_ids || [] }
    });

    const employeeData = employee.get({ plain: true });
    employeeData.ward_names = wards.map(ward => `${ward.wardNumber} - ${ward.wardName}`);
    employeeData.password = undefined;
    res.json(employeeData);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ message: 'Error fetching employee', error: error.message });
  }
};

/**
 * Create new employee
 */
export const createEmployee = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      full_name,
      role: rawRole,
      phone_number,
      email,
      ward_ids,
      status = 'active',
      assigned_ulb,
      ulb_id,
      ward_id,
      eo_id,
      contractor_id,
      worker_type,
      supervisor_id,
      company_name,
      contact_details
    } = req.body;

    // Normalize role to uppercase to match database CHECK constraint
    const role = rawRole ? rawRole.toUpperCase().replace(/-/g, '_') : rawRole;

    // Check if email, phone, or username already exists
    const existingEmployee = await AdminManagement.findOne({
      where: {
        [AdminManagement.sequelize.Sequelize.Op.or]: [
          { email },
          { phone_number }
        ]
      }
    });

    if (existingEmployee) {
      return res.status(400).json({
        message: 'Employee with this email or phone number already exists'
      });
    }

    // Generate employee ID and password
    const employee_id = await AdminManagement.generateEmployeeId(role);
    const password = AdminManagement.generatePassword();
    const username = employee_id; // Username same as employee_id

    // Determine ulb_id based on role and provided data
    let finalUlbId = ulb_id;

    // For supervisor/field_worker, get ulb_id from ward if not provided
    if ((role === 'SUPERVISOR' || role === 'FIELD_WORKER') && ward_id && !finalUlbId) {
      const ward = await Ward.findByPk(ward_id, { attributes: ['id', 'ulb_id'] });
      if (ward && ward.ulb_id) {
        finalUlbId = ward.ulb_id;
      }
    }

    // For EO, ulb_id is mandatory (already validated in middleware)
    // Validate that wards belong to the selected ULB
    if (ward_ids && ward_ids.length > 0 && finalUlbId && role === 'EO') {
      const wards = await Ward.findAll({
        where: { id: ward_ids },
        attributes: ['id', 'ulb_id']
      });

      if (wards.length !== ward_ids.length) {
        return res.status(400).json({
          message: 'One or more ward IDs are invalid'
        });
      }

      // Check that all wards belong to the selected ULB
      const invalidWards = wards.filter(w => w.ulb_id !== finalUlbId);
      if (invalidWards.length > 0) {
        return res.status(400).json({
          message: `Selected wards do not belong to the selected ULB`
        });
      }
    }

    // Validate ward_id belongs to ULB if both are provided
    if (ward_id && finalUlbId) {
      const ward = await Ward.findByPk(ward_id, { attributes: ['id', 'ulb_id'] });
      if (ward && ward.ulb_id !== finalUlbId) {
        return res.status(400).json({
          message: 'Selected ward does not belong to the selected ULB'
        });
      }
    }

    // Validate EO belongs to ULB if both are provided
    if (eo_id && finalUlbId) {
      const eo = await AdminManagement.findByPk(eo_id, { attributes: ['id', 'ulb_id', 'role'] });
      const normalizedEoRole = eo?.role ? eo.role.toUpperCase().replace(/-/g, '_') : eo?.role;
      if (!eo || normalizedEoRole !== 'EO') {
        return res.status(400).json({ message: 'Invalid EO ID' });
      }
      if (eo.ulb_id !== finalUlbId) {
        return res.status(400).json({
          message: 'Selected EO does not belong to the selected ULB'
        });
      }
    }

    // For clerk, assign only one ward and update Ward.clerkId
    let assignedWardIds = ward_ids || [];
    if (role === 'CLERK') {
      assignedWardIds = Array.isArray(ward_ids) && ward_ids.length > 0 ? [ward_ids[0]] : [];
      if (assignedWardIds.length > 0) {
        await Ward.update({ clerkId: null }, { where: { id: assignedWardIds[0] } });
      }
    }
    const createPayload = {
      full_name,
      employee_id,
      role,
      phone_number,
      email,
      username,
      password,
      ward_ids: assignedWardIds,
      status,
      created_by_admin_id: req.user.id,
      password_changed: true
    };
    // Don't set assigned_ulb anymore - use ulb_id instead
    if (finalUlbId !== undefined && finalUlbId !== null) {
      createPayload.ulb_id = finalUlbId;
    }
    if (ward_id !== undefined) createPayload.ward_id = ward_id ? parseInt(ward_id) : null;
    if (eo_id !== undefined) createPayload.eo_id = eo_id ? parseInt(eo_id) : null;
    if (contractor_id !== undefined) createPayload.contractor_id = contractor_id ? parseInt(contractor_id) : null;
    if (worker_type !== undefined) createPayload.worker_type = worker_type || null;
    if (supervisor_id !== undefined) createPayload.supervisor_id = supervisor_id ? parseInt(supervisor_id) : null;
    if (company_name !== undefined) createPayload.company_name = company_name || null;
    if (contact_details !== undefined) createPayload.contact_details = contact_details || null;
    const employee = await AdminManagement.create(createPayload);
    if (role === 'CLERK' && assignedWardIds.length > 0) {
      await Ward.update({ clerkId: employee.id }, { where: { id: assignedWardIds[0] } });
    }

    // Log the creation
    console.log(`Employee created by admin ${req.user.id}:`, {
      employee_id: employee.employee_id,
      role: employee.role,
      email: employee.email
    });

    // Return employee data with generated credentials (show password only once)
    const employeeData = employee.get({ plain: true });

    res.status(201).json({
      message: 'Employee created successfully',
      employee: {
        ...employeeData,
        password: password, // Show password only once
        password_note: 'Please save this password securely. It will not be shown again.'
      }
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ message: 'Error creating employee', error: error.message });
  }
};

/**
 * Update employee
 */
export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const employee = await AdminManagement.findByPk(id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const normalizedStaffRoles = ['CLERK', 'INSPECTOR', 'OFFICER', 'COLLECTOR', 'EO', 'SUPERVISOR', 'FIELD_WORKER', 'CONTRACTOR'];
    const normalizedEmployeeRole = employee.role ? employee.role.toUpperCase().replace(/-/g, '_') : employee.role;
    if (!normalizedStaffRoles.includes(normalizedEmployeeRole)) {
      return res.status(400).json({
        message: 'Cannot edit non-staff roles through Staff Management. Use Citizen Management for citizen accounts.'
      });
    }

    const {
      full_name,
      role: rawRole,
      phone_number,
      email,
      ward_ids,
      status,
      password,
      assigned_ulb,
      ulb_id,
      ward_id,
      eo_id,
      contractor_id,
      worker_type,
      supervisor_id,
      company_name,
      contact_details
    } = req.body;

    // Normalize role to uppercase to match database CHECK constraint
    const role = rawRole ? rawRole.toUpperCase().replace(/-/g, '_') : rawRole;

    console.log('🔍 Debug - Update employee request data:', {
      full_name,
      role,
      phone_number,
      email,
      ward_ids,
      status,
      password: password ? '***' : 'EMPTY',
      passwordLength: password ? password.length : 0
    });

    if (role && !normalizedStaffRoles.includes(role)) {
      return res.status(400).json({
        message: 'Invalid role. Only staff roles (CLERK, INSPECTOR, OFFICER, COLLECTOR, EO, SUPERVISOR, FIELD_WORKER, CONTRACTOR) are allowed.'
      });
    }

    // Check if email or phone already exists for another employee
    if (email !== employee.email || phone_number !== employee.phone_number) {
      const existingEmployee = await AdminManagement.findOne({
        where: {
          [AdminManagement.sequelize.Sequelize.Op.or]: [
            { email },
            { phone_number }
          ],
          id: { [AdminManagement.sequelize.Sequelize.Op.ne]: id }
        }
      });

      if (existingEmployee) {
        return res.status(400).json({
          message: 'Employee with this email or phone number already exists'
        });
      }
    }

    // Determine ulb_id based on role
    let finalUlbId = ulb_id;
    const currentRole = role || normalizedEmployeeRole;

    // For SUPERVISOR and FIELD_WORKER, auto-select ULB from ward
    if ((currentRole === 'SUPERVISOR' || currentRole === 'FIELD_WORKER') && ward_id) {
      const ward = await Ward.findByPk(ward_id, { attributes: ['id', 'ulb_id'] });
      if (!ward) {
        return res.status(400).json({ message: 'Invalid ward ID' });
      }
      if (!ward.ulb_id) {
        return res.status(400).json({ message: 'Ward does not belong to any ULB' });
      }
      finalUlbId = ward.ulb_id;
    }

    // For EO, ulb_id is mandatory
    if (currentRole === 'EO' && !finalUlbId && !employee.ulb_id) {
      return res.status(400).json({ message: 'ULB is required for EO role' });
    }

    // Use existing ulb_id if not provided
    if (!finalUlbId && employee.ulb_id) {
      finalUlbId = employee.ulb_id;
    }

    // Validate ward IDs and check they belong to selected ULB
    if (ward_ids && ward_ids.length > 0) {
      const wards = await Ward.findAll({
        where: { id: ward_ids },
        attributes: ['id', 'ulb_id']
      });

      if (wards.length !== ward_ids.length) {
        return res.status(400).json({
          message: 'One or more ward IDs are invalid'
        });
      }

      // If ULB is specified, validate all wards belong to it
      if (finalUlbId && currentRole === 'EO') {
        const invalidWards = wards.filter(w => w.ulb_id !== finalUlbId);
        if (invalidWards.length > 0) {
          return res.status(400).json({
            message: 'All selected wards must belong to the selected ULB'
          });
        }
      }
    }

    // Validate ward_id belongs to ULB (for supervisor/field_worker)
    if (ward_id && finalUlbId) {
      const ward = await Ward.findByPk(ward_id, { attributes: ['id', 'ulb_id'] });
      if (ward && ward.ulb_id !== finalUlbId) {
        return res.status(400).json({
          message: 'Selected ward does not belong to the selected ULB'
        });
      }
    }

    // Validate EO belongs to selected ULB
    if (eo_id && finalUlbId) {
      const eo = await AdminManagement.findByPk(eo_id, { attributes: ['id', 'ulb_id', 'role'] });
      const normalizedEoRole = eo?.role ? eo.role.toUpperCase().replace(/-/g, '_') : eo?.role;
      if (!eo || normalizedEoRole !== 'EO') {
        return res.status(400).json({ message: 'Invalid EO ID' });
      }
      if (eo.ulb_id !== finalUlbId) {
        return res.status(400).json({
          message: 'Selected EO does not belong to the selected ULB'
        });
      }
    }

    // For clerk, assign only one ward and update Ward.clerkId
    let assignedWardIds = ward_ids || [];
    if (currentRole === 'CLERK' && assignedWardIds.length > 0) {
      assignedWardIds = [ward_ids[0]];
      // Remove this clerk from any previously assigned wards
      await Ward.update({ clerkId: null }, { where: { clerkId: employee.id } });
      // Assign clerkId to the selected ward
      await Ward.update({ clerkId: employee.id }, { where: { id: assignedWardIds[0] } });
    }
    const updateData = {
      full_name,
      role,
      phone_number,
      email,
      ward_ids: assignedWardIds,
      status
    };
    if (assigned_ulb !== undefined) updateData.assigned_ulb = assigned_ulb || null;
    if (finalUlbId !== undefined) updateData.ulb_id = finalUlbId || null;
    if (ward_id !== undefined) updateData.ward_id = ward_id ? parseInt(ward_id) : null;
    if (eo_id !== undefined) updateData.eo_id = eo_id ? parseInt(eo_id) : null;
    if (contractor_id !== undefined) updateData.contractor_id = contractor_id ? parseInt(contractor_id) : null;
    if (worker_type !== undefined) updateData.worker_type = worker_type || null;
    if (supervisor_id !== undefined) updateData.supervisor_id = supervisor_id ? parseInt(supervisor_id) : null;
    if (company_name !== undefined) updateData.company_name = company_name || null;
    if (contact_details !== undefined) updateData.contact_details = contact_details || null;
    if (password && password.trim() !== '') {
      updateData.password = password;
      updateData.password_changed = true;
    }
    await employee.update(updateData);

    // Log the update
    console.log(`Employee updated by admin ${req.user.id}:`, {
      employee_id: employee.employee_id,
      changes: { full_name, role, phone_number, email, ward_ids, status, password_changed: !!password }
    });

    const updatedEmployee = await AdminManagement.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    const employeeData = updatedEmployee.get({ plain: true });
    employeeData.password = undefined; // Don't send password

    res.json({
      message: 'Employee updated successfully',
      employee: employeeData
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ message: 'Error updating employee', error: error.message });
  }
};

/**
 * Delete employee
 */
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await AdminManagement.findByPk(id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Normalize role to uppercase for comparison
    const normalizedEmployeeRole = employee.role ? employee.role.toUpperCase().replace(/-/g, '_') : employee.role;
    const staffRoles = ['CLERK', 'INSPECTOR', 'OFFICER', 'COLLECTOR', 'EO', 'SUPERVISOR', 'FIELD_WORKER', 'CONTRACTOR'];
    if (!staffRoles.includes(normalizedEmployeeRole)) {
      return res.status(400).json({
        message: 'Cannot delete non-staff roles through Staff Management. Use Citizen Management for citizen accounts.'
      });
    }

    // Log the deletion
    console.log(`Employee deleted by admin ${req.user.id}:`, {
      employee_id: employee.employee_id,
      role: employee.role,
      email: employee.email
    });

    await employee.destroy();

    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ message: 'Error deleting employee', error: error.message });
  }
};

/**
 * Get available wards for assignment
 */
export const getAvailableWards = async (req, res) => {
  try {
    const { ulb_id } = req.query;
    const whereClause = {};

    if (ulb_id) {
      whereClause.ulb_id = ulb_id;
    }

    const wards = await Ward.findAll({
      where: whereClause,
      attributes: ['id', 'wardNumber', 'wardName', 'ulb_id'],
      order: [['wardNumber', 'ASC']]
    });

    res.json(wards);
  } catch (error) {
    console.error('Error fetching wards:', error);
    res.status(500).json({ message: 'Error fetching wards', error: error.message });
  }
};

/**
 * Get all ULBs
 */
export const getAllULBs = async (req, res) => {
  try {
    const ulbs = await ULB.findAll({
      where: { status: 'ACTIVE' },
      attributes: ['id', 'name', 'state', 'district'],
      order: [['name', 'ASC']]
    });

    res.json(ulbs);
  } catch (error) {
    console.error('Error fetching ULBs:', error);
    res.status(500).json({ message: 'Error fetching ULBs', error: error.message });
  }
};

/**
 * Reset employee password
 */
export const resetEmployeePassword = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await AdminManagement.findByPk(id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Generate new password
    const newPassword = AdminManagement.generatePassword();

    // Update password and reset password_changed flag
    await employee.update({
      password: newPassword,
      password_changed: false
    });

    // Log the password reset
    console.log(`Password reset for employee ${employee.employee_id} by admin ${req.user.id}`);

    res.json({
      message: 'Password reset successfully',
      employee_id: employee.employee_id,
      new_password: newPassword,
      password_note: 'Please save this password securely. It will not be shown again.'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
};

/**
 * Get employee statistics
 */
export const getEmployeeStatistics = async (req, res) => {
  try {
    const staffRoles = ['CLERK', 'INSPECTOR', 'OFFICER', 'COLLECTOR', 'EO', 'SUPERVISOR', 'FIELD_WORKER', 'CONTRACTOR'];

    const stats = await AdminManagement.findAll({
      attributes: [
        'role',
        [AdminManagement.sequelize.Sequelize.fn('COUNT', AdminManagement.sequelize.Sequelize.col('id')), 'count'],
        [AdminManagement.sequelize.Sequelize.fn('COUNT', AdminManagement.sequelize.literal('CASE WHEN status = \'active\' THEN 1 END')), 'active_count'],
        [AdminManagement.sequelize.Sequelize.fn('COUNT', AdminManagement.sequelize.literal('CASE WHEN status = \'inactive\' THEN 1 END')), 'inactive_count']
      ],
      where: {
        role: {
          [AdminManagement.sequelize.Sequelize.Op.in]: staffRoles
        }
      },
      group: ['role']
    });

    const totalEmployees = await AdminManagement.count({
      where: {
        role: {
          [AdminManagement.sequelize.Sequelize.Op.in]: staffRoles
        }
      }
    });
    const activeEmployees = await AdminManagement.count({
      where: {
        status: 'active',
        role: {
          [AdminManagement.sequelize.Sequelize.Op.in]: staffRoles
        }
      }
    });
    const inactiveEmployees = await AdminManagement.count({
      where: {
        status: 'inactive',
        role: {
          [AdminManagement.sequelize.Sequelize.Op.in]: staffRoles
        }
      }
    });

    res.json({
      by_role: stats,
      total: totalEmployees,
      active: activeEmployees,
      inactive: inactiveEmployees
    });
  } catch (error) {
    console.error('Error fetching employee statistics:', error);
    res.status(500).json({ message: 'Error fetching statistics', error: error.message });
  }
};

/**
 * Bulk delete employees
 */
export const bulkDeleteEmployees = async (req, res) => {
  try {
    const { employeeIds } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ message: 'Employee IDs are required' });
    }

    // Verify all employees exist and are staff roles
    const employees = await AdminManagement.findAll({
      where: {
        id: {
          [AdminManagement.sequelize.Sequelize.Op.in]: employeeIds
        },
        role: {
          [AdminManagement.sequelize.Sequelize.Op.in]: ['clerk', 'inspector', 'officer', 'collector']
        }
      }
    });

    if (employees.length !== employeeIds.length) {
      return res.status(400).json({ message: 'Some employees not found or not staff roles' });
    }

    // Delete employees
    const deletedCount = await AdminManagement.destroy({
      where: {
        id: {
          [AdminManagement.sequelize.Sequelize.Op.in]: employeeIds
        }
      }
    });

    console.log(`Bulk deleted ${deletedCount} employees by admin ${req.user.id}`);

    res.json({
      message: `${deletedCount} employee(s) deleted successfully`,
      deletedCount
    });
  } catch (error) {
    console.error('Error bulk deleting employees:', error);
    res.status(500).json({ message: 'Error deleting employees', error: error.message });
  }
};

/**
 * Bulk update employee status
 */
export const bulkUpdateEmployeeStatus = async (req, res) => {
  try {
    const { employeeIds, status } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ message: 'Employee IDs are required' });
    }

    if (!status || !['activate', 'deactivate'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be activate or deactivate' });
    }

    const newStatus = status === 'activate' ? 'active' : 'inactive';

    // Verify all employees exist and are staff roles
    const employees = await AdminManagement.findAll({
      where: {
        id: {
          [AdminManagement.sequelize.Sequelize.Op.in]: employeeIds
        },
        role: {
          [AdminManagement.sequelize.Sequelize.Op.in]: ['clerk', 'inspector', 'officer', 'collector']
        }
      }
    });

    if (employees.length !== employeeIds.length) {
      return res.status(400).json({ message: 'Some employees not found or not staff roles' });
    }

    // Update employee status
    const [updatedCount] = await AdminManagement.update(
      { status: newStatus },
      {
        where: {
          id: {
            [AdminManagement.sequelize.Sequelize.Op.in]: employeeIds
          }
        }
      }
    );

    console.log(`Bulk updated status to ${newStatus} for ${updatedCount} employees by admin ${req.user.id}`);

    res.json({
      message: `${updatedCount} employee(s) ${status}d successfully`,
      updatedCount,
      status: newStatus
    });
  } catch (error) {
    console.error('Error bulk updating employee status:', error);
    res.status(500).json({ message: 'Error updating employee status', error: error.message });
  }
};
