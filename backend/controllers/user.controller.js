import { User, Ward, ULB } from '../models/index.js';
import { AdminManagement } from '../models/AdminManagement.js';
import { Op } from 'sequelize';
import { auditLogger } from '../utils/auditLogger.js';
import { getEffectiveUlbForRequest } from '../utils/ulbAccessHelper.js';

/**
 * @route   GET /api/users
 * @desc    Get all users (with filters)
 * @access  Private (Admin only)
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const { role, isActive, search, page = 1, limit = 10 } = req.query;

    const where = {};

    const { isSuperAdmin, effectiveUlbId, isSbmMonitor } = getEffectiveUlbForRequest(req);
    if (!isSuperAdmin && !isSbmMonitor && (effectiveUlbId == null || effectiveUlbId === '')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You must be assigned to an ULB to view users.'
      });
    }
    if (effectiveUlbId) {
      where.ulb_id = effectiveUlbId;
    }

    // Only allow citizen and admin roles in users table
    const allowedRoles = ['citizen', 'admin'];
    where.role = {
      [Op.in]: allowedRoles
    };

    // Normalize role to lowercase for matching
    if (role) {
      const normalizedRole = role.toLowerCase().trim();
      // Only allow filtering by citizen or admin roles
      if (allowedRoles.includes(normalizedRole)) {
        where.role = normalizedRole;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid role specified. Only citizen and admin roles are allowed.'
        });
      }
    }

    // Default to active users only so "deleted" (deactivated) users don't appear in the list
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    } else {
      where.isActive = true;
    }
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { username: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        users: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin, or own profile)
 */
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const roleLower = (req.user.role || '').toString().toLowerCase();
    const roleUpper = (req.user.role || '').toString().toUpperCase();
    const isAdmin = roleLower === 'admin';
    const isSbm = req.userType === 'admin_management' && roleUpper === 'SBM';

    if (!isAdmin && !isSbm && req.user.id !== parseInt(id, 10)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          association: 'properties',
          attributes: ['id', 'propertyNumber', 'address', 'city']
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/users
 * @desc    Create new user (Admin only)
 * @access  Private (Admin only)
 */
const rolesRequiringWards = ['collector', 'clerk', 'inspector', 'officer'];

export const createUser = async (req, res, next) => {
  try {
    const { username, email, password, firstName, lastName, phone, role, wardIds, isActive, ulb_id: bodyUlbId } = req.body;

    // Only allow citizen and admin roles in users table
    const validRoles = ['citizen', 'admin'];
    let normalizedRole = role ? role.toLowerCase().trim() : 'citizen';

    if (!validRoles.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Only citizen and admin roles are allowed. Staff roles must be created through Staff Management.`
      });
    }

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

    // createdBy must reference users.id; staff admins are in admin_management so use null
    const creatorInUsers = await User.findByPk(req.user.id);
    const createdById = creatorInUsers ? req.user.id : null;

    // ulb_id: DB may have NOT NULL; use body, then staff admin's ULB, then first ULB
    let ulbId = bodyUlbId || req.user?.ulb_id || null;
    if (!ulbId) {
      const firstUlb = await ULB.findOne({ attributes: ['id'], where: { status: 'ACTIVE' } });
      ulbId = firstUlb?.id || null;
    }
    if (!ulbId) {
      return res.status(400).json({
        success: false,
        message: 'No ULB available. Please add at least one ULB in the system before creating users.'
      });
    }

    const user = await User.create({
      username,
      email,
      password,
      firstName,
      lastName,
      phone: phone || null,
      role: normalizedRole,
      isActive: isActive !== undefined ? !!isActive : true,
      ulb_id: ulbId,
      createdBy: createdById
    });

    // Handle ward assignment for roles that require wards (citizen/admin do not)
    if (rolesRequiringWards.includes(normalizedRole) && wardIds && Array.isArray(wardIds) && wardIds.length > 0) {
      try {
        // Determine which field to update based on role
        const roleFieldMap = {
          'collector': 'collectorId',
          'clerk': 'clerkid',
          'inspector': 'inspectorid',
          'officer': 'officerid'
        };

        const fieldToUpdate = roleFieldMap[normalizedRole];

        // Update wards to assign this user to the appropriate role field
        await Ward.update(
          { [fieldToUpdate]: user.id },
          {
            where: {
              id: { [Op.in]: wardIds },
              isActive: true
            }
          }
        );

        // Log ward assignments
        for (const wardId of wardIds) {
          await auditLogger.logAssign(
            req,
            req.user,
            'Ward',
            wardId,
            { [fieldToUpdate]: user.id },
            `Assigned ${normalizedRole} ${user.firstName} ${user.lastName} to ward ID: ${wardId}`
          );
        }
      } catch (wardError) {
        console.error('Failed to assign wards:', wardError);
        // Don't fail the user creation, but log the error
      }
    }

    // Log user creation (non-blocking)
    try {
      await auditLogger.logCreate(
        req,
        req.user,
        'User',
        user.id,
        { username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
        `Created user: ${user.firstName} ${user.lastName} (${user.email})`
      );
    } catch (auditErr) {
      console.error('Audit log failed for user create:', auditErr);
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role
        }
      }
    });
  } catch (error) {
    // Return clear messages so frontend does not show "Something went wrong"
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors?.[0]?.path || error.fields?.[0] || 'email or username';
      return res.status(400).json({
        success: false,
        message: `User with this ${typeof field === 'string' ? field : 'email or username'} already exists`
      });
    }
    if (error.name === 'SequelizeValidationError') {
      const first = error.errors?.[0];
      const msg = first ? (first.message || `Validation failed: ${first.path}`) : 'Invalid user data. Please check the form.';
      return res.status(400).json({ success: false, message: msg });
    }
    if (error.name === 'SequelizeDatabaseError' || error.name === 'SequelizeForeignKeyConstraintError') {
      console.error('User create DB error:', error.message);
      return res.status(400).json({
        success: false,
        message: 'Could not create user. Please check your input and try again.'
      });
    }
    console.error('User create error:', error);
    return res.status(500).json({
      success: false,
      message: error.message && !error.message.toLowerCase().includes('internal server error')
        ? error.message
        : 'Failed to create user. Please try again.'
    });
  }
};

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private (Admin, or own profile)
 */
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, role, isActive, email, username, password } = req.body;

    const isAdmin = (req.user.role || '').toString().toLowerCase() === 'admin';
    if (!isAdmin && req.user.id !== parseInt(id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Capture previous data for audit log
    const previousData = {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive
    };

    // Non-admin users can only update limited fields
    if (!isAdmin) {
      if (firstName !== undefined) user.firstName = firstName;
      if (lastName !== undefined) user.lastName = lastName;
      if (phone !== undefined) user.phone = phone;
      if (email !== undefined) {
        const existing = await User.findOne({ where: { email, id: { [Op.ne]: id } } });
        if (existing) return res.status(400).json({ success: false, message: 'Another user already has this email.' });
        user.email = email;
      }
    } else {
      // Admin can update all fields
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (phone !== undefined) user.phone = phone;
      if (email) {
        const existing = await User.findOne({ where: { email, id: { [Op.ne]: id } } });
        if (existing) return res.status(400).json({ success: false, message: 'Another user already has this email.' });
        user.email = email;
      }
      if (username) {
        const existing = await User.findOne({ where: { username, id: { [Op.ne]: id } } });
        if (existing) return res.status(400).json({ success: false, message: 'Another user already has this username.' });
        user.username = username;
      }
      if (password && String(password).trim()) user.password = password; // will be hashed by model hook
      if (role) {
        // Validate and normalize role - only citizen/admin for users table
        const validRoles = ['admin', 'citizen'];
        let normalizedRole = role.toLowerCase().trim();
        if (!validRoles.includes(normalizedRole)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid role. Must be citizen or admin.'
          });
        }
        user.role = normalizedRole;
      }
      if (isActive !== undefined) user.isActive = isActive;
    }

    await user.save();

    // Log user update
    const newData = {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive
    };
    await auditLogger.logUpdate(
      req,
      req.user,
      'User',
      user.id,
      previousData,
      newData,
      `Updated user: ${user.firstName} ${user.lastName}`
    );

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (soft delete - deactivate)
 * @access  Private (Admin only)
 */
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Capture previous data for audit log
    const previousData = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    };

    // Soft delete - deactivate user
    user.isActive = false;
    await user.save();

    // Log user deactivation
    await auditLogger.logDelete(
      req,
      req.user,
      'User',
      user.id,
      previousData,
      `Deactivated user: ${user.firstName} ${user.lastName} (${user.email})`
    );

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/users/collectors
 * @desc    Get all collectors from AdminManagement table (optional filter by ulb_id)
 * @access  Private (Admin only)
 */
export const getCollectors = async (req, res, next) => {
  try {
    const { ulb_id } = req.query;
    const where = {
      role: 'COLLECTOR',
      status: 'active'
    };
    if (ulb_id) {
      where.ulb_id = ulb_id;
    }
    const collectors = await AdminManagement.findAll({
      where,
      attributes: ['id', 'full_name', 'email', 'phone_number', 'employee_id', 'role', 'status', 'ulb_id'],
      order: [['full_name', 'ASC']]
    });

    // Transform to match frontend expectations
    const formattedCollectors = collectors.map(c => ({
      id: c.id,
      firstName: c.full_name?.split(' ')[0] || c.full_name,
      lastName: c.full_name?.split(' ').slice(1).join(' ') || '',
      email: c.email,
      phone: c.phone_number,
      employeeId: c.employee_id,
      role: c.role,
      isActive: c.status === 'active'
    }));

    res.json({
      success: true,
      data: {
        collectors: formattedCollectors
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/users/staff
 * @desc    Get users filtered by roles (e.g., inspector, vet)
 * @access  Private
 */
export const getStaffByRoles = async (req, res, next) => {
  try {
    const { roles } = req.query;

    // Define the valid roles based on the User model's ENUM
    const validUserRoles = ['admin', 'assessor', 'cashier', 'collector', 'citizen', 'clerk', 'inspector', 'officer'];

    // Normalized role list from query, filtered by what's actually in the database model
    let roleList = roles ? roles.split(',').map(r => r.trim().toLowerCase()) : ['inspector', 'officer', 'clerk', 'admin'];

    // Filter to only valid roles to prevent Sequelize ENUM validation errors
    const filteredRoleList = roleList.filter(role => validUserRoles.includes(role));



    const staff = await User.findAll({
      where: {
        role: {
          [Op.in]: filteredRoleList
        },
        isActive: true
      },
      attributes: ['id', 'firstName', 'lastName', 'role', 'username'],
      order: [['firstName', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        staff: staff.map(s => ({
          ...s.toJSON(),
          displayName: `${s.firstName || s.username} ${s.lastName || ''}`.trim(),
          readableRole: s.role.charAt(0).toUpperCase() + s.role.slice(1)
        }))
      }
    });
  } catch (error) {
    console.error('❌ Error in getStaffByRoles:', error);
    next(error);
  }
};
