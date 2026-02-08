import { AdminManagement, User, Ward } from '../models/index.js';
import { validationResult } from 'express-validator';

/**
 * Get all employees managed by admin
 */
export const getAllEmployees = async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause - Only show staff roles
    const staffRoles = ['clerk', 'inspector', 'officer', 'collector'];
    const whereClause = {
      role: {
        [AdminManagement.sequelize.Sequelize.Op.in]: staffRoles
      }
    };

    if (role) {
      // Only allow filtering by staff roles
      if (staffRoles.includes(role)) {
        whereClause.role = role;
      } else {
        return res.status(400).json({ message: 'Invalid staff role specified' });
      }
    }
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

    // Format response with ward names
    const formattedEmployees = employees.rows.map(employee => {
      const empData = employee.get({ plain: true });
      return {
        ...empData,
        ward_names: empData.ward_ids ? empData.ward_ids.map(wardId => wardMap[wardId] || `Ward ${wardId}`) : [],
        password: undefined // Don't send password in response
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
 * Get employee by ID
 */
export const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await AdminManagement.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Get wards information
    const wards = await Ward.findAll({
      attributes: ['id', 'wardNumber', 'wardName'],
      where: {
        id: employee.ward_ids || []
      }
    });

    const employeeData = employee.get({ plain: true });
    employeeData.ward_names = wards.map(ward => `${ward.wardNumber} - ${ward.wardName}`);
    employeeData.password = undefined; // Don't send password

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
      role,
      phone_number,
      email,
      ward_ids,
      status = 'active'
    } = req.body;

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

    // Validate ward IDs
    if (ward_ids && ward_ids.length > 0) {
      const wards = await Ward.findAll({
        where: { id: ward_ids },
        attributes: ['id']
      });

      if (wards.length !== ward_ids.length) {
        return res.status(400).json({
          message: 'One or more ward IDs are invalid'
        });
      }
    }

    // For clerk, assign only one ward and update Ward.clerkId
    let assignedWardIds = ward_ids || [];
    if (role === 'clerk') {
      assignedWardIds = [ward_ids[0]];
      // Remove this clerk from any other wards
      await Ward.update({ clerkId: null }, { where: { clerkId: { [AdminManagement.sequelize.Sequelize.Op.eq]: null } } });
      // Assign clerkId to the selected ward
      await Ward.update({ clerkId: null }, { where: { clerkId: employee_id } }); // Remove from previous assignments
      await Ward.update({ clerkId: null }, { where: { clerkId: { [AdminManagement.sequelize.Sequelize.Op.eq]: null } } });
    }
    // Create employee
    const employee = await AdminManagement.create({
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
      password_changed: true // Admin-set password is final, no forced change required
    });
    if (role === 'clerk') {
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

    // Ensure this is a staff role (additional safety check)
    const staffRoles = ['clerk', 'inspector', 'officer', 'collector'];
    if (!staffRoles.includes(employee.role)) {
      return res.status(400).json({
        message: 'Cannot edit non-staff roles through Staff Management. Use Citizen Management for citizen accounts.'
      });
    }

    const {
      full_name,
      role,
      phone_number,
      email,
      ward_ids,
      status,
      password
    } = req.body;

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

    // Validate new role if provided
    if (role && !staffRoles.includes(role)) {
      return res.status(400).json({
        message: 'Invalid role. Only staff roles (clerk, inspector, officer, collector) are allowed.'
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

    // Validate ward IDs
    if (ward_ids && ward_ids.length > 0) {
      const wards = await Ward.findAll({
        where: { id: ward_ids },
        attributes: ['id']
      });

      if (wards.length !== ward_ids.length) {
        return res.status(400).json({
          message: 'One or more ward IDs are invalid'
        });
      }
    }

    // For clerk, assign only one ward and update Ward.clerkId
    let assignedWardIds = ward_ids || [];
    if ((role || employee.role) === 'clerk' && assignedWardIds.length > 0) {
      assignedWardIds = [ward_ids[0]];
      // Remove this clerk from any previously assigned wards
      await Ward.update({ clerkId: null }, { where: { clerkId: employee.id } });
      // Assign clerkId to the selected ward
      await Ward.update({ clerkId: employee.id }, { where: { id: assignedWardIds[0] } });
    }
    // Update employee
    const updateData = {
      full_name,
      role,
      phone_number,
      email,
      ward_ids: assignedWardIds,
      status
    };

    // Only update password if provided
    if (password && password.trim() !== '') {
      updateData.password = password;
      updateData.password_changed = true; // Admin-set password is final, no forced change required
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

    // Ensure this is a staff role (additional safety check)
    const staffRoles = ['clerk', 'inspector', 'officer', 'collector'];
    if (!staffRoles.includes(employee.role)) {
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
    const wards = await Ward.findAll({
      attributes: ['id', 'wardNumber', 'wardName'],
      order: [['wardNumber', 'ASC']]
    });

    res.json(wards);
  } catch (error) {
    console.error('Error fetching wards:', error);
    res.status(500).json({ message: 'Error fetching wards', error: error.message });
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
    // Only count staff roles
    const staffRoles = ['clerk', 'inspector', 'officer', 'collector'];

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
