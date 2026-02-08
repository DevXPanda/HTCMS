import { WaterConnectionRequest, User, Property, WaterConnection } from '../models/index.js';
import { Op } from 'sequelize';
import { auditLogger } from '../utils/auditLogger.js';

/**
 * @route   POST /api/water-connection-requests
 * @desc    Create water connection request (Citizen, Clerk, Admin)
 * @access  Private
 */
export const createWaterConnectionRequest = async (req, res, next) => {
    try {
        const { propertyId, propertyLocation, connectionType, remarks } = req.body;
        const user = req.user;

        // Validation
        if (!propertyId || !propertyLocation || !connectionType) {
            return res.status(400).json({
                success: false,
                message: 'Required fields missing: propertyId, propertyLocation, connectionType'
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

        // Citizen creates their own request, Clerk creates on behalf
        const requestedBy = user.role === 'citizen' ? user.id : property.ownerId;
        // Note: createdBy references 'users' table, but Clerk is in 'staff' table
        // So we only set createdBy for citizens, not clerks (field is nullable)
        const createdBy = user.role === 'citizen' ? user.id : null;

        // Generate request number
        const count = await WaterConnectionRequest.count();
        const requestNumber = `WCR-${Date.now()}-${count + 1}`;

        // Create request
        const request = await WaterConnectionRequest.create({
            requestNumber,
            propertyId,
            requestedBy,
            createdBy, // Will be null for Clerk-created requests
            propertyLocation,
            connectionType,
            remarks,
            status: 'DRAFT'
        });

        // Audit log
        await auditLogger.logCreate(
            req,
            user,
            'WaterConnectionRequest',
            request.id,
            request.toJSON(),
            `Water connection request ${requestNumber} created as DRAFT`,
            { requestNumber, status: 'DRAFT' }
        );

        res.status(201).json({
            success: true,
            message: 'Water connection request created successfully',
            data: { request }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/water-connection-requests/create-and-submit
 * @desc    Create and immediately submit water connection request (Clerk, Admin)
 * @access  Private (Clerk, Admin)
 */
export const createAndSubmitWaterConnectionRequest = async (req, res, next) => {
    try {
        const { propertyId, propertyLocation, connectionType, remarks } = req.body;
        const user = req.user;

        // Validation
        if (!propertyId || !propertyLocation || !connectionType) {
            return res.status(400).json({
                success: false,
                message: 'Required fields missing: propertyId, propertyLocation, connectionType'
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

        // Clerk creates on behalf of property owner
        const requestedBy = property.ownerId;
        // Note: createdBy references 'users' table, but Clerk is in 'staff' table
        // So we don't set createdBy for Clerk-created requests (field is nullable)

        // Generate request number
        const count = await WaterConnectionRequest.count();
        const requestNumber = `WCR-${Date.now()}-${count + 1}`;

        // Find an inspector for this property's ward
        let inspectorId = null;
        if (property.wardId) {
            const { AdminManagement } = await import('../models/index.js');
            const inspector = await AdminManagement.findOne({
                where: {
                    role: 'inspector',
                    ward_ids: { [Op.contains]: [property.wardId] },
                    isActive: true
                },
                order: [['id', 'ASC']] // Simple round-robin: pick first available
            });
            if (inspector) {
                inspectorId = inspector.id;
            }
        }

        // Create request with SUBMITTED status (skip DRAFT for Clerk workflow)
        const request = await WaterConnectionRequest.create({
            requestNumber,
            propertyId,
            requestedBy,
            // createdBy is not set - Clerk is in staff table, not users table
            propertyLocation,
            connectionType,
            remarks,
            status: 'SUBMITTED',
            submittedAt: new Date(),
            inspectedBy: inspectorId // Assign inspector if found
        });

        // Link uploaded documents to this request
        const { documents } = req.body;
        if (documents && typeof documents === 'object') {
            const { WaterConnectionDocument } = await import('../models/index.js');

            // Update each document with the request ID
            for (const [docType, docData] of Object.entries(documents)) {
                if (docData && docData.id) {
                    await WaterConnectionDocument.update(
                        { waterConnectionRequestId: request.id },
                        { where: { id: docData.id } }
                    );
                }
            }
        }

        // Audit log
        await auditLogger.logCreate(
            req,
            user,
            'WaterConnectionRequest',
            request.id,
            request.toJSON(),
            `Water connection request ${requestNumber} created and submitted by clerk`,
            { requestNumber, status: 'SUBMITTED', clerkId: user.id }
        );

        // Fetch created request with relations
        const createdRequest = await WaterConnectionRequest.findByPk(request.id, {
            include: [
                { model: Property, as: 'property', attributes: ['id', 'propertyNumber', 'address', 'city'] },
                { model: User, as: 'requester', attributes: ['id', 'firstName', 'lastName', 'email'] },
                { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] }
            ]
        });

        res.status(201).json({
            success: true,
            message: 'Water connection request created and submitted successfully. It will now be reviewed by an inspector.',
            data: { request: createdRequest }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/water-connection-requests
 * @desc    Get all water connection requests (role-filtered)
 * @access  Private
 */
export const getWaterConnectionRequests = async (req, res, next) => {
    try {
        const {
            status,
            connectionType,
            search,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'DESC'
        } = req.query;

        const user = req.user;
        const where = {};

        // Role-based filtering
        if (user.role === 'citizen') {
            // Citizens see only their own requests
            where.requestedBy = user.id;
        } else if (user.role === 'clerk') {
            // Clerks see requests for properties in their assigned wards
            const properties = await Property.findAll({
                where: { wardId: { [Op.in]: user.ward_ids || [] } },
                attributes: ['id']
            });
            const propertyIds = properties.map(p => p.id);
            if (propertyIds.length > 0) {
                where.propertyId = { [Op.in]: propertyIds };
            } else {
                // No properties in clerk's wards, return empty result
                where.id = -1;
            }
        }
        // Admin and inspector can see all requests

        if (status) where.status = status;
        if (connectionType) where.connectionType = connectionType;

        if (search) {
            where[Op.or] = [
                { requestNumber: { [Op.iLike]: `%${search}%` } },
                { propertyLocation: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows } = await WaterConnectionRequest.findAndCountAll({
            where,
            include: [
                { model: Property, as: 'property', attributes: ['id', 'propertyNumber', 'address'] },
                { model: User, as: 'requester', attributes: ['id', 'firstName', 'lastName', 'email'] },
                { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] },
                { model: User, as: 'inspector', attributes: ['id', 'firstName', 'lastName', 'email'] },
                { model: User, as: 'processor', attributes: ['id', 'firstName', 'lastName', 'email'] },
                { model: User, as: 'decidedByOfficer', attributes: ['id', 'firstName', 'lastName', 'email'] },
                { model: WaterConnection, as: 'waterConnection', attributes: ['id', 'connectionNumber'] }
            ],
            limit: parseInt(limit),
            offset,
            order: [[sortBy, sortOrder]]
        });

        res.json({
            success: true,
            data: {
                requests: rows,
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
 * @route   GET /api/water-connection-requests/:id
 * @desc    Get water connection request by ID (role-filtered)
 * @access  Private
 */
export const getWaterConnectionRequestById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const where = { id };

        // Role-based filtering
        if (user.role === 'citizen') {
            where.requestedBy = user.id;
        } else if (user.role === 'clerk') {
            // Clerks can view requests for properties in their assigned wards
            const properties = await Property.findAll({
                where: { wardId: { [Op.in]: user.ward_ids || [] } },
                attributes: ['id']
            });
            const propertyIds = properties.map(p => p.id);
            if (propertyIds.length > 0) {
                where.propertyId = { [Op.in]: propertyIds };
            } else {
                // No properties in clerk's wards
                where.id = -1;
            }
        }

        const request = await WaterConnectionRequest.findOne({
            where,
            include: [
                { model: Property, as: 'property', attributes: ['id', 'propertyNumber', 'address', 'city'] },
                { model: User, as: 'requester', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] },
                { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] },
                { model: User, as: 'inspector', attributes: ['id', 'firstName', 'lastName', 'email'] },
                { model: User, as: 'processor', attributes: ['id', 'firstName', 'lastName', 'email'] },
                { model: User, as: 'decidedByOfficer', attributes: ['id', 'firstName', 'lastName', 'email'] },
                { model: WaterConnection, as: 'waterConnection', attributes: ['id', 'connectionNumber', 'status'] }
            ]
        });

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Water connection request not found or access denied'
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
 * @route   PUT /api/water-connection-requests/:id
 * @desc    Update water connection request (Citizen, Clerk - only DRAFT/RETURNED status)
 * @access  Private
 */
export const updateWaterConnectionRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const where = { id };

        // Role-based filtering
        if (user.role === 'citizen') {
            where.requestedBy = user.id;
        }
        // Note: Clerks can access all requests (ward-based filtering happens elsewhere)
        // We don't filter by createdBy because it's null for Clerk-created requests

        const request = await WaterConnectionRequest.findOne({ where });

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Water connection request not found or access denied'
            });
        }

        // Check if status allows editing
        if (!['DRAFT', 'RETURNED'].includes(request.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot edit request in ${request.status} status. Only DRAFT or RETURNED requests can be edited.`
            });
        }

        const previousData = request.toJSON();

        // Update allowed fields
        const { propertyLocation, connectionType, remarks } = req.body;

        if (propertyLocation !== undefined) request.propertyLocation = propertyLocation;
        if (connectionType !== undefined) request.connectionType = connectionType;
        if (remarks !== undefined) request.remarks = remarks;

        await request.save();

        // Audit log
        await auditLogger.logUpdate(
            req,
            user,
            'WaterConnectionRequest',
            request.id,
            previousData,
            request.toJSON(),
            `Water connection request ${request.requestNumber} updated`,
            { requestNumber: request.requestNumber }
        );

        res.json({
            success: true,
            message: 'Water connection request updated successfully',
            data: { request }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/water-connection-requests/:id/submit
 * @desc    Submit water connection request for inspection (DRAFT/RETURNED → SUBMITTED)
 * @access  Private (Citizen, Clerk, Admin)
 */
export const submitWaterConnectionRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const where = { id };

        // Role-based filtering
        if (user.role === 'citizen') {
            where.requestedBy = user.id;
        }
        // Note: Clerks can access all requests (ward-based filtering happens elsewhere)
        // We don't filter by createdBy because it's null for Clerk-created requests

        const request = await WaterConnectionRequest.findOne({ where });

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Water connection request not found or access denied'
            });
        }

        // Check if status allows submission
        if (!['DRAFT', 'RETURNED'].includes(request.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot submit request in ${request.status} status. Only DRAFT or RETURNED requests can be submitted.`
            });
        }

        const previousData = request.toJSON();

        // Update status to SUBMITTED
        request.status = 'SUBMITTED';
        request.submittedAt = new Date();

        await request.save();

        // Audit log
        await auditLogger.logUpdate(
            req,
            user,
            'WaterConnectionRequest',
            request.id,
            previousData,
            request.toJSON(),
            `Water connection request ${request.requestNumber} submitted for inspection`,
            {
                requestNumber: request.requestNumber,
                previousStatus: previousData.status,
                newStatus: 'SUBMITTED'
            }
        );

        res.json({
            success: true,
            message: 'Water connection request submitted for inspection successfully',
            data: { request }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/water-connection-requests/:id/review
 * @desc    Assessor reviews request (SUBMITTED → UNDER_INSPECTION → APPROVED/REJECTED/RETURNED)
 * @access  Private (Assessor, Admin only)
 */
export const inspectionReviewWaterConnectionRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { action, adminRemarks, returnReason, connectionDetails } = req.body;
        const user = req.user;

        // Validate action
        const validActions = ['start_inspection', 'approve', 'reject', 'return'];
        if (!validActions.includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid action. Must be one of: start_inspection, approve, reject, return'
            });
        }

        const request = await WaterConnectionRequest.findByPk(id, {
            include: [
                { model: Property, as: 'property' },
                { model: User, as: 'requester' }
            ]
        });

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Water connection request not found'
            });
        }

        const previousData = request.toJSON();
        let newStatus;
        let description;

        switch (action) {
            case 'start_inspection':
                if (request.status !== 'SUBMITTED') {
                    return res.status(400).json({
                        success: false,
                        message: 'Can only start inspection on SUBMITTED requests'
                    });
                }
                newStatus = 'UNDER_INSPECTION';
                request.inspectedBy = user.id;
                request.inspectedAt = new Date();
                description = `Water connection request ${request.requestNumber} inspection started`;
                break;

            case 'approve':
                if (!['SUBMITTED', 'UNDER_INSPECTION'].includes(request.status)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Can only approve SUBMITTED or UNDER_INSPECTION requests'
                    });
                }

                // Create actual WaterConnection record
                const connectionCount = await WaterConnection.count();
                const connectionNumber = `WC-${Date.now()}-${connectionCount + 1}`;

                const newConnection = await WaterConnection.create({
                    connectionNumber,
                    propertyId: request.propertyId,
                    connectionType: request.connectionType,
                    isMetered: connectionDetails?.isMetered || false,
                    meterNumber: connectionDetails?.meterNumber || null,
                    meterSize: connectionDetails?.meterSize || null,
                    pipeSize: connectionDetails?.pipeSize || null,
                    status: 'active',
                    createdBy: user.id
                });

                newStatus = 'APPROVED';
                request.waterConnectionId = newConnection.id;
                request.processedBy = user.id;
                request.processedAt = new Date();
                request.inspectedBy = user.id;
                request.inspectedAt = new Date();
                description = `Water connection request ${request.requestNumber} approved and connection ${connectionNumber} created`;

                // Log water connection creation
                await auditLogger.logCreate(
                    req,
                    user,
                    'WaterConnection',
                    newConnection.id,
                    newConnection.toJSON(),
                    `Water connection ${connectionNumber} created from approved request ${request.requestNumber}`,
                    { requestId: request.id, requestNumber: request.requestNumber }
                );
                break;

            case 'reject':
                if (!['SUBMITTED', 'UNDER_INSPECTION'].includes(request.status)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Can only reject SUBMITTED or UNDER_INSPECTION requests'
                    });
                }
                if (!adminRemarks) {
                    return res.status(400).json({
                        success: false,
                        message: 'Admin remarks are required for rejection'
                    });
                }
                newStatus = 'REJECTED';
                request.processedBy = user.id;
                request.processedAt = new Date();
                request.inspectedBy = user.id;
                request.inspectedAt = new Date();
                description = `Water connection request ${request.requestNumber} rejected`;
                break;

            case 'return':
                if (!['SUBMITTED', 'UNDER_INSPECTION'].includes(request.status)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Can only return SUBMITTED or UNDER_INSPECTION requests'
                    });
                }
                if (!returnReason) {
                    return res.status(400).json({
                        success: false,
                        message: 'Return reason is required when returning request'
                    });
                }
                newStatus = 'RETURNED';
                request.returnReason = returnReason;
                request.inspectedBy = user.id;
                request.inspectedAt = new Date();
                description = `Water connection request ${request.requestNumber} returned for corrections`;
                break;
        }

        request.status = newStatus;
        if (adminRemarks) request.adminRemarks = adminRemarks;

        await request.save();

        // Audit log
        const actionType = action === 'approve' ? 'APPROVE' : action === 'reject' ? 'REJECT' : 'SEND';
        await auditLogger.logUpdate(
            req,
            user,
            'WaterConnectionRequest',
            request.id,
            previousData,
            request.toJSON(),
            description,
            {
                requestNumber: request.requestNumber,
                action,
                previousStatus: previousData.status,
                newStatus,
                adminRemarks,
                returnReason
            }
        );

        res.json({
            success: true,
            message: `Water connection request ${action}d successfully`,
            data: { request }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   DELETE /api/water-connection-requests/:id
 * @desc    Delete water connection request (only DRAFT status)
 * @access  Private (Citizen, Clerk, Admin)
 */
export const deleteWaterConnectionRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const where = { id };

        // Role-based filtering
        if (user.role === 'citizen') {
            where.requestedBy = user.id;
        } else if (user.role === 'clerk') {
            where.createdBy = user.id;
        }

        const request = await WaterConnectionRequest.findOne({ where });

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Water connection request not found or access denied'
            });
        }

        // Only DRAFT requests can be deleted
        if (request.status !== 'DRAFT') {
            return res.status(400).json({
                success: false,
                message: 'Only DRAFT requests can be deleted'
            });
        }

        const previousData = request.toJSON();

        await request.destroy();

        // Audit log
        await auditLogger.logDelete(
            req,
            user,
            'WaterConnectionRequest',
            request.id,
            previousData,
            `Water connection request ${request.requestNumber} deleted`,
            { requestNumber: request.requestNumber }
        );

        res.json({
            success: true,
            message: 'Water connection request deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
