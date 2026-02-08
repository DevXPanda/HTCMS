import { AdminManagement } from '../models/AdminManagement.js';
import { CollectorAttendance } from '../models/index.js';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { parseDeviceInfo } from '../utils/deviceParser.js';

/**
 * Employee Logout
 * Captures attendance for collectors (automatic punch out)
 */
export const employeeLogout = async (req, res) => {
  try {
    const employee = req.user;

    // Capture attendance for all staff roles (automatic punch out)
    if (employee.role === 'collector' || employee.role === 'clerk' || employee.role === 'inspector' || employee.role === 'officer') {
      try {
        // Find active attendance session (no logout)
        const activeAttendance = await CollectorAttendance.findOne({
          where: {
            collectorId: employee.id,
            logoutAt: null
          },
          order: [['loginAt', 'DESC']]
        });

        if (activeAttendance) {
          // Update attendance with logout time
          await activeAttendance.update({
            logoutAt: new Date()
            // workingDurationMinutes is calculated automatically in the model hook
          });

          // Create audit log for attendance punch out (optional)
          try {
            // Note: You can add audit logging here if needed
          } catch (auditError) {
            console.error('Failed to create audit log for attendance punch out:', auditError);
            // Logout and attendance update are still successful
          }
        } else {
          console.warn(`${employee.role} ${employee.id} logged out but no active attendance session found`);
        }
      } catch (attendanceError) {
        console.error('Failed to capture attendance on logout:', attendanceError);
        // Don't fail logout if attendance capture fails
      }
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Employee logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};
export const employeeLogin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { identifier, password } = req.body;

    // Detect identifier type
    let identifierType;
    if (identifier.includes('@')) {
      identifierType = 'email';
    } else if (/^\d+$/.test(identifier)) {
      identifierType = 'phone';
    } else {
      identifierType = 'employee_id';
    }

    // Find employee by any identifier (employee_id, email, phone_number, username)
    const employee = await AdminManagement.findByIdentifier(identifier);

    if (!employee) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // Check if employee is active
    if (employee.status !== 'active') {
      return res.status(401).json({
        message: 'Account is inactive. Please contact administrator.'
      });
    }

    // Verify password (hashed comparison)
    const isPasswordValid = await employee.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await employee.update({
      last_login: new Date()
    });

    // Create attendance record for all staff roles on login (clerk, inspector, officer, collector)
    if (employee.role === 'collector' || employee.role === 'clerk' || employee.role === 'inspector' || employee.role === 'officer') {
      try {
        // Parse device information using the real device parser
        const deviceInfo = parseDeviceInfo(req);

        // Get location from request body (if provided by frontend)
        const { latitude, longitude, address } = req.body;

        // Check for existing active session
        const activeSession = await CollectorAttendance.findOne({
          where: {
            collectorId: employee.id,
            logoutAt: null
          },
          order: [['loginAt', 'DESC']]
        });

        // If there's an active session, log it but don't create duplicate
        if (activeSession) {
          console.warn(`${employee.role} ${employee.id} logged in with existing active session. Previous session: ${activeSession.id}`);
        }

        // Create attendance record with real device info and location
        const attendance = await CollectorAttendance.create({
          collectorId: employee.id,
          usertype: 'admin_management', // Staff user
          loginAt: new Date(),
          loginLatitude: latitude || null,
          loginLongitude: longitude || null,
          loginAddress: address || null,
          ipAddress: deviceInfo.ipAddress,
          deviceType: deviceInfo.deviceType,
          browserName: deviceInfo.browserName,
          operatingSystem: deviceInfo.operatingSystem,
          source: deviceInfo.source,
          isAutoMarked: true
        });
      } catch (attendanceError) {
        console.error('Error creating attendance record:', attendanceError);
        // Don't fail the login if attendance creation fails
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: employee.id,
        staff_id: employee.id, // Explicit staff_id field as requested
        employee_id: employee.employee_id, // Include employee_id for reference
        role: employee.role,
        userType: 'admin_management',
        ward_ids: employee.ward_ids // Include assigned wards (clerk: always one)
        // JWT automatically adds iat (issued at) timestamp for uniqueness
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Prepare response
    const employeeData = {
      id: employee.id,
      employee_id: employee.employee_id,
      full_name: employee.full_name,
      role: employee.role,
      email: employee.email,
      phone_number: employee.phone_number,
      ward_ids: employee.ward_ids,
      status: employee.status,
      last_login: employee.last_login,
      password_changed: employee.password_changed
    };

    res.json({
      message: 'Login successful',
      token,
      employee: employeeData
    });

  } catch (error) {
    console.error('Employee login error:', error);
    res.status(500).json({
      message: 'Server error during login',
      error: error.message
    });
  }
};

/**
 * Change Employee Password
 * For employees to change their own password
 */
export const changeEmployeePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const employeeId = req.user.id;

    const employee = await AdminManagement.findByPk(employeeId);

    if (!employee) {
      return res.status(404).json({
        message: 'Employee not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await employee.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        message: 'Current password is incorrect'
      });
    }

    // Update password (will be hashed by model hook)
    await employee.update({
      password: newPassword,
      password_changed: true
    });

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      message: 'Server error during password change',
      error: error.message
    });
  }
};

/**
 * Get Employee Profile
 */
export const getEmployeeProfile = async (req, res) => {
  try {
    const employeeId = req.user.id;

    const employee = await AdminManagement.findByPk(employeeId, {
      attributes: { exclude: ['password'] }
    });

    if (!employee) {
      return res.status(404).json({
        message: 'Employee not found'
      });
    }

    res.json({
      employee: employee
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      message: 'Server error fetching profile',
      error: error.message
    });
  }
};

/**
 * Update Employee Profile
 */
export const updateEmployeeProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const employeeId = req.user.id;
    const { full_name, phone_number, email } = req.body;

    const employee = await AdminManagement.findByPk(employeeId);

    if (!employee) {
      return res.status(404).json({
        message: 'Employee not found'
      });
    }

    // Check if email or phone already exists for another employee
    if ((email && email !== employee.email) || (phone_number && phone_number !== employee.phone_number)) {
      const existingEmployee = await AdminManagement.findOne({
        where: {
          [AdminManagement.sequelize.Sequelize.Op.or]: [
            { email: email || null },
            { phone_number: phone_number || null }
          ],
          id: { [AdminManagement.sequelize.Sequelize.Op.ne]: employeeId }
        }
      });

      if (existingEmployee) {
        return res.status(400).json({
          message: 'Email or phone number already exists'
        });
      }
    }

    // Update employee
    await employee.update({
      full_name: full_name || employee.full_name,
      phone_number: phone_number || employee.phone_number,
      email: email || employee.email
    });

    const updatedEmployee = await AdminManagement.findByPk(employeeId, {
      attributes: { exclude: ['password'] }
    });

    res.json({
      message: 'Profile updated successfully',
      employee: updatedEmployee
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      message: 'Server error updating profile',
      error: error.message
    });
  }
};

/**
 * Refresh Employee Token
 */
export const refreshEmployeeToken = async (req, res) => {
  try {
    const employeeId = req.user.id;

    const employee = await AdminManagement.findByPk(employeeId, {
      attributes: ['id', 'employee_id', 'role', 'status']
    });

    if (!employee) {
      return res.status(404).json({
        message: 'Employee not found'
      });
    }

    // Check if employee is still active
    if (employee.status !== 'active') {
      return res.status(401).json({
        message: 'Account is inactive'
      });
    }

    // Generate new token
    const token = jwt.sign(
      {
        userId: employee.id,
        staff_id: employee.id, // Explicit staff_id field as requested
        employee_id: employee.employee_id, // Include employee_id for reference
        role: employee.role,
        userType: 'admin_management',
        ward_ids: employee.ward_ids // Include assigned wards (clerk: always one)
        // JWT automatically adds iat (issued at) timestamp for uniqueness
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Token refreshed successfully',
      token
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      message: 'Server error refreshing token',
      error: error.message
    });
  }
};
