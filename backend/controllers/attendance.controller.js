import { CollectorAttendance, User, Ward, AdminManagement } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * @route   GET /api/attendance
 * @desc    Get attendance records with role-based filtering
 * @access  Private (Admin, Assessor, Collector)
 */
export const getAttendanceRecords = async (req, res, next) => {
  try {
    const {
      collectorId,
      dateFrom,
      dateTo,
      wardId,
      deviceType,
      source,
      hasNoLogout,
      lateLogin,
      search,
      page = 1,
      limit = 20,
      sortBy = 'loginAt',
      sortOrder = 'DESC'
    } = req.query;

    const where = {};
    const user = req.user;

    // Role-based access control
    if (user.role === 'collector' || user.role === 'clerk' || user.role === 'inspector' || user.role === 'officer') {
      // Staff members can only see their own attendance
      where.collectorId = user.id;

      // For staff roles (not collectors), filter by usertype to ensure we get admin_management records
      if (user.role !== 'collector') {
        where.usertype = 'admin_management';
      }
    } else if (user.role === 'admin' || user.role === 'assessor') {
      // Admin and Assessor can see all attendance records
      // Apply filters if provided
      if (collectorId) {
        where.collectorId = collectorId;
      }

      // Filter by ward (through collector assignment)
      if (wardId) {
        const ward = await Ward.findByPk(wardId);
        if (ward && ward.collectorId) {
          where.collectorId = ward.collectorId;
        } else {
          // Ward has no collector, return empty result
          return res.json({
            success: true,
            data: {
              attendance: [],
              pagination: {
                total: 0,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: 0
              }
            }
          });
        }
      }
    } else {
      // Citizens have no access
      return res.status(403).json({
        message: 'Access denied. Insufficient permissions to view attendance records.'
      });
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.loginAt = {};
      if (dateFrom) {
        where.loginAt[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        // Include the entire day
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.loginAt[Op.lte] = endDate;
      }
    }

    // Device type filter
    if (deviceType) {
      where.deviceType = deviceType;
    }

    // Source filter
    if (source) {
      where.source = source;
    }

    // Filter for records without logout
    if (hasNoLogout === 'true') {
      where.logoutAt = null;
    }

    // Late login filter (login after 9 AM on the same day)
    // This is handled in the application layer by filtering results
    // For now, we'll apply a simple date filter - can be enhanced later

    // Search filter (by collector name)
    // We'll handle collector info separately after fetching attendance records
    let whereConditions = where;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // First fetch attendance records without includes
    const { count, rows } = await CollectorAttendance.findAndCountAll({
      where: whereConditions,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]]
    });

    // Now fetch collector information for each attendance record
    const attendanceWithCollectors = await Promise.all(
      rows.map(async (attendance) => {
        let collector = null;

        if (attendance.usertype === 'admin_management') {
          // Staff user - fetch from AdminManagement
          collector = await AdminManagement.findByPk(attendance.collectorId, {
            attributes: ['id', 'full_name', 'email', 'phone_number', 'employee_id', 'role']
          });

          if (collector) {
            // Format staff collector data
            collector = {
              id: collector.id,
              firstName: collector.full_name?.split(' ')[0] || '',
              lastName: collector.full_name?.split(' ').slice(1).join(' ') || '',
              email: collector.email,
              phone: collector.phone_number,
              employee_id: collector.employee_id,
              role: collector.role,
              full_name: collector.full_name
            };
          }
        } else {
          // Regular user - fetch from Users
          collector = await User.findByPk(attendance.collectorId, {
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'role']
          });
        }

        return {
          ...attendance.toJSON(),
          collector: collector
        };
      })
    );

    // Apply search filter if needed (filter after fetching collector info)
    let filteredAttendance = attendanceWithCollectors;
    if (search && (user.role === 'admin' || user.role === 'assessor')) {
      filteredAttendance = attendanceWithCollectors.filter(record => {
        if (!record.collector) return false;
        const collector = record.collector;
        const searchLower = search.toLowerCase();
        return (
          (collector.firstName && collector.firstName.toLowerCase().includes(searchLower)) ||
          (collector.lastName && collector.lastName.toLowerCase().includes(searchLower)) ||
          (collector.email && collector.email.toLowerCase().includes(searchLower)) ||
          (collector.full_name && collector.full_name.toLowerCase().includes(searchLower))
        );
      });
    }

    res.json({
      success: true,
      data: {
        attendance: filteredAttendance,
        pagination: {
          total: search ? filteredAttendance.length : count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil((search ? filteredAttendance.length : count) / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/attendance/:id
 * @desc    Get attendance record by ID
 * @access  Private (Admin, Assessor, Collector - own records only)
 */
export const getAttendanceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const attendance = await CollectorAttendance.findByPk(id, {
      include: [
        {
          model: User,
          as: 'collector',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
          include: [
            {
              model: Ward,
              as: 'assignedWards',
              attributes: ['id', 'wardNumber', 'wardName']
            }
          ]
        }
      ]
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    // Role-based access control
    if (user.role === 'collector' && attendance.collectorId !== user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own attendance records.'
      });
    }

    if (user.role === 'citizen') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { attendance }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/attendance/stats/summary
 * @desc    Get attendance statistics summary
 * @access  Private (Admin, Assessor only)
 */
export const getAttendanceStats = async (req, res, next) => {
  try {
    const user = req.user;

    if (user.role !== 'admin' && user.role !== 'assessor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admin and assessor can view statistics.'
      });
    }

    const { dateFrom, dateTo } = req.query;

    const where = {};
    if (dateFrom || dateTo) {
      where.loginAt = {};
      if (dateFrom) {
        where.loginAt[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.loginAt[Op.lte] = endDate;
      }
    }

    // Total attendance records
    const totalRecords = await CollectorAttendance.count({ where });

    // Active sessions (no logout)
    const activeSessions = await CollectorAttendance.count({
      where: {
        ...where,
        logoutAt: null
      }
    });

    // Today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendance = await CollectorAttendance.count({
      where: {
        loginAt: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      }
    });

    // Collectors without logout today
    const noLogoutToday = await CollectorAttendance.count({
      where: {
        loginAt: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        },
        logoutAt: null
      }
    });

    // Unique collectors
    const uniqueCollectors = await CollectorAttendance.count({
      where,
      distinct: true,
      col: 'collectorId'
    });

    res.json({
      success: true,
      data: {
        totalRecords,
        activeSessions,
        todayAttendance,
        noLogoutToday,
        uniqueCollectors
      }
    });
  } catch (error) {
    next(error);
  }
};
