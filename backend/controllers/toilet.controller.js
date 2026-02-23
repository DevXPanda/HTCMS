import { ToiletFacility, ToiletInspection, ToiletMaintenance, ToiletComplaint, ToiletStaffAssignment, User, Ward, AdminManagement } from '../models/index.js';
import { Op } from 'sequelize';
import { auditLogger } from '../utils/auditLogger.js';

/**
 * @route   GET /api/toilet/facilities
 * @desc    Get all toilet facilities (with filters)
 * @access  Private
 */
export const getAllFacilities = async (req, res, next) => {
    try {
        const { wardId, type, status, search, page = 1, limit = 10 } = req.query;

        const where = {};
        if (wardId) where.wardId = wardId;
        if (type) where.type = type;
        if (status) where.status = status;

        if (search) {
            where[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { location: { [Op.iLike]: `%${search}%` } },
                { contactPerson: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows } = await ToiletFacility.findAndCountAll({
            where,
            include: [
                { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] }
            ],
            limit: parseInt(limit),
            offset,
            order: [['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            data: {
                facilities: rows,
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
 * @route   GET /api/toilet/facilities/:id
 * @desc    Get toilet facility by ID
 * @access  Private
 */
export const getFacilityById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const facility = await ToiletFacility.findByPk(id, {
            include: [
                { model: Ward, as: 'ward' },
                { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName'] },
                { model: ToiletInspection, as: 'inspections', limit: 5, order: [['inspectionDate', 'DESC']] },
                { model: ToiletMaintenance, as: 'maintenanceRecords', limit: 5, order: [['scheduledDate', 'DESC']] },
                { model: ToiletComplaint, as: 'complaints', limit: 5, order: [['createdAt', 'DESC']] }
            ]
        });

        if (!facility) {
            return res.status(404).json({
                success: false,
                message: 'Toilet facility not found'
            });
        }

        res.json({
            success: true,
            data: { facility }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/toilet/facilities
 * @desc    Create new toilet facility
 * @access  Private (Admin)
 */
export const createFacility = async (req, res, next) => {
    try {
        const facility = await ToiletFacility.create({
            ...req.body,
            createdBy: req.user.id
        });

        await auditLogger.logCreate(
            req,
            req.user,
            'ToiletFacility',
            facility.id,
            { name: facility.name, wardId: facility.wardId },
            `Created toilet facility: ${facility.name}`
        );

        res.status(201).json({
            success: true,
            message: 'Toilet facility created successfully',
            data: { facility }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/toilet/facilities/:id
 * @desc    Update toilet facility
 * @access  Private (Admin)
 */
export const updateFacility = async (req, res, next) => {
    try {
        const { id } = req.params;
        const facility = await ToiletFacility.findByPk(id);

        if (!facility) {
            return res.status(404).json({
                success: false,
                message: 'Toilet facility not found'
            });
        }

        const previousData = facility.toJSON();
        await facility.update(req.body);

        await auditLogger.logUpdate(
            req,
            req.user,
            'ToiletFacility',
            facility.id,
            previousData,
            facility.toJSON(),
            `Updated toilet facility: ${facility.name}`
        );

        res.json({
            success: true,
            message: 'Toilet facility updated successfully',
            data: { facility }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   DELETE /api/toilet/facilities/:id
 * @desc    Delete toilet facility (deactivate)
 * @access  Private (Admin)
 */
export const deleteFacility = async (req, res, next) => {
    try {
        const { id } = req.params;
        const facility = await ToiletFacility.findByPk(id);

        if (!facility) {
            return res.status(404).json({
                success: false,
                message: 'Toilet facility not found'
            });
        }

        const previousData = facility.toJSON();
        facility.status = 'inactive';
        await facility.save();

        await auditLogger.logDelete(
            req,
            req.user,
            'ToiletFacility',
            facility.id,
            previousData,
            `Deactivated toilet facility: ${facility.name}`
        );

        res.json({
            success: true,
            message: 'Toilet facility deactivated successfully'
        });
    } catch (error) {
        next(error);
    }
};

// --- Inspections ---

export const getAllInspections = async (req, res, next) => {
    try {
        const { facilityId, inspectorId, status, page = 1, limit = 10 } = req.query;
        const where = {};
        if (facilityId) where.toiletFacilityId = facilityId;
        if (inspectorId) where.inspectorId = inspectorId;
        if (status) where.status = status;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const { count, rows } = await ToiletInspection.findAndCountAll({
            where,
            include: [
                { model: ToiletFacility, as: 'facility', attributes: ['id', 'name'] },
                { model: User, as: 'inspector', attributes: ['id', 'firstName', 'lastName'] }
            ],
            limit: parseInt(limit),
            offset,
            order: [['inspectionDate', 'DESC']]
        });

        res.json({
            success: true,
            data: { inspections: rows, pagination: { total: count, page, limit, pages: Math.ceil(count / limit) } }
        });
    } catch (error) {
        next(error);
    }
};

export const createInspection = async (req, res, next) => {
    try {
        const inspection = await ToiletInspection.create({
            ...req.body,
            inspectorId: req.user.id
        });
        res.status(201).json({ success: true, data: { inspection } });
    } catch (error) {
        next(error);
    }
};

// --- Maintenance ---

export const getAllMaintenanceRecords = async (req, res, next) => {
    try {
        const { facilityId, status, priority, page = 1, limit = 10 } = req.query;
        const where = {};
        if (facilityId) where.toiletFacilityId = facilityId;
        if (status) where.status = status;
        if (priority) where.priority = priority;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const { count, rows } = await ToiletMaintenance.findAndCountAll({
            where,
            include: [
                { model: ToiletFacility, as: 'facility', attributes: ['id', 'name'] },
                { model: AdminManagement, as: 'staff', attributes: ['id', 'full_name'] }
            ],
            limit: parseInt(limit),
            offset,
            order: [['scheduledDate', 'DESC']]
        });

        res.json({
            success: true,
            data: { maintenanceRecords: rows, pagination: { total: count, page, limit, pages: Math.ceil(count / limit) } }
        });
    } catch (error) {
        next(error);
    }
};

export const createMaintenanceRecord = async (req, res, next) => {
    try {
        const maintenance = await ToiletMaintenance.create(req.body);
        res.status(201).json({ success: true, data: { maintenance } });
    } catch (error) {
        next(error);
    }
};

// --- Complaints ---

export const getAllComplaints = async (req, res, next) => {
    try {
        const { facilityId, status, priority, page = 1, limit = 10 } = req.query;
        const where = {};
        if (facilityId) where.toiletFacilityId = facilityId;
        if (status) where.status = status;
        if (priority) where.priority = priority;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const { count, rows } = await ToiletComplaint.findAndCountAll({
            where,
            include: [
                { model: ToiletFacility, as: 'facility', attributes: ['id', 'name'] },
                { model: AdminManagement, as: 'assignee', attributes: ['id', 'full_name'] }
            ],
            limit: parseInt(limit),
            offset,
            order: [['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            data: { complaints: rows, pagination: { total: count, page, limit, pages: Math.ceil(count / limit) } }
        });
    } catch (error) {
        next(error);
    }
};

export const createComplaint = async (req, res, next) => {
    try {
        const complaint = await ToiletComplaint.create(req.body);
        res.status(201).json({ success: true, data: { complaint } });
    } catch (error) {
        next(error);
    }
};

export const updateComplaint = async (req, res, next) => {
    try {
        const { id } = req.params;
        const complaint = await ToiletComplaint.findByPk(id);
        if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
        await complaint.update(req.body);
        res.json({ success: true, data: { complaint } });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/toilet/reports/stats
 * @desc    Get aggregated statistics for reports
 * @access  Private
 */
export const getReports = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const dateFilter = {};
        if (startDate && endDate) {
            dateFilter.createdAt = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        const [
            totalFacilities,
            activeFacilities,
            maintenanceFacilities,
            totalInspections,
            passedInspections,
            totalComplaints,
            resolvedComplaints,
            totalMaintenance,
            completedMaintenance
        ] = await Promise.all([
            ToiletFacility.count(),
            ToiletFacility.count({ where: { status: 'active' } }),
            ToiletFacility.count({ where: { status: 'maintenance' } }),
            ToiletInspection.count({ where: dateFilter }),
            ToiletInspection.count({ where: { ...dateFilter, cleanliness: 'Good' } }), // Assuming Good/Fair/Poor
            ToiletComplaint.count({ where: dateFilter }),
            ToiletComplaint.count({ where: { ...dateFilter, status: 'resolved' } }),
            ToiletMaintenance.count({ where: dateFilter }),
            ToiletMaintenance.count({ where: { ...dateFilter, status: 'completed' } })
        ]);

        res.json({
            success: true,
            data: {
                totalFacilities,
                activeFacilities,
                maintenanceFacilities,
                totalInspections,
                passedInspections,
                failedInspections: totalInspections - passedInspections,
                totalComplaints,
                pendingComplaints: totalComplaints - resolvedComplaints,
                resolvedComplaints,
                totalMaintenance,
                completedMaintenance,
                scheduledMaintenance: totalMaintenance - completedMaintenance
            }
        });
    } catch (error) {
        next(error);
    }
};
