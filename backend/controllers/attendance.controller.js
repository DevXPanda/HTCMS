import { CollectorAttendance, User, Ward, AdminManagement, Worker, WorkerAttendance, ULB } from '../models/index.js';
import { Op } from 'sequelize';
import { isPointInPolygon, parseWardBoundary } from '../utils/geoHelpers.js';

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

/**
 * @route   POST /api/attendance/mark
 * @desc    Mark worker attendance (SUPERVISOR only). Validates same ward, time window 6-11 AM, geo-fence.
 * @access  Private (Supervisor)
 */
export const markWorkerAttendance = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    // Normalize role to uppercase for comparison
    const normalizedRole = user?.role ? user.role.toUpperCase().replace(/-/g, '_') : null;
    if (req.userType !== 'admin_management' || normalizedRole !== 'SUPERVISOR') {
      return res.status(403).json({ success: false, message: 'Only SUPERVISOR role can mark worker attendance' });
    }

    const supervisorWardId = user.ward_id;
    if (!supervisorWardId) {
      return res.status(400).json({ success: false, message: 'Supervisor has no ward assigned' });
    }

    const workerId = req.body.worker_id;
    const wardId = req.body.ward_id ? parseInt(req.body.ward_id, 10) : null;
    const lat = req.body.latitude != null ? parseFloat(req.body.latitude) : null;
    const lng = req.body.longitude != null ? parseFloat(req.body.longitude) : null;
    const timestamp = req.body.timestamp ? new Date(req.body.timestamp) : new Date();

    if (!workerId) {
      return res.status(400).json({ success: false, message: 'worker_id is required' });
    }
    if (!wardId) {
      return res.status(400).json({ success: false, message: 'ward_id is required' });
    }
    if (wardId !== supervisorWardId) {
      return res.status(400).json({ success: false, message: 'ward_id must match supervisor assigned ward' });
    }

    // Fetch worker with ulb_id
    const worker = await Worker.findByPk(workerId, {
      attributes: ['id', 'ward_id', 'ulb_id', 'supervisor_id', 'eo_id']
    });
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }
    if (worker.ward_id !== supervisorWardId) {
      return res.status(403).json({ success: false, message: 'Worker does not belong to your ward' });
    }

    // Fetch supervisor with ulb_id for validation
    const supervisor = await AdminManagement.findByPk(user.id, {
      attributes: ['id', 'ulb_id', 'ward_id', 'eo_id']
    });
    if (!supervisor) {
      return res.status(404).json({ success: false, message: 'Supervisor not found' });
    }

    // Validate ULB matching: Supervisor and Worker must belong to same ULB
    const supervisorUlbId = supervisor.ulb_id;
    const workerUlbId = worker.ulb_id;

    if (!supervisorUlbId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Supervisor must be assigned to an ULB to mark attendance' 
      });
    }

    if (!workerUlbId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Worker must be assigned to an ULB to mark attendance' 
      });
    }

    if (supervisorUlbId !== workerUlbId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Cross-city attendance marking not allowed. Supervisor and Worker must belong to the same ULB.' 
      });
    }

    // Get ward to verify ulb_id matches
    const ward = await Ward.findByPk(wardId, { 
      attributes: ['id', 'ulb_id', 'boundary_coordinates'] 
    });
    if (!ward) {
      return res.status(404).json({ success: false, message: 'Ward not found' });
    }

    // Validate ward belongs to same ULB
    if (ward.ulb_id && ward.ulb_id !== supervisorUlbId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Ward does not belong to the same ULB as supervisor' 
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    const existing = await WorkerAttendance.findOne({
      where: { worker_id: workerId, attendance_date: today }
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Attendance already marked for this worker today' });
    }

    const hour = timestamp.getHours();
    const minute = timestamp.getMinutes();
    const timeMinutes = hour * 60 + minute;
    const windowStart = 6 * 60;
    const windowEnd = 11 * 60;
    if (timeMinutes < windowStart || timeMinutes > windowEnd) {
      return res.status(400).json({
        success: false,
        message: 'Attendance can only be marked between 6:00 AM and 11:00 AM'
      });
    }

    let geoStatus = 'VALID';
    if (lat != null && lng != null && ward?.boundary_coordinates) {
      const boundary = parseWardBoundary(ward.boundary_coordinates);
      if (boundary && boundary.length >= 3 && !isPointInPolygon(lat, lng, boundary)) {
        geoStatus = 'OUTSIDE_WARD';
      }
    }

    let photoUrl = null;
    if (req.file && req.file.filename) {
      photoUrl = `/uploads/worker-attendance/${req.file.filename}`;
    }

    // Get eo_id from worker or supervisor (prefer worker's eo_id)
    const eoId = worker.eo_id || supervisor.eo_id || null;
    
    // Store ulb_id, ward_id, supervisor_id, eo_id
    const record = await WorkerAttendance.create({
      worker_id: workerId,
      supervisor_id: user.id,
      ward_id: wardId,
      eo_id: eoId,
      ulb_id: supervisorUlbId, // Store ULB ID from validated supervisor
      attendance_date: today,
      checkin_time: timestamp,
      latitude: lat,
      longitude: lng,
      photo_url: photoUrl,
      geo_status: geoStatus
    });

    return res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      data: {
        id: record.id,
        worker_id: record.worker_id,
        supervisor_id: record.supervisor_id,
        ward_id: record.ward_id,
        eo_id: record.eo_id,
        ulb_id: record.ulb_id,
        attendance_date: record.attendance_date,
        checkin_time: record.checkin_time,
        geo_status: record.geo_status,
        photo_url: record.photo_url
      }
    });
  } catch (error) {
    console.error('markWorkerAttendance error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark attendance', error: error.message });
  }
};

/**
 * @route   POST /api/attendance/mark-all
 * @desc    Mark all assigned workers as present (SUPERVISOR only, bulk operation)
 * @access  Private (Supervisor)
 */
export const markAllWorkersPresent = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Normalize role to uppercase for comparison
    const normalizedRole = user?.role ? user.role.toUpperCase().replace(/-/g, '_') : null;
    if (req.userType !== 'admin_management' || normalizedRole !== 'SUPERVISOR') {
      return res.status(403).json({ success: false, message: 'Only SUPERVISOR role can mark worker attendance' });
    }

    const supervisorWardId = user.ward_id;
    if (!supervisorWardId) {
      return res.status(400).json({ success: false, message: 'Supervisor has no ward assigned' });
    }

    const supervisor = await AdminManagement.findByPk(user.id, {
      attributes: ['id', 'ulb_id', 'ward_id', 'eo_id']
    });

    if (!supervisor || !supervisor.ulb_id) {
      return res.status(400).json({ success: false, message: 'Supervisor must be assigned to an ULB' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const timestamp = new Date();
    const hour = timestamp.getHours();
    const minute = timestamp.getMinutes();
    const timeMinutes = hour * 60 + minute;
    const windowStart = 6 * 60;
    const windowEnd = 11 * 60;

    if (timeMinutes < windowStart || timeMinutes > windowEnd) {
      return res.status(400).json({
        success: false,
        message: 'Attendance can only be marked between 6:00 AM and 11:00 AM'
      });
    }

    // Get all active workers assigned to this supervisor
    const workers = await Worker.findAll({
      where: {
        supervisor_id: user.id,
        ulb_id: supervisor.ulb_id,
        ward_id: supervisorWardId,
        status: 'ACTIVE'
      },
      attributes: ['id', 'ward_id', 'ulb_id', 'supervisor_id', 'eo_id']
    });

    if (workers.length === 0) {
      return res.status(400).json({ success: false, message: 'No workers assigned to you' });
    }

    // Get ward for geo validation
    const ward = await Ward.findByPk(supervisorWardId, {
      attributes: ['id', 'ulb_id', 'boundary_coordinates']
    });

    if (!ward) {
      return res.status(404).json({ success: false, message: 'Ward not found' });
    }

    // Get existing attendance for today
    const existingAttendance = await WorkerAttendance.findAll({
      where: {
        worker_id: { [Op.in]: workers.map(w => w.id) },
        attendance_date: today
      },
      attributes: ['worker_id']
    });

    const existingWorkerIds = new Set(existingAttendance.map(a => a.worker_id));
    const workersToMark = workers.filter(w => !existingWorkerIds.has(w.id));

    if (workersToMark.length === 0) {
      return res.json({
        success: true,
        message: 'All workers already marked present',
        data: { marked: 0, already_marked: workers.length }
      });
    }

    // Get location from request (optional, can be null)
    const lat = req.body.latitude != null ? parseFloat(req.body.latitude) : null;
    const lng = req.body.longitude != null ? parseFloat(req.body.longitude) : null;

    let geoStatus = 'VALID';
    if (lat != null && lng != null && ward?.boundary_coordinates) {
      const boundary = parseWardBoundary(ward.boundary_coordinates);
      if (boundary && boundary.length >= 3 && !isPointInPolygon(lat, lng, boundary)) {
        geoStatus = 'OUTSIDE_WARD';
      }
    }

    // Bulk create attendance records
    const attendanceRecords = await WorkerAttendance.bulkCreate(
      workersToMark.map(worker => ({
        worker_id: worker.id,
        supervisor_id: user.id,
        ward_id: supervisorWardId,
        eo_id: worker.eo_id || supervisor.eo_id || null,
        ulb_id: supervisor.ulb_id,
        attendance_date: today,
        checkin_time: timestamp,
        latitude: lat,
        longitude: lng,
        geo_status: geoStatus
      }))
    );

    res.json({
      success: true,
      message: `Marked ${attendanceRecords.length} workers as present`,
      data: {
        marked: attendanceRecords.length,
        already_marked: existingWorkerIds.size,
        total_workers: workers.length
      }
    });
  } catch (error) {
    console.error('markAllWorkersPresent error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark all workers present', error: error.message });
  }
};

/**
 * @route   GET /api/attendance/worker/reports
 * @desc    Get worker attendance reports grouped by ULB
 * @access  Private (Admin, Assessor, EO)
 */
export const getWorkerAttendanceReports = async (req, res, next) => {
  try {
    const user = req.user;
    const { dateFrom, dateTo, ulb_id } = req.query;

    // Build where clause
    const where = {};

    // Apply ULB filter based on user role
    if (user.role === 'eo' && user.ulb_id) {
      // EO can only see their own ULB's attendance
      where.ulb_id = user.ulb_id;
    } else if (ulb_id) {
      // Admin/Assessor can filter by specific ULB
      where.ulb_id = ulb_id;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.attendance_date = {};
      if (dateFrom) {
        where.attendance_date[Op.gte] = dateFrom;
      }
      if (dateTo) {
        where.attendance_date[Op.lte] = dateTo;
      }
    }

    // Fetch attendance records with ULB information
    const attendanceRecords = await WorkerAttendance.findAll({
      where,
      include: [
        {
          model: ULB,
          as: 'ulb',
          attributes: ['id', 'name', 'state', 'district'],
          required: false
        },
        {
          model: Worker,
          as: 'worker',
          attributes: ['id', 'full_name', 'mobile', 'worker_type'],
          required: false
        },
        {
          model: Ward,
          as: 'ward',
          attributes: ['id', 'wardNumber', 'wardName'],
          required: false
        }
      ],
      order: [['attendance_date', 'DESC'], ['checkin_time', 'DESC']]
    });

    // Group by ULB
    const ulbGroups = {};
    
    attendanceRecords.forEach(record => {
      const ulbId = record.ulb_id || 'unassigned';
      const ulbName = record.ulb?.name || 'Unassigned ULB';
      
      if (!ulbGroups[ulbId]) {
        ulbGroups[ulbId] = {
          ulb_id: ulbId,
          ulb_name: ulbName,
          total_records: 0,
          total_workers: new Set(),
          present_count: 0,
          geo_violations: 0,
          ward_wise: {},
          records: []
        };
      }

      const group = ulbGroups[ulbId];
      group.total_records++;
      group.total_workers.add(record.worker_id);
      
      if (record.geo_status === 'OUTSIDE_WARD') {
        group.geo_violations++;
      }

      // Group by ward
      const wardId = record.ward_id;
      if (!group.ward_wise[wardId]) {
        group.ward_wise[wardId] = {
          ward_id: wardId,
          ward_name: record.ward ? `${record.ward.wardNumber} - ${record.ward.wardName}` : `Ward ${wardId}`,
          total_records: 0,
          workers: new Set()
        };
      }
      group.ward_wise[wardId].total_records++;
      group.ward_wise[wardId].workers.add(record.worker_id);

      group.records.push({
        id: record.id,
        worker_id: record.worker_id,
        worker_name: record.worker?.full_name || 'Unknown',
        worker_mobile: record.worker?.mobile || null,
        worker_type: record.worker?.worker_type || null,
        ward_id: record.ward_id,
        ward_name: record.ward ? `${record.ward.wardNumber} - ${record.ward.wardName}` : null,
        supervisor_id: record.supervisor_id,
        eo_id: record.eo_id,
        attendance_date: record.attendance_date,
        checkin_time: record.checkin_time,
        geo_status: record.geo_status,
        latitude: record.latitude,
        longitude: record.longitude
      });
    });

    // Convert Sets to counts and format ward_wise data
    const formattedGroups = Object.values(ulbGroups).map(group => ({
      ulb_id: group.ulb_id,
      ulb_name: group.ulb_name,
      total_records: group.total_records,
      total_workers: group.total_workers.size,
      present_count: group.total_workers.size, // Each unique worker is present
      geo_violations: group.geo_violations,
      attendance_percentage: group.total_workers.size > 0 
        ? Math.round((group.total_workers.size / group.total_workers.size) * 100) 
        : 0,
      ward_wise: Object.values(group.ward_wise).map(ward => ({
        ward_id: ward.ward_id,
        ward_name: ward.ward_name,
        total_records: ward.total_records,
        total_workers: ward.workers.size
      })),
      records: group.records
    }));

    res.json({
      success: true,
      data: {
        summary: {
          total_ulbs: formattedGroups.length,
          total_records: attendanceRecords.length,
          total_workers: new Set(attendanceRecords.map(r => r.worker_id)).size,
          total_geo_violations: attendanceRecords.filter(r => r.geo_status === 'OUTSIDE_WARD').length
        },
        ulb_wise: formattedGroups
      }
    });
  } catch (error) {
    console.error('getWorkerAttendanceReports error:', error);
    next(error);
  }
};
