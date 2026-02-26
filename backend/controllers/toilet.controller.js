import { ToiletFacility, ToiletInspection, ToiletMaintenance, ToiletComplaint, ToiletStaffAssignment, User, Ward, AdminManagement, Worker } from '../models/index.js';
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
                { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] },
                {
                    model: ToiletStaffAssignment,
                    as: 'staffAssignments',
                    where: { isActive: true },
                    required: false
                }
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

        if (!id || id === 'undefined' || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid facility ID'
            });
        }

        const facility = await ToiletFacility.findByPk(id, {
            include: [
                { model: Ward, as: 'ward' },
                { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName'] },
                {
                    model: ToiletInspection,
                    as: 'inspections',
                    include: [{ model: AdminManagement, as: 'inspector', attributes: ['id', 'full_name'] }],
                    limit: 5,
                    order: [['inspectionDate', 'DESC']]
                },
                { model: ToiletMaintenance, as: 'maintenanceRecords', limit: 5, order: [['scheduledDate', 'DESC']] },
                { model: ToiletComplaint, as: 'complaints', limit: 5, order: [['createdAt', 'DESC']] },
                {
                    model: ToiletStaffAssignment,
                    as: 'staffAssignments',
                    include: [{ model: AdminManagement, as: 'staff', attributes: ['id', 'full_name', 'role'] }]
                }
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

// --- Staff Assignments ---

export const getFacilityStaff = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!id || id === 'undefined' || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid facility ID'
            });
        }

        const assignments = await ToiletStaffAssignment.findAll({
            where: {
                toiletFacilityId: id,
                isActive: true
            },
            include: [
                {
                    model: AdminManagement,
                    as: 'staff',
                    attributes: ['id', 'full_name', 'employee_id', 'role']
                }
            ],
            order: [['assignedDate', 'DESC']]
        });

        res.json({
            success: true,
            data: { assignments }
        });
    } catch (error) {
        next(error);
    }
};

export const assignStaff = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!id || id === 'undefined' || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid facility ID'
            });
        }

        const { staffId, role, shift } = req.body;

        // Check if already assigned and active
        const existing = await ToiletStaffAssignment.findOne({
            where: {
                toiletFacilityId: id,
                staffId,
                isActive: true
            }
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Staff member is already assigned to this facility'
            });
        }

        const assignment = await ToiletStaffAssignment.create({
            toiletFacilityId: id,
            staffId,
            role,
            shift,
            assignedDate: new Date(),
            isActive: true
        });

        // Audit Log
        await auditLogger.createAuditLog({
            req,
            user: req.user,
            actionType: 'ASSIGN',
            entityType: 'ToiletFacility',
            entityId: id,
            description: `Assigned staff ID ${staffId} as ${role} for ${shift} shift`,
            metadata: { assignmentId: assignment.id, staffId, role, shift }
        });

        res.status(201).json({
            success: true,
            message: 'Staff assigned successfully',
            data: { assignment }
        });
    } catch (error) {
        next(error);
    }
};

export const removeStaffAssignment = async (req, res, next) => {
    try {
        const { id, assignmentId } = req.params;

        if (!id || id === 'undefined' || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid facility ID'
            });
        }

        const assignment = await ToiletStaffAssignment.findOne({
            where: {
                id: assignmentId,
                toiletFacilityId: id
            }
        });

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: 'Assignment not found'
            });
        }

        // Soft delete/Deactivate
        await assignment.update({
            isActive: false,
            unassignedDate: new Date()
        });

        // Audit Log
        await auditLogger.createAuditLog({
            req,
            user: req.user,
            actionType: 'DELETE',
            entityType: 'ToiletFacility',
            entityId: id,
            description: `Removed staff assignment ID ${assignmentId}`,
            metadata: { assignmentId, staffId: assignment.staffId }
        });

        res.json({
            success: true,
            message: 'Staff assignment removed successfully'
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
        // Extract ulb_id from request (added by ulbFilter) or from the user
        const ulb_id = req.ulbFilter?.ulb_id || req.user.ulb_id;

        const facility = await ToiletFacility.create({
            ...req.body,
            createdBy: req.user.id,
            ulb_id
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

        if (!id || id === 'undefined' || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid facility ID'
            });
        }

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

        if (!id || id === 'undefined' || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid facility ID'
            });
        }

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

        const { count, rows } = await ToiletInspection.findAndCountAll({
            where,
            include: [
                { model: ToiletFacility, as: 'facility', attributes: ['id', 'name'] },
                { model: AdminManagement, as: 'inspector', attributes: ['id', 'full_name'] }
            ],
            order: [['inspectionDate', 'DESC']]
        });

        res.json({
            success: true,
            data: { inspections: rows, total: count }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all staff with INSPECTOR role
 */
export const getInspectors = async (req, res, next) => {
    try {
        const inspectors = await AdminManagement.findAll({
            where: {
                role: 'INSPECTOR',
                status: 'active'
            },
            attributes: ['id', 'full_name'],
            order: [['full_name', 'ASC']]
        });

        res.json({
            success: true,
            data: { inspectors }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all staff with SUPERVISOR role
 */
export const getSupervisors = async (req, res, next) => {
    try {
        const supervisors = await AdminManagement.findAll({
            where: {
                role: 'SUPERVISOR',
                status: 'active'
            },
            attributes: ['id', 'full_name'],
            order: [['full_name', 'ASC']]
        });

        res.json({
            success: true,
            data: { supervisors }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get toilet inspection by ID
 */
export const getInspectionById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const inspection = await ToiletInspection.findByPk(id, {
            include: [
                { model: ToiletFacility, as: 'facility' },
                { model: AdminManagement, as: 'inspector', attributes: ['id', 'full_name', 'role'] }
            ]
        });

        if (!inspection) {
            return res.status(404).json({
                success: false,
                message: 'Toilet inspection not found'
            });
        }

        res.json({
            success: true,
            data: { inspection }
        });
    } catch (error) {
        next(error);
    }
};

export const createInspection = async (req, res, next) => {
    try {
        const { inspectorId, ...otherData } = req.body;

        // Validation: inspectorId is mandatory
        if (!inspectorId) {
            return res.status(400).json({
                success: false,
                message: 'Inspector selection is mandatory.'
            });
        }

        const numericInspectorId = Number(inspectorId);


        const inspection = await ToiletInspection.create({
            ...otherData,
            inspectorId: numericInspectorId
        });

        res.status(201).json({ success: true, data: { inspection } });
    } catch (error) {
        console.error('[ERROR] createInspection failed:', error);
        next(error);
    }
};

/**
 * Update toilet inspection
 */
export const updateInspection = async (req, res, next) => {
    try {
        const { id } = req.params;
        const inspection = await ToiletInspection.findByPk(id);

        if (!inspection) {
            return res.status(404).json({
                success: false,
                message: 'Toilet inspection not found'
            });
        }

        const { inspectorId, ...otherData } = req.body;

        await inspection.update({
            ...otherData,
            inspectorId: inspectorId ? Number(inspectorId) : inspection.inspectorId
        });

        res.json({
            success: true,
            message: 'Inspection updated successfully',
            data: { inspection }
        });
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

        const { count, rows } = await ToiletMaintenance.findAndCountAll({
            where,
            include: [
                { model: ToiletFacility, as: 'facility', attributes: ['id', 'name'] },
                { model: AdminManagement, as: 'staff', attributes: ['id', 'full_name'] }
            ],
            order: [['scheduledDate', 'DESC']]
        });

        res.json({
            success: true,
            data: { maintenanceRecords: rows, total: count }
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

export const getMaintenanceRecordById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const maintenanceRecord = await ToiletMaintenance.findByPk(id, {
            include: [
                { model: ToiletFacility, as: 'facility', attributes: ['id', 'name'] },
                { model: AdminManagement, as: 'staff', attributes: ['id', 'full_name'] }
            ]
        });

        if (!maintenanceRecord) {
            return res.status(404).json({
                success: false,
                message: 'Maintenance record not found'
            });
        }

        res.json({
            success: true,
            data: { maintenanceRecord }
        });
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

        const { rows, count } = await ToiletComplaint.findAndCountAll({
            where,
            include: [
                { model: ToiletFacility, as: 'facility', attributes: ['id', 'name'] },
                { model: AdminManagement, as: 'assignee', attributes: ['id', 'full_name'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            data: { complaints: rows, total: count }
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

export const getComplaintById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const complaint = await ToiletComplaint.findByPk(id, {
            include: [
                { model: ToiletFacility, as: 'facility' },
                { model: AdminManagement, as: 'assignee', attributes: ['id', 'full_name', 'role'] },
                { model: Worker, as: 'worker', attributes: ['id', 'full_name', 'employee_code'] }
            ]
        });

        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        res.json({
            success: true,
            data: { complaint }
        });
    } catch (error) {
        next(error);
    }
};

export const updateComplaint = async (req, res, next) => {
    try {
        const { id } = req.params;
        const complaint = await ToiletComplaint.findByPk(id);

        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        const updateData = { ...req.body };

        // Normalize status and priority if they exist
        if (updateData.status) updateData.status = updateData.status.toLowerCase();
        if (updateData.priority) updateData.priority = updateData.priority.toLowerCase();

        // Handle specific business logic for resolution
        if (updateData.status === 'resolved' && complaint.status !== 'resolved') {
            updateData.resolvedAt = new Date();
        }

        await complaint.update(updateData);

        res.json({
            success: true,
            message: 'Complaint updated successfully',
            data: { complaint }
        });
    } catch (error) {
        next(error);
    }
};

export const deleteComplaint = async (req, res, next) => {
    try {
        const { id } = req.params;
        const complaint = await ToiletComplaint.findByPk(id);

        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        await complaint.destroy();

        res.json({
            success: true,
            message: 'Complaint deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

export const getCitizenComplaints = async (req, res, next) => {
    try {
        const { email, phone } = req.query; // Citizen history by contact
        const where = {};
        if (email) where.citizenEmail = email;
        if (phone) where.citizenPhone = phone;

        if (!email && !phone) {
            return res.status(400).json({ success: false, message: 'Contact info required' });
        }

        const complaints = await ToiletComplaint.findAll({
            where,
            include: [{ model: ToiletFacility, as: 'facility', attributes: ['name'] }],
            order: [['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            data: { complaints }
        });
    } catch (error) {
        next(error);
    }
};

export const getAssignedComplaints = async (req, res, next) => {
    try {
        const { supervisorId } = req.params;
        const complaints = await ToiletComplaint.findAll({
            where: { assignedTo: supervisorId },
            include: [
                { model: ToiletFacility, as: 'facility' },
                { model: Worker, as: 'worker', attributes: ['id', 'full_name', 'employee_code'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            data: { complaints }
        });
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
