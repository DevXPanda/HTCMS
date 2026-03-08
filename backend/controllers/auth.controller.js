import jwt from 'jsonwebtoken';
import { User, Property } from '../models/index.js';
import { Op } from 'sequelize';
import { auditLogger, createAuditLog } from '../utils/auditLogger.js';
import { parseDeviceInfo } from '../utils/deviceParser.js';

/**
 * Generate JWT Token
 * Includes role, ulb_id, ward_id, eo_id for proper filtering
 */
const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured. Please set it in your .env file.');
  }

  const tokenPayload = {
    userId: user.id,
    role: user.role || 'citizen' // Always include role
  };

  // Include ULB and related fields if they exist
  if (user.ulb_id) tokenPayload.ulb_id = user.ulb_id;
  if (user.ward_id) tokenPayload.ward_id = user.ward_id;
  if (user.eo_id) tokenPayload.eo_id = user.eo_id;
  if (user.ward_ids && Array.isArray(user.ward_ids) && user.ward_ids.length > 0) {
    tokenPayload.ward_ids = user.ward_ids;
  }

  return jwt.sign(tokenPayload, process.env.JWT_SECRET, {
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

    // Generate token with user data for filtering
    const token = generateToken(user);

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

    // Find user by email or phone - include all fields needed for JWT token
    const user = await User.findOne({
      where: whereClause,
      attributes: ['id', 'username', 'email', 'password', 'firstName', 'lastName', 'phone', 'role', 'isActive', 'lastLogin', 'ulb_id', 'ward_id', 'eo_id']
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

    // Generate token with user data for filtering
    const token = generateToken(user);

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

        if (activeSession && process.env.NODE_ENV === 'development') {
          console.warn('Collector already had active session, creating new punch-in');
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
          if (process.env.NODE_ENV === 'development') console.error('Audit log collector punch in:', auditError);
        }
      } catch (attendanceError) {
        if (process.env.NODE_ENV === 'development') console.error('Collector attendance on login:', attendanceError);
      }
    }

    // Capture attendance for admins (super-admin-created accounts) - same as collector punch in
    const roleLower = (user.role || '').toString().toLowerCase();
    if (roleLower === 'admin' || roleLower === 'super_admin') {
      try {
        const { CollectorAttendance } = await import('../models/index.js');
        const activeSession = await CollectorAttendance.findOne({
          where: { collectorId: user.id, usertype: 'user', logoutAt: null },
          order: [['loginAt', 'DESC']]
        });
        if (activeSession && process.env.NODE_ENV === 'development') {
          console.warn('Admin already had active session, creating new punch-in');
        }
        const deviceInfo = parseDeviceInfo(req);
        const { latitude, longitude, address } = req.body;
        const attendance = await CollectorAttendance.create({
          collectorId: user.id,
          usertype: 'user',
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
        try {
          await createAuditLog({
            req,
            user,
            actionType: 'LOGIN',
            entityType: 'Attendance',
            entityId: attendance.id,
            description: 'Admin punched in',
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
          if (process.env.NODE_ENV === 'development') console.error('Audit log admin punch in:', auditError);
        }
      } catch (attendanceError) {
        if (process.env.NODE_ENV === 'development') console.error('Admin attendance on login:', attendanceError);
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

    // Ensure role and ulb_id are included (ulb_id for role-based dashboard filtering)
    const sanitizedUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      ulb_id: user.ulb_id ?? user.dataValues?.ulb_id ?? null,
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
      try {
        const { CollectorAttendance } = await import('../models/index.js');
        const activeAttendance = await CollectorAttendance.findOne({
          where: { collectorId: user.id, logoutAt: null },
          order: [['loginAt', 'DESC']]
        });
        if (activeAttendance) {
          const logoutAt = new Date();
          const workingDurationMinutes = Math.floor((logoutAt - new Date(activeAttendance.loginAt)) / (1000 * 60));
          const [affected] = await CollectorAttendance.update(
            { logoutAt, workingDurationMinutes },
            { where: { id: activeAttendance.id, logoutAt: null } }
          );
          if (affected > 0) {
            try {
              await createAuditLog({
                req,
                user,
                actionType: 'LOGOUT',
                entityType: 'Attendance',
                entityId: activeAttendance.id,
                description: 'Collector punched out',
                metadata: {
                  attendanceId: activeAttendance.id,
                  workingDurationMinutes,
                  loginAt: activeAttendance.loginAt,
                  logoutAt
                }
              });
            } catch (auditError) {
              if (process.env.NODE_ENV === 'development') console.error('Audit log collector punch out:', auditError);
            }
          }
        } else if (process.env.NODE_ENV === 'development') {
          console.warn('Collector logout: no active attendance session found');
        }
      } catch (attendanceError) {
        if (process.env.NODE_ENV === 'development') console.error('Collector attendance on logout:', attendanceError);
      }
    }

    // Capture attendance for admins (punch out)
    const roleLowerLogout = (req.user?.role || '').toString().toLowerCase();
    if (roleLowerLogout === 'admin' || roleLowerLogout === 'super_admin') {
      try {
        const { CollectorAttendance } = await import('../models/index.js');
        const activeAttendance = await CollectorAttendance.findOne({
          where: { collectorId: user.id, usertype: 'user', logoutAt: null },
          order: [['loginAt', 'DESC']]
        });
        if (activeAttendance) {
          const logoutAt = new Date();
          const workingDurationMinutes = Math.floor((logoutAt - new Date(activeAttendance.loginAt)) / (1000 * 60));
          const [affected] = await CollectorAttendance.update(
            { logoutAt, workingDurationMinutes },
            { where: { id: activeAttendance.id, logoutAt: null } }
          );
          if (affected > 0) {
            try {
              await createAuditLog({
                req,
                user,
                actionType: 'LOGOUT',
                entityType: 'Attendance',
                entityId: activeAttendance.id,
                description: 'Admin punched out',
                metadata: {
                  attendanceId: activeAttendance.id,
                  workingDurationMinutes,
                  loginAt: activeAttendance.loginAt,
                  logoutAt
                }
              });
            } catch (auditError) {
              if (process.env.NODE_ENV === 'development') console.error('Audit log admin punch out:', auditError);
            }
          }
        } else if (process.env.NODE_ENV === 'development') {
          console.warn('Admin logout: no active attendance session found');
        }
      } catch (attendanceError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Admin attendance punch out:', attendanceError);
        }
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
