import { User } from '../models/index.js';
import { Op } from 'sequelize';
import { auditLogger } from '../utils/auditLogger.js';

/**
 * @route   GET /api/users
 * @desc    Get all users (with filters)
 * @access  Private (Admin only)
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const { role, isActive, search, page = 1, limit = 10 } = req.query;

    const where = {};
    // Normalize role to lowercase for matching
    if (role) {
      const normalizedRole = role.toLowerCase().trim();
      // Map 'tax_collector' to 'collector' for backward compatibility
      where.role = normalizedRole === 'tax_collector' ? 'collector' : normalizedRole;
    }
    if (isActive !== undefined) where.isActive = isActive === 'true';
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

    // Allow users to view their own profile
    if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
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
export const createUser = async (req, res, next) => {
  try {
    const { username, email, password, firstName, lastName, phone, role } = req.body;

    // Validate and normalize role
    const validRoles = ['admin', 'assessor', 'cashier', 'collector', 'citizen'];
    let normalizedRole = role ? role.toLowerCase().trim() : 'citizen';
    
    // Map 'tax_collector' to 'collector' for backward compatibility
    if (normalizedRole === 'tax_collector') {
      normalizedRole = 'collector';
    }
    
    if (!validRoles.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
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

    const user = await User.create({
      username,
      email,
      password,
      firstName,
      lastName,
      phone,
      role: normalizedRole,
      createdBy: req.user.id
    });

    // Log user creation
    await auditLogger.logCreate(
      req,
      req.user,
      'User',
      user.id,
      { username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
      `Created user: ${user.firstName} ${user.lastName} (${user.email})`
    );

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
          role: user.role
        }
      }
    });
  } catch (error) {
    next(error);
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
    const { firstName, lastName, phone, role, isActive } = req.body;

    // Allow users to update their own profile (limited fields)
    if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
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
    if (req.user.role !== 'admin') {
      user.firstName = firstName || user.firstName;
      user.lastName = lastName || user.lastName;
      user.phone = phone || user.phone;
    } else {
      // Admin can update all fields
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (phone) user.phone = phone;
      if (role) {
        // Validate and normalize role
        const validRoles = ['admin', 'assessor', 'cashier', 'collector', 'citizen'];
        let normalizedRole = role.toLowerCase().trim();
        
        // Map 'tax_collector' to 'collector' for backward compatibility
        if (normalizedRole === 'tax_collector') {
          normalizedRole = 'collector';
        }
        
        if (!validRoles.includes(normalizedRole)) {
          return res.status(400).json({
            success: false,
            message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
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
 * @desc    Get all collectors (users with role='collector')
 * @access  Private (Admin only)
 */
export const getCollectors = async (req, res, next) => {
  try {
    const collectors = await User.findAll({
      where: {
        role: 'collector',
        isActive: true
      },
      attributes: { exclude: ['password'] },
      order: [['firstName', 'ASC'], ['lastName', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        collectors
      }
    });
  } catch (error) {
    next(error);
  }
};
