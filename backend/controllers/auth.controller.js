import jwt from 'jsonwebtoken';
import { User, Property } from '../models/index.js';
import { Op } from 'sequelize';
import { auditLogger, createAuditLog } from '../utils/auditLogger.js';
import { parseDeviceInfo } from '../utils/deviceParser.js';

/**
 * Generate JWT Token
 */
const generateToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured. Please set it in your .env file.');
  }
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (Citizen)
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const { username, email, password, firstName, lastName, phone, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { username }]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Validate and normalize role if provided - ONLY allow admin and citizen for self-registration
    let normalizedRole = role;
    if (role) {
      normalizedRole = role.toLowerCase().trim();
      // Map 'tax_collector' to 'collector' for backward compatibility
      if (normalizedRole === 'tax_collector') {
        normalizedRole = 'collector';
      }
      // IMPORTANT: Only allow admin and citizen roles for self-registration
      // Staff roles (clerk, inspector, officer, collector) must be created by admin only
      const allowedSelfRegistrationRoles = ['admin', 'citizen'];
      if (!allowedSelfRegistrationRoles.includes(normalizedRole)) {
        return res.status(400).json({
          success: false,
          message: 'Staff registration is not allowed'
        });
      }
    }

    // Create new user - use role from req.body if provided, otherwise let model default handle it
    const user = await User.create({
      username,
      email,
      password,
      firstName,
      lastName,
      phone,
      role: normalizedRole || undefined // Let model default handle if not provided
    });

    // Generate token
    const token = generateToken(user.id);

    // Sanitized user object with role field
    const sanitizedUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role
    };

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: sanitizedUser,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, phone, password } = req.body;

    // Validate input - accept either email or phone
    const identifier = email || phone;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email or phone number and password'
      });
    }

    // Determine if identifier is email or phone number
    // Simple check: if it contains @, it's an email; otherwise, treat as phone
    const isEmail = identifier.includes('@');

    // Build where clause to search by email or phone
    const whereClause = isEmail
      ? { email: identifier }
      : { phone: identifier };

    // Find user by email or phone - explicitly include role in attributes
    const user = await User.findOne({
      where: whereClause,
      attributes: ['id', 'username', 'email', 'password', 'firstName', 'lastName', 'phone', 'role', 'isActive', 'lastLogin']
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    // Generate token
    const token = generateToken(user.id);

    // Log login action
    await auditLogger.logLogin(req, user);

    // Capture attendance for collectors (automatic punch in)
    if (user.role === 'collector') {
      try {
        // Import CollectorAttendance here to avoid circular dependency
        const { CollectorAttendance } = await import('../models/index.js');

        // Check if there's an active session (no logout)
        const activeSession = await CollectorAttendance.findOne({
          where: {
            collectorId: user.id,
            logoutAt: null
          },
          order: [['loginAt', 'DESC']]
        });

        // If there's an active session, log it but don't create duplicate
        // This handles cases where user didn't logout properly
        if (activeSession) {
          console.warn(`Collector ${user.id} logged in with existing active session. Previous session: ${activeSession.id}`);
        }

        // Parse device information
        const deviceInfo = parseDeviceInfo(req);

        // Get location from request body (if provided by frontend)
        const { latitude, longitude, address } = req.body;

        // Create attendance record
        const attendance = await CollectorAttendance.create({
          collectorId: user.id,
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

        // Create audit log for attendance punch in
        // Wrap in try-catch to ensure attendance creation never fails due to audit log errors
        try {
          await createAuditLog({
            req,
            user,
            actionType: 'LOGIN',
            entityType: 'Attendance',
            entityId: attendance.id,
            description: `Collector punched in`,
            metadata: {
              attendanceId: attendance.id,
              location: latitude && longitude ? { latitude, longitude, address } : null,
              device: deviceInfo.deviceType,
              browser: deviceInfo.browserName,
              os: deviceInfo.operatingSystem,
              ip: deviceInfo.ipAddress,
              source: deviceInfo.source
            }
          });
        } catch (auditError) {
          // Log error but don't fail attendance creation
          console.error('Failed to create audit log for attendance punch in:', auditError);
          // Attendance record is still created successfully
        }
      } catch (attendanceError) {
        // Log error but don't fail login
        console.error('Failed to capture attendance on login:', attendanceError);
      }
    }

    // Sanitized user object with role field
    const sanitizedUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role
    };

    // Return response in format: { token, user: sanitizedUser }
    res.json({
      token,
      user: sanitizedUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged in user
 * @access  Private
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Property,
          as: 'properties',
          attributes: ['id', 'propertyNumber', 'address'],
          required: false
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Ensure role is included in response
    const sanitizedUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      properties: user.properties
    };

    res.json({
      success: true,
      data: { user: sanitizedUser }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and capture attendance (punch out for collectors)
 * @access  Private
 */
export const logout = async (req, res, next) => {
  try {
    const user = req.user;

    // Capture attendance for collectors (automatic punch out)
    if (user.role === 'collector') {
      console.log('🔍 Logout - Collector detected:', user.id, 'Role:', user.role, 'UserType:', user.userType);

      try {
        // Import CollectorAttendance here to avoid circular dependency
        const { CollectorAttendance } = await import('../models/index.js');

        // Find active attendance session (no logout)
        const activeAttendance = await CollectorAttendance.findOne({
          where: {
            collectorId: user.id,
            logoutAt: null
          },
          order: [['loginAt', 'DESC']]
        });

        console.log('🔍 Logout - Active attendance found:', activeAttendance ? 'YES' : 'NO');
        if (activeAttendance) {
          console.log('🔍 Logout - Attendance details:', {
            id: activeAttendance.id,
            collectorId: activeAttendance.collectorId,
            usertype: activeAttendance.usertype,
            loginAt: activeAttendance.loginAt,
            logoutAt: activeAttendance.logoutAt
          });
        }

        if (activeAttendance) {
          // Update attendance with logout time
          await activeAttendance.update({
            logoutAt: new Date()
            // workingDurationMinutes is calculated automatically in the model hook
          });

          console.log('✅ Logout - Attendance updated with logout time:', activeAttendance.logoutAt);

          // Create audit log for attendance punch out
          // Wrap in try-catch to ensure logout never fails due to audit log errors
          try {
            await createAuditLog({
              req,
              user,
              actionType: 'LOGOUT',
              entityType: 'Attendance',
              entityId: activeAttendance.id,
              description: `Collector punched out`,
              metadata: {
                attendanceId: activeAttendance.id,
                workingDurationMinutes: activeAttendance.workingDurationMinutes,
                loginAt: activeAttendance.loginAt,
                logoutAt: activeAttendance.logoutAt
              }
            });
          } catch (auditError) {
            // Log error but don't fail logout
            console.error('Failed to create audit log for attendance punch out:', auditError);
            // Logout and attendance update are still successful
          }
        } else {
          console.warn(`Collector ${user.id} logged out but no active attendance session found`);

          // Check all attendance records for this collector to debug
          const allRecords = await CollectorAttendance.findAll({
            where: { collectorId: user.id },
            order: [['loginAt', 'DESC']],
            limit: 3
          });

          console.log('🔍 Debug - All attendance records for collector:', user.id);
          allRecords.forEach((record, index) => {
            console.log(`   ${index + 1}. ID: ${record.id}, UserType: ${record.usertype}, Login: ${record.loginAt}, Logout: ${record.logoutAt || 'Active'}`);
          });
        }
      } catch (attendanceError) {
        // Log error but don't fail logout
        console.error('Failed to capture attendance on logout:', attendanceError);
      }
    }

    // Log logout action
    await auditLogger.logLogout(req, user);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    const user = await User.findByPk(req.user.id);

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};
