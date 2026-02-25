import { PropertyApplication, WaterConnectionRequest, AuditLog, User, Property, WaterConnectionDocument, Ward, AdminManagement } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * @route   GET /api/clerk/dashboard
 * @desc    Get clerk dashboard statistics
 * @access  Private (Clerk only)
 */
export const getClerkDashboard = async (req, res, next) => {
    try {
        const user = req.user;

        // Get clerk's assigned wards
        let assignedWards = [];
        let clerkWardIds = user.ward_ids || user.dataValues?.ward_ids;

        // Fallback: If not in JWT, fetch from database
        if (!clerkWardIds || (Array.isArray(clerkWardIds) && clerkWardIds.length === 0)) {
            try {
                const clerkRecord = await AdminManagement.findByPk(user.id, {
                    attributes: ['id', 'ward_ids']
                });
                if (clerkRecord && clerkRecord.ward_ids) {
                    clerkWardIds = clerkRecord.ward_ids;
                } else {
                    // Also check Ward table for clerkId assignment
                    const wardsFromDB = await Ward.findAll({
                        where: { clerkId: user.id, isActive: true },
                        attributes: ['id', 'wardNumber', 'wardName']
                    });
                    if (wardsFromDB.length > 0) {
                        clerkWardIds = wardsFromDB.map(w => w.id);
                        assignedWards = wardsFromDB;
                    }
                }
            } catch (dbError) {
                console.error(`[getClerkDashboard] Error fetching clerk wards:`, dbError.message);
            }
        }

        // Fetch full ward details if we have ward IDs
        if (clerkWardIds && assignedWards.length === 0) {
            const wardIdsArray = Array.isArray(clerkWardIds) ? clerkWardIds : [clerkWardIds];
            assignedWards = await Ward.findAll({
                where: {
                    id: { [Op.in]: wardIdsArray },
                    isActive: true
                },
                attributes: ['id', 'wardNumber', 'wardName'],
                order: [['wardNumber', 'ASC']]
            });
        }



        // Count property applications by status (created by this clerk)
        const propertyApplicationStats = await PropertyApplication.findAll({
            where: { createdBy: user.id },
            attributes: [
                'status',
                [PropertyApplication.sequelize.fn('COUNT', PropertyApplication.sequelize.col('id')), 'count']
            ],
            group: ['status'],
            raw: true
        });

        // Count water connection requests by status (filtered by clerk's assigned wards)
        const waterApplicationStats = await WaterConnectionRequest.findAll({
            attributes: [
                'status',
                [WaterConnectionRequest.sequelize.fn('COUNT', WaterConnectionRequest.sequelize.col('WaterConnectionRequest.id')), 'count']
            ],
            include: [{
                model: Property,
                as: 'property',
                where: clerkWardIds && (Array.isArray(clerkWardIds) ? clerkWardIds.length > 0 : clerkWardIds)
                    ? { wardId: { [Op.in]: Array.isArray(clerkWardIds) ? clerkWardIds : [clerkWardIds] } }
                    : {},
                required: true,
                attributes: []
            }],
            group: ['status'],
            raw: true
        });

        // Convert to objects for easy access
        const propertyStats = propertyApplicationStats.reduce((acc, item) => {
            acc[item.status] = parseInt(item.count);
            return acc;
        }, {});

        const waterStats = waterApplicationStats.reduce((acc, item) => {
            acc[item.status] = parseInt(item.count);
            return acc;
        }, {});

        // Get total counts
        const totalPropertyApplications = await PropertyApplication.count({
            where: { createdBy: user.id }
        });

        // Filter water applications by clerk's assigned wards
        const totalWaterApplications = await WaterConnectionRequest.count({
            include: [{
                model: Property,
                as: 'property',
                where: clerkWardIds && (Array.isArray(clerkWardIds) ? clerkWardIds.length > 0 : clerkWardIds)
                    ? { wardId: { [Op.in]: Array.isArray(clerkWardIds) ? clerkWardIds : [clerkWardIds] } }
                    : {},
                required: true
            }]
        });

        // Get returned applications (requiring action)
        const returnedPropertyApplications = await PropertyApplication.count({
            where: {
                createdBy: user.id,
                status: 'RETURNED'
            }
        });

        // Filter returned water applications by clerk's assigned wards
        const returnedWaterApplications = await WaterConnectionRequest.count({
            where: {
                status: 'RETURNED'
            },
            include: [{
                model: Property,
                as: 'property',
                where: clerkWardIds && (Array.isArray(clerkWardIds) ? clerkWardIds.length > 0 : clerkWardIds)
                    ? { wardId: { [Op.in]: Array.isArray(clerkWardIds) ? clerkWardIds : [clerkWardIds] } }
                    : {},
                required: true
            }]
        });

        // Get recent activity (audit logs for this clerk)
        // Note: PropertyApplication and WaterConnectionRequest need to be added to audit_entity_type enum
        // For now, return empty array to avoid enum errors
        const recentActivity = [];

        // Get pending approvals count (SUBMITTED + UNDER_INSPECTION)
        const pendingPropertyApprovals = await PropertyApplication.count({
            where: {
                createdBy: user.id,
                status: {
                    [Op.in]: ['SUBMITTED', 'UNDER_INSPECTION']
                }
            }
        });

        // Filter pending water approvals by clerk's assigned wards
        const pendingWaterApprovals = await WaterConnectionRequest.count({
            where: {
                status: {
                    [Op.in]: ['SUBMITTED', 'UNDER_INSPECTION']
                }
            },
            include: [{
                model: Property,
                as: 'property',
                where: clerkWardIds && (Array.isArray(clerkWardIds) ? clerkWardIds.length > 0 : clerkWardIds)
                    ? { wardId: { [Op.in]: Array.isArray(clerkWardIds) ? clerkWardIds : [clerkWardIds] } }
                    : {},
                required: true
            }]
        });

        res.json({
            success: true,
            data: {
                assignedWards: assignedWards.map(w => ({
                    id: w.id,
                    wardName: w.wardName,
                    wardNumber: w.wardNumber
                })),
                propertyApplications: {
                    total: totalPropertyApplications,
                    byStatus: {
                        draft: propertyStats.DRAFT || 0,
                        submitted: propertyStats.SUBMITTED || 0,
                        underInspection: propertyStats.UNDER_INSPECTION || 0,
                        approved: propertyStats.APPROVED || 0,
                        rejected: propertyStats.REJECTED || 0,
                        returned: propertyStats.RETURNED || 0
                    },
                    pendingApprovals: pendingPropertyApprovals,
                    requiresAction: returnedPropertyApplications
                },
                waterApplications: {
                    total: totalWaterApplications,
                    byStatus: {
                        draft: waterStats.DRAFT || 0,
                        submitted: waterStats.SUBMITTED || 0,
                        underInspection: waterStats.UNDER_INSPECTION || 0,
                        approved: waterStats.APPROVED || 0,
                        rejected: waterStats.REJECTED || 0,
                        returned: waterStats.RETURNED || 0,
                        completed: waterStats.COMPLETED || 0
                    },
                    pendingApprovals: pendingWaterApprovals,
                    requiresAction: returnedWaterApplications
                },
                totalApplications: totalPropertyApplications + totalWaterApplications,
                totalReturned: returnedPropertyApplications + returnedWaterApplications,
                recentActivity
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/clerk/water-connection-requests
 * @desc    Get all water connection requests for clerk
 * @access  Private (Clerk only)
 */
export const getWaterApplications = async (req, res, next) => {
    try {
        const { status } = req.query;

        // Build where clause - clerks should see only their assigned ward's requests
        const whereClause = req.wardFilter ? { ...req.wardFilter } : {};
        if (status && status !== 'ALL') {
            whereClause.status = status;
        }
        // If no status or ALL, don't filter by status, but always filter by ward


        const requests = await WaterConnectionRequest.findAll({
            where: whereClause,
            include: [
                {
                    model: Property,
                    as: 'property',
                    attributes: ['id', 'propertyNumber', 'address']
                },
                {
                    model: User,
                    as: 'requester',
                    attributes: ['id', 'firstName', 'lastName', 'email']
                },
                {
                    model: WaterConnectionDocument,
                    as: 'documents',
                    required: false
                }
            ],
            order: [['createdAt', 'DESC']]
        });



        res.json({
            success: true,
            data: { requests }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/clerk/water-connection-requests/:id
 * @desc    Get water connection request by ID
 * @access  Private (Clerk only)
 */
export const getWaterApplicationById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const request = await WaterConnectionRequest.findOne({
            where: { id },
            include: [
                {
                    model: Property,
                    as: 'property',
                    attributes: ['id', 'propertyNumber', 'address']
                },
                {
                    model: User,
                    as: 'requester',
                    attributes: ['id', 'firstName', 'lastName', 'email']
                },
                {
                    model: WaterConnectionDocument,
                    as: 'documents',
                    required: false
                }
            ]
        });

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Water connection request not found'
            });
        }

        res.json({
            success: true,
            data: { request }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/clerk/water-connection-requests
 * @desc    Create new water connection request
 * @access  Private (Clerk only)
 */
export const createWaterApplication = async (req, res, next) => {
    try {
        const user = req.user;
        const { propertyId, propertyLocation, connectionType, remarks } = req.body;

        // Validate required fields
        if (!propertyId || !propertyLocation || !connectionType) {
            return res.status(400).json({
                success: false,
                message: 'Please provide propertyId, propertyLocation, and connectionType'
            });
        }

        // Validate connectionType
        const validTypes = ['domestic', 'commercial', 'industrial'];
        if (!validTypes.includes(connectionType)) {
            return res.status(400).json({
                success: false,
                message: `Invalid connectionType. Must be one of: ${validTypes.join(', ')}`
            });
        }

        // Verify property exists
        const property = await Property.findByPk(propertyId);
        if (!property) {
            return res.status(404).json({
                success: false,
                message: 'Property not found'
            });
        }

        // Generate request number
        const requestCount = await WaterConnectionRequest.count();
        const requestNumber = `WCR-${String(requestCount + 1).padStart(6, '0')}`;

        // Create request
        const request = await WaterConnectionRequest.create({
            requestNumber,
            propertyId,
            requestedBy: property.ownerId, // Property owner is the requester
            propertyLocation,
            connectionType,
            remarks: remarks || null,
            status: 'DRAFT',
            createdBy: user.id
        });

        // Fetch with relations
        const requestWithDetails = await WaterConnectionRequest.findByPk(request.id, {
            include: [
                {
                    model: Property,
                    as: 'property',
                    attributes: ['id', 'propertyNumber', 'address']
                },
                {
                    model: User,
                    as: 'requester',
                    attributes: ['id', 'firstName', 'lastName', 'email']
                }
            ]
        });

        res.status(201).json({
            success: true,
            message: 'Water connection request created successfully',
            data: { request: requestWithDetails }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/clerk/water-connection-requests/:id
 * @desc    Update water connection request
 * @access  Private (Clerk only)
 */
export const updateWaterApplication = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const { propertyLocation, connectionType, remarks } = req.body;

        const request = await WaterConnectionRequest.findOne({
            where: {
                id,
                status: { [Op.in]: ['DRAFT', 'RETURNED'] }
            }
        });

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Water connection request not found or cannot be edited'
            });
        }

        // Validate connectionType if provided
        if (connectionType) {
            const validTypes = ['domestic', 'commercial', 'industrial'];
            if (!validTypes.includes(connectionType)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid connectionType. Must be one of: ${validTypes.join(', ')}`
                });
            }
        }

        // Update request
        await request.update({
            ...(propertyLocation && { propertyLocation }),
            ...(connectionType && { connectionType }),
            ...(remarks !== undefined && { remarks })
        });

        // Fetch updated request with relations
        const updatedRequest = await WaterConnectionRequest.findByPk(request.id, {
            include: [
                {
                    model: Property,
                    as: 'property',
                    attributes: ['id', 'propertyNumber', 'address']
                },
                {
                    model: User,
                    as: 'requester',
                    attributes: ['id', 'firstName', 'lastName', 'email']
                }
            ]
        });

        res.json({
            success: true,
            message: 'Water connection request updated successfully',
            data: { request: updatedRequest }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/clerk/water-connection-requests/:id/submit
 * @desc    Submit water connection request for inspection
 * @access  Private (Clerk only)
 */
export const submitWaterApplication = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const request = await WaterConnectionRequest.findOne({
            where: {
                id,
                status: { [Op.in]: ['DRAFT', 'RETURNED'] }
            }
        });

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Water connection request not found or cannot be submitted'
            });
        }

        // Update status to SUBMITTED
        await request.update({
            status: 'SUBMITTED',
            submittedAt: new Date()
        });

        res.json({
            success: true,
            message: 'Water connection request submitted successfully',
            data: { request }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/clerk/water-connection-requests/:id/process
 * @desc    Process water connection request (forward to inspector)
 * @access  Private (Clerk only)
 */
export const processWaterApplication = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const { action, remarks } = req.body; // action: 'forward' or 'reject'

        const request = await WaterConnectionRequest.findOne({
            where: {
                id,
                status: 'SUBMITTED'
            }
        });

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Water connection request not found or cannot be processed'
            });
        }

        let newStatus;
        if (action === 'forward') {
            newStatus = 'UNDER_INSPECTION';
        } else if (action === 'reject') {
            newStatus = 'REJECTED';
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid action. Must be "forward" or "reject"'
            });
        }

        // Update request
        // Note: processedBy references 'users' table, but Clerk is in 'admin_management' table
        // So we don't set processedBy for staff users to avoid foreign key constraint violation
        await request.update({
            status: newStatus,
            adminRemarks: remarks || null,
            // processedBy: user.id, // Skip this - causes FK violation for staff users
            processedAt: new Date()
        });

        res.json({
            success: true,
            message: `Water connection request ${action}ed successfully`,
            data: { request }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   DELETE /api/clerk/water-connection-requests/:id
 * @desc    Delete water connection request
 * @access  Private (Clerk only)
 */
export const deleteWaterApplication = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const request = await WaterConnectionRequest.findOne({
            where: {
                id,
                status: { [Op.in]: ['DRAFT', 'RETURNED'] }
            }
        });

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Water connection request not found or cannot be deleted'
            });
        }

        await request.destroy();

        res.json({
            success: true,
            message: 'Water connection request deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/clerk/water-connections
 * @desc    Get existing water connections for clerk's assigned ward
 * @access  Private (Clerk only)
 */
export const getExistingWaterConnections = async (req, res, next) => {
    try {
        const { search, propertyId, wardId } = req.query;
        const { WaterConnection, Ward } = await import('../models/index.js');

        // Build where clause with ward filtering
        const whereClause = {};

        // If specific propertyId is provided, use it
        if (propertyId) {
            whereClause.propertyId = propertyId;
        }

        // If search term provided
        if (search) {
            whereClause[Op.or] = [
                { connectionNumber: { [Op.like]: `%${search}%` } },
                { meterNumber: { [Op.like]: `%${search}%` } }
            ];
        }

        const connections = await WaterConnection.findAll({
            where: whereClause,
            include: [
                {
                    model: Property,
                    as: 'property',
                    attributes: ['id', 'propertyNumber', 'address', 'wardId'],
                    include: [
                        {
                            model: Ward,
                            as: 'ward',
                            attributes: ['id', 'wardName', 'wardNumber']
                        }
                    ],
                    where: wardId ? { wardId } : (req.wardFilter?.id ? { wardId: { [Op.in]: req.wardFilter.id[Op.in] } } : {})
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            data: { connections }
        });
    } catch (error) {
        console.error('Error fetching existing water connections:', error);
        next(error);
    }
};
