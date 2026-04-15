import jwt from 'jsonwebtoken';
import { User, Property, ULB } from '../models/index.js';
import { Op } from 'sequelize';
import { auditLogger, createAuditLog } from '../utils/auditLogger.js';
import { parseDeviceInfo } from '../utils/deviceParser.js';
import { sendMail } from '../utils/mailer.js';
import { buildCitizenOtpEmail } from '../utils/citizenOtpEmail.js';
import { generateNumericOtp, hashOtp, compareOtp, maskEmail } from '../utils/otpUtils.js';

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

const REGISTRATION_OTP_MINUTES = Number(process.env.REGISTRATION_OTP_MINUTES) || 30;
const LOGIN_OTP_MINUTES = Number(process.env.CITIZEN_LOGIN_OTP_MINUTES) || 15;

const generateCitizenLoginPendingToken = (userId) =>
  jwt.sign(
    { userId, purpose: 'citizen_login_otp' },
    process.env.JWT_SECRET,
    { expiresIn: `${LOGIN_OTP_MINUTES}m` }
  );

async function getDefaultCitizenUlbId() {
  const firstUlb = await ULB.findOne({ attributes: ['id'], where: { status: 'ACTIVE' } });
  return firstUlb?.id || null;
}

async function sendRegistrationOtpToUser(user, otpPlain) {
  const { subject, text, html } = buildCitizenOtpEmail({
    otpCode: otpPlain,
    title: 'Urban Local Bodies — verify your registration',
    introText: 'Thank you for registering with Urban Local Bodies. Enter this code to complete your account setup.',
    minutesValid: REGISTRATION_OTP_MINUTES
  });
  await sendMail({ to: user.email, subject, text, html });
}

async function sendLoginOtpToUser(user, otpPlain) {
  const { subject, text, html } = buildCitizenOtpEmail({
    otpCode: otpPlain,
    title: 'Urban Local Bodies — sign-in verification code',
    introText: 'You are signing in to the Urban Local Bodies citizen portal. Use this code to finish logging in.',
    minutesValid: LOGIN_OTP_MINUTES
  });
  await sendMail({ to: user.email, subject, text, html });
}

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user — citizens must verify email OTP before login; admins get immediate access
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const { username, email, password, firstName, lastName, phone, role } = req.body;

    // Validate and normalize role if provided - ONLY allow admin and citizen for self-registration
    let normalizedRole = role;
    if (role) {
      normalizedRole = role.toLowerCase().trim();
      if (normalizedRole === 'tax_collector') {
        normalizedRole = 'collector';
      }
      const allowedSelfRegistrationRoles = ['admin', 'citizen'];
      if (!allowedSelfRegistrationRoles.includes(normalizedRole)) {
        return res.status(400).json({
          success: false,
          message: 'Staff registration is not allowed'
        });
      }
    }

    const effectiveRole = normalizedRole || 'citizen';

    // Admin: keep immediate registration + token (no email OTP)
    if (effectiveRole === 'admin') {
      const existingUser = await User.findOne({
        where: { [Op.or]: [{ email }, { username }] }
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email or username already exists'
        });
      }

      const user = await User.create({
        username,
        email,
        password,
        firstName,
        lastName,
        phone,
        role: 'admin',
        emailVerified: true,
        isActive: true
      });

      const token = generateToken(user);
      const sanitizedUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role
      };

      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: { user: sanitizedUser, token }
      });
    }

    // Citizen: create inactive account, send OTP; no JWT until email verified (then user logs in on login page)
    const existingUser = await User.findOne({
      where: { [Op.or]: [{ email }, { username }] }
    });

    if (existingUser) {
      const pendingSameEmail =
        existingUser.email === email &&
        existingUser.role === 'citizen' &&
        !existingUser.emailVerified;

      if (!pendingSameEmail) {
        return res.status(400).json({
          success: false,
          message: 'User with this email or username already exists'
        });
      }

      if (existingUser.username !== username) {
        const usernameTaken = await User.findOne({
          where: { username, id: { [Op.ne]: existingUser.id } }
        });
        if (usernameTaken) {
          return res.status(400).json({
            success: false,
            message: 'Registration Error: This username is not available. Please try another.'
          });
        }
      }

      const otpPlain = generateNumericOtp();
      const registrationOtpHash = await hashOtp(otpPlain);
      const registrationOtpExpiresAt = new Date(Date.now() + REGISTRATION_OTP_MINUTES * 60 * 1000);

      existingUser.username = username;
      existingUser.password = password;
      existingUser.firstName = firstName;
      existingUser.lastName = lastName;
      existingUser.phone = phone || null;
      existingUser.registrationOtpHash = registrationOtpHash;
      existingUser.registrationOtpExpiresAt = registrationOtpExpiresAt;
      existingUser.isActive = false;
      existingUser.emailVerified = false;
      await existingUser.save();

      await sendRegistrationOtpToUser(existingUser, otpPlain);

      return res.status(201).json({
        success: true,
        requiresVerification: true,
        message: 'We sent a verification code to your email. Enter it to complete registration.',
        email: existingUser.email,
        emailMasked: maskEmail(existingUser.email)
      });
    }

    const ulbId = await getDefaultCitizenUlbId();
    if (!ulbId) {
      return res.status(400).json({
        success: false,
        message: 'Registration is temporarily unavailable. Please try again later or contact support.'
      });
    }

    const otpPlain = generateNumericOtp();
    const registrationOtpHash = await hashOtp(otpPlain);
    const registrationOtpExpiresAt = new Date(Date.now() + REGISTRATION_OTP_MINUTES * 60 * 1000);

    const user = await User.create({
      username,
      email,
      password,
      firstName,
      lastName,
      phone: phone || null,
      role: 'citizen',
      ulb_id: ulbId,
      isActive: false,
      emailVerified: false,
      registrationOtpHash,
      registrationOtpExpiresAt
    });

    await sendRegistrationOtpToUser(user, otpPlain);

    return res.status(201).json({
      success: true,
      requiresVerification: true,
      message: 'We sent a verification code to your email. Enter it to complete registration.',
      email: user.email,
      emailMasked: maskEmail(user.email)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/verify-registration
 * @desc    Complete citizen registration with email OTP
 * @access  Public
 */
export const verifyRegistration = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required'
      });
    }

    const user = await User.findOne({
      where: { email, role: 'citizen' }
    });

    if (!user || user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or already verified account'
      });
    }

    if (!user.registrationOtpHash || !user.registrationOtpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: 'No verification code pending. Please register again or request a new code.'
      });
    }

    if (new Date() > new Date(user.registrationOtpExpiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new one.'
      });
    }

    const ok = await compareOtp(otp, user.registrationOtpHash);
    if (!ok) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    await user.update({
      emailVerified: true,
      isActive: true,
      registrationOtpHash: null,
      registrationOtpExpiresAt: null
    });

    res.json({
      success: true,
      message: 'Your account is verified. You can sign in on the citizen login page.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/resend-registration-otp
 * @desc    Resend registration OTP to citizen email
 * @access  Public
 */
export const resendRegistrationOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ where: { email, role: 'citizen' } });
    if (!user || user.emailVerified) {
      return res.json({
        success: true,
        message: 'If an account is pending verification, a new code has been sent.'
      });
    }

    const otpPlain = generateNumericOtp();
    const registrationOtpHash = await hashOtp(otpPlain);
    const registrationOtpExpiresAt = new Date(Date.now() + REGISTRATION_OTP_MINUTES * 60 * 1000);
    await user.update({ registrationOtpHash, registrationOtpExpiresAt });

    await sendRegistrationOtpToUser(user, otpPlain);

    res.json({
      success: true,
      message: 'A new verification code has been sent to your email.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/verify-citizen-login
 * @desc    Complete citizen login after email OTP
 * @access  Public
 */
export const verifyCitizenLogin = async (req, res, next) => {
  try {
    const { pendingToken, otp } = req.body;
    if (!pendingToken || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Session token and verification code are required'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(pendingToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({
        success: false,
        message: 'Login session expired. Please sign in again.'
      });
    }

    if (decoded.purpose !== 'citizen_login_otp' || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid login session'
      });
    }

    const user = await User.findByPk(decoded.userId, {
      attributes: [
        'id',
        'username',
        'email',
        'password',
        'firstName',
        'lastName',
        'phone',
        'role',
        'isActive',
        'lastLogin',
        'ulb_id',
        'ward_id',
        'eo_id',
        'emailVerified',
        'loginOtpHash',
        'loginOtpExpiresAt'
      ]
    });

    if (!user || user.role !== 'citizen' || (!user.isActive && user.emailVerified)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid login session'
      });
    }

    if (!user.loginOtpHash || !user.loginOtpExpiresAt || new Date() > new Date(user.loginOtpExpiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'Verification code expired. Please sign in again.'
      });
    }

    const ok = await compareOtp(otp, user.loginOtpHash);
    if (!ok) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    await user.update({
      lastLogin: new Date(),
      emailVerified: true,
      isActive: true,
      loginOtpHash: null,
      loginOtpExpiresAt: null
    });

    const token = generateToken(user);
    await auditLogger.logLogin(req, user);

    const sanitizedUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role
    };

    res.json({
      token,
      user: sanitizedUser
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

    // Find user by email or phone - include all fields needed for JWT token + citizen OTP
    const user = await User.findOne({
      where: whereClause,
      attributes: [
        'id',
        'username',
        'email',
        'password',
        'firstName',
        'lastName',
        'phone',
        'role',
        'isActive',
        'lastLogin',
        'ulb_id',
        'ward_id',
        'eo_id',
        'emailVerified',
        'loginOtpHash',
        'loginOtpExpiresAt'
      ]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Login Error: The email or phone number provided is incorrect.'
      });
    }

    if (!user.isActive) {
      // Allow unverified citizens to pass through to the password check and OTP flow
      if (user.role !== 'citizen' || user.emailVerified) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated. Please contact administrator.'
        });
      }
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Login Error: The password you entered is incorrect.'
      });
    }

    // Citizens: email OTP on every successful password check (code sent to registered email)
    if (user.role === 'citizen') {
      const otpPlain = generateNumericOtp();
      const loginOtpHash = await hashOtp(otpPlain);
      const loginOtpExpiresAt = new Date(Date.now() + LOGIN_OTP_MINUTES * 60 * 1000);
      await user.update({ loginOtpHash, loginOtpExpiresAt });

      await sendLoginOtpToUser(user, otpPlain);

      const pendingToken = generateCitizenLoginPendingToken(user.id);
      return res.json({
        success: true,
        requiresOtp: true,
        pendingToken,
        emailMasked: maskEmail(user.email),
        message: `We sent a sign-in code to ${maskEmail(user.email)}.`
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
