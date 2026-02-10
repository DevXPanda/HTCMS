import { D2DCRecord, Demand, Payment, Property, User, Ward, AdminManagement } from '../models/index.js';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * @route   GET /api/d2dc/collector/stats
 * @desc    Get D2DC statistics for the logged-in collector
 * @access  Private (Collector)
 */
export const getCollectorStats = async (req, res, next) => {
    try {
        const collectorId = req.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get assigned wards
        const assignedWards = await Ward.findAll({
            where: { collectorId: req.user.staff_id || collectorId }, // Handle potential schema variance
            attributes: ['id', 'wardName', 'wardNumber']
        });

        const wardIds = assignedWards.map(w => w.id);

        // If no wards assigned, return empty stats
        if (wardIds.length === 0) {
            return res.json({
                success: true,
                data: {
                    wards: [],
                    totalProperties: 0,
                    totalDemands: 0,
                    todayCollection: 0,
                    todayDemandsGenerated: 0
                }
            });
        }

        // Total Properties in assigned wards
        const totalProperties = await Property.count({
            where: { wardId: { [Op.in]: wardIds } }
        });

        // Total Active Demands in assigned wards (D2DC type)
        const totalDemands = await Demand.count({
            where: {
                serviceType: 'D2DC',
                status: { [Op.in]: ['pending', 'partially_paid'] }
            },
            include: [{
                model: Property,
                as: 'property',
                required: true,
                where: { wardId: { [Op.in]: wardIds } },
                attributes: []
            }]
        });

        // Today's Collection (from D2DCRecords)
        const todayCollection = await D2DCRecord.sum('amount', {
            where: {
                collectorId,
                type: 'PAYMENT_COLLECTION',
                timestamp: { [Op.gte]: today }
            }
        }) || 0;

        // Today's Demands Generated (Count)
        const todayDemandsGenerated = await D2DCRecord.count({
            where: {
                collectorId,
                type: 'DEMAND_GENERATION',
                timestamp: { [Op.gte]: today }
            }
        });

        res.json({
            success: true,
            data: {
                wards: assignedWards,
                totalProperties,
                totalDemands,
                todayCollection: parseFloat(todayCollection),
                todayDemandsGenerated
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/d2dc/inspector/stats
 * @desc    Get D2DC monitoring statistics for the logged-in inspector
 * @access  Private (Inspector)
 */
export const getInspectorStats = async (req, res, next) => {
    try {
        let wardIds = [];
        let assignedWards = [];

        if (req.user.role === 'admin') {
            // Admin sees all wards
            assignedWards = await Ward.findAll({
                attributes: ['id', 'wardName', 'wardNumber']
            });
            wardIds = assignedWards.map(w => w.id);
        } else {
            // Inspector sees assigned wards
            assignedWards = await Ward.findAll({
                where: { inspectorId: req.user.staff_id || req.user.id },
                attributes: ['id', 'wardName', 'wardNumber']
            });
            wardIds = assignedWards.map(w => w.id);
        }

        if (req.query.wardId) {
            const requestedWardId = parseInt(req.query.wardId);
            if (wardIds.includes(requestedWardId)) {
                wardIds = [requestedWardId];
            }
        }

        if (wardIds.length === 0) {
            return res.json({
                success: true,
                data: {
                    wards: [],
                    stats: {
                        totalProperties: 0,
                        activeDemands: 0,
                        totalCollections: 0
                    },
                    recentActivity: []
                }
            });
        }

        // Stats
        const totalProperties = await Property.count({
            where: { wardId: { [Op.in]: wardIds } }
        });

        const activeDemands = await Demand.count({
            where: {
                serviceType: 'D2DC',
                status: { [Op.in]: ['pending', 'partially_paid'] }
            },
            include: [{
                model: Property,
                as: 'property',
                required: true,
                where: { wardId: { [Op.in]: wardIds } }
            }]
        });

        const totalCollections = await D2DCRecord.sum('amount', {
            where: {
                wardId: { [Op.in]: wardIds },
                type: 'PAYMENT_COLLECTION'
            }
        }) || 0;

        res.json({
            success: true,
            data: {
                wards: assignedWards,
                stats: {
                    totalProperties,
                    activeDemands,
                    totalCollections: parseFloat(totalCollections)
                }
            }
        });
    } catch (error) {
        // Enhanced error logging
        console.error('getInspectorStats Error:', error);
        next(error);
    }
};


/**
 * @route   GET /api/d2dc/activity
 * @desc    Get D2DC activity/records with filters
 * @access  Private
 */
export const getD2DCActivity = async (req, res, next) => {
    try {
        const {
            type,
            collectorId,
            wardId,
            startDate,
            endDate,
            limit = 20,
            page = 1
        } = req.query;

        const where = {};

        if (type) where.type = type;
        if (collectorId) where.collectorId = collectorId;
        if (wardId) where.wardId = wardId;

        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate) where.timestamp[Op.gte] = new Date(startDate);
            if (endDate) where.timestamp[Op.lte] = new Date(endDate);
        }

        // Role-based restrictions
        if (req.user.role === 'collector') {
            where.collectorId = req.user.id;
        } else if (req.user.role === 'inspector') {
            // Inspector sees only their wards
            const assignedWards = await Ward.findAll({
                where: { inspectorId: req.user.staff_id || req.user.id },
                attributes: ['id']
            });
            const inspectorWardIds = assignedWards.map(w => w.id);

            if (inspectorWardIds.length > 0) {
                // If wardId param is provided, ensure it's in their list
                if (wardId && !inspectorWardIds.includes(parseInt(wardId))) {
                    return res.status(403).json({ success: false, message: 'Access denied to this ward' });
                } else if (!wardId) {
                    where.wardId = { [Op.in]: inspectorWardIds };
                }
            } else {
                return res.json({ success: true, data: { activities: [], total: 0 } });
            }
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows } = await D2DCRecord.findAndCountAll({
            where,
            include: [
                { model: User, as: 'collector', attributes: ['id', 'firstName', 'lastName'] },
                { model: Property, as: 'property', attributes: ['id', 'propertyNumber', 'ownerName'] }, // Adjust property attributes as needed
                { model: Ward, as: 'ward', attributes: ['id', 'wardName'] }
            ],
            limit: parseInt(limit),
            offset,
            order: [['timestamp', 'DESC']]
        });

        res.json({
            success: true,
            data: {
                activities: rows,
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
 * @route   GET /api/d2dc/search/properties
 * @desc    Search properties in collector's assigned wards
 * @access  Private (Collector)
 */
export const searchProperties = async (req, res, next) => {
    try {
        const { query } = req.query;
        const collectorId = req.user.id;

        if (!query || query.length < 2) {
            return res.json({ success: true, data: [] });
        }

        // Get collector's assigned wards
        const assignedWards = await Ward.findAll({
            where: { collectorId: req.user.staff_id || collectorId },
            attributes: ['id']
        });

        const wardIds = assignedWards.map(w => w.id);

        if (wardIds.length === 0) {
            return res.json({ success: true, data: [] });
        }

        // Search properties in assigned wards
        const properties = await Property.findAll({
            where: {
                wardId: { [Op.in]: wardIds },
                [Op.or]: [
                    { propertyNumber: { [Op.iLike]: `%${query}%` } },
                    { ownerName: { [Op.iLike]: `%${query}%` } },
                    { ownerPhone: { [Op.iLike]: `%${query}%` } }
                ]
            },
            include: [
                {
                    model: Ward,
                    as: 'ward',
                    attributes: ['id', 'wardName', 'wardNumber']
                },
                {
                    model: Demand,
                    as: 'demands',
                    where: {
                        serviceType: 'D2DC',
                        status: { [Op.in]: ['pending', 'partially_paid'] }
                    },
                    required: false,
                    attributes: ['id', 'demandNumber', 'totalAmount', 'balanceAmount', 'status']
                }
            ],
            limit: 10,
            order: [['propertyNumber', 'ASC']]
        });

        res.json({ success: true, data: properties });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/d2dc/demand/generate
 * @desc    Generate D2DC demand for a property
 * @access  Private (Collector)
 */
export const generateD2DCDemand = async (req, res, next) => {
    try {
        const { propertyId, remarks } = req.body;
        const collectorId = req.user.id;

        // System-calculated D2DC amount (₹50 standard)
        const D2DC_STANDARD_AMOUNT = 50;

        // Verify property exists and is in collector's assigned wards
        const property = await Property.findByPk(propertyId, {
            include: [{ model: Ward, as: 'ward' }]
        });

        if (!property) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }

        // Verify ward assignment
        const assignedWards = await Ward.findAll({
            where: { collectorId: req.user.staff_id || collectorId },
            attributes: ['id']
        });

        if (!assignedWards.some(w => w.id === property.wardId)) {
            return res.status(403).json({
                success: false,
                message: 'Property not in your assigned wards'
            });
        }

        // Check for existing pending D2DC demand
        const existingDemand = await Demand.findOne({
            where: {
                propertyId,
                serviceType: 'D2DC',
                status: { [Op.in]: ['pending', 'partially_paid'] }
            }
        });

        if (existingDemand) {
            return res.status(400).json({
                success: false,
                message: 'Active D2DC demand already exists for this property'
            });
        }

        // Get current financial year
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const financialYear = month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;

        // Generate demand number
        const demandCount = await Demand.count({ where: { serviceType: 'D2DC' } });
        const demandNumber = `D2DC-${year}-${String(demandCount + 1).padStart(5, '0')}`;

        // Create demand
        const demand = await Demand.create({
            demandNumber,
            propertyId,
            serviceType: 'D2DC',
            financialYear,
            baseAmount: D2DC_STANDARD_AMOUNT,
            totalAmount: D2DC_STANDARD_AMOUNT,
            balanceAmount: D2DC_STANDARD_AMOUNT,
            paidAmount: 0,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            generatedBy: collectorId,
            generatedDate: new Date(),
            status: 'pending',
            remarks: remarks || 'Generated via D2DC'
        });

        // Create D2DCRecord for tracking
        await D2DCRecord.create({
            type: 'DEMAND_GENERATION',
            collectorId,
            propertyId,
            wardId: property.wardId,
            demandId: demand.id,
            amount: D2DC_STANDARD_AMOUNT,
            timestamp: new Date(),
            remarks
        });

        res.json({
            success: true,
            message: 'D2DC demand generated successfully',
            data: demand
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/d2dc/payment/collect
 * @desc    Collect payment for D2DC demand
 * @access  Private (Collector)
 */
export const collectD2DCPayment = async (req, res, next) => {
    try {
        const { demandId, amount, paymentMode, remarks } = req.body;
        const collectorId = req.user.id;

        // Verify demand exists and is D2DC
        const demand = await Demand.findByPk(demandId, {
            include: [
                {
                    model: Property,
                    as: 'property',
                    include: [{ model: Ward, as: 'ward' }]
                }
            ]
        });

        if (!demand || demand.serviceType !== 'D2DC') {
            return res.status(404).json({
                success: false,
                message: 'D2DC demand not found'
            });
        }

        // Verify ward assignment
        const assignedWards = await Ward.findAll({
            where: { collectorId: req.user.staff_id || collectorId },
            attributes: ['id']
        });

        if (!assignedWards.some(w => w.id === demand.property.wardId)) {
            return res.status(403).json({
                success: false,
                message: 'Property not in your assigned wards'
            });
        }

        // Validate amount
        const paymentAmount = parseFloat(amount);
        if (paymentAmount <= 0 || paymentAmount > demand.balanceAmount) {
            return res.status(400).json({
                success: false,
                message: `Invalid amount. Balance: ₹${demand.balanceAmount}`
            });
        }

        // Generate payment number
        const paymentCount = await Payment.count();
        const paymentNumber = `PAY-${new Date().getFullYear()}-${String(paymentCount + 1).padStart(6, '0')}`;

        // Generate receipt number
        const receiptNumber = `RCP-${new Date().getFullYear()}-${String(paymentCount + 1).padStart(6, '0')}`;

        // Create payment
        const payment = await Payment.create({
            paymentNumber,
            receiptNumber,
            demandId,
            propertyId: demand.propertyId,
            amount: paymentAmount,
            paymentMode: paymentMode || 'cash',
            paymentDate: new Date(),
            collectedBy: collectorId,
            status: 'completed',
            remarks: `D2DC Collection - ${remarks || 'Collected via D2DC'}`
        });

        // Update demand
        demand.paidAmount = parseFloat(demand.paidAmount) + paymentAmount;
        demand.balanceAmount = parseFloat(demand.balanceAmount) - paymentAmount;
        demand.status = demand.balanceAmount <= 0 ? 'paid' : 'partially_paid';
        await demand.save();

        // Create D2DCRecord
        await D2DCRecord.create({
            type: 'PAYMENT_COLLECTION',
            collectorId,
            propertyId: demand.propertyId,
            wardId: demand.property.wardId,
            demandId,
            paymentId: payment.id,
            amount: paymentAmount,
            timestamp: new Date(),
            remarks
        });

        res.json({
            success: true,
            message: 'Payment collected successfully',
            data: {
                payment,
                demand: {
                    id: demand.id,
                    totalAmount: demand.totalAmount,
                    paidAmount: demand.paidAmount,
                    balanceAmount: demand.balanceAmount,
                    status: demand.status
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/d2dc/demands
 * @desc    Get D2DC demands for monitoring (Inspector/Admin)
 * @access  Private (Inspector, Admin)
 */
export const getD2DCDemands = async (req, res, next) => {
    try {
        const { status, limit = 20, page = 1 } = req.query;

        // Get monitored wards based on role
        let wardIds = [];
        if (req.user.role === 'admin') {
            const allWards = await Ward.findAll({ attributes: ['id'] });
            wardIds = allWards.map(w => w.id);
        } else {
            const assignedWards = await Ward.findAll({
                where: { inspectorId: req.user.staff_id || req.user.id },
                attributes: ['id']
            });
            wardIds = assignedWards.map(w => w.id);
        }

        if (req.query.wardId) {
            const requestedWardId = parseInt(req.query.wardId);
            if (wardIds.includes(requestedWardId)) {
                wardIds = [requestedWardId];
            } else {
                // Return empty if they try to access a ward not assigned to them (and they aren't admin who has all wards)
                return res.json({
                    success: true,
                    data: { demands: [], total: 0, page: 1, limit: parseInt(limit) }
                });
            }
        }

        if (wardIds.length === 0) {
            return res.json({
                success: true,
                data: { demands: [], total: 0, page: 1, limit: parseInt(limit) }
            });
        }

        const where = {
            serviceType: 'D2DC'
        };

        if (status) {
            where.status = status;
        }

        const { count, rows } = await Demand.findAndCountAll({
            where,
            include: [
                {
                    model: Property,
                    as: 'property',
                    where: { wardId: { [Op.in]: wardIds } },
                    attributes: ['id', 'propertyNumber', 'ownerName', 'wardId'],
                    include: [
                        { model: Ward, as: 'ward', attributes: ['wardName', 'wardNumber'] }
                    ]
                },
                {
                    model: User,
                    as: 'generator',
                    attributes: ['id', 'firstName', 'lastName']
                }
            ],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit),
            order: [['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            data: {
                demands: rows,
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(count / parseInt(limit))
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/d2dc/payments
 * @desc    Get D2DC payments for monitoring (Inspector/Admin)
 * @access  Private (Inspector, Admin)
 */
export const getD2DCPayments = async (req, res, next) => {
    try {
        const { limit = 20, page = 1 } = req.query;

        // Get monitored wards based on role
        let wardIds = [];
        if (req.user.role === 'admin') {
            const allWards = await Ward.findAll({ attributes: ['id'] });
            wardIds = allWards.map(w => w.id);
        } else {
            const assignedWards = await Ward.findAll({
                where: { inspectorId: req.user.staff_id || req.user.id },
                attributes: ['id']
            });
            wardIds = assignedWards.map(w => w.id);
        }

        if (req.query.wardId) {
            const requestedWardId = parseInt(req.query.wardId);
            if (wardIds.includes(requestedWardId)) {
                wardIds = [requestedWardId];
            } else {
                return res.json({
                    success: true,
                    data: { payments: [], total: 0, page: 1, limit: parseInt(limit) }
                });
            }
        }

        if (wardIds.length === 0) {
            return res.json({
                success: true,
                data: { payments: [], total: 0, page: 1, limit: parseInt(limit) }
            });
        }

        const { count, rows } = await Payment.findAndCountAll({
            include: [
                {
                    model: Demand,
                    as: 'demand',
                    where: { serviceType: 'D2DC' },
                    attributes: ['id', 'demandNumber', 'serviceType']
                },
                {
                    model: Property,
                    as: 'property',
                    where: { wardId: { [Op.in]: wardIds } },
                    attributes: ['id', 'propertyNumber', 'ownerName', 'wardId'],
                    include: [
                        { model: Ward, as: 'ward', attributes: ['wardName', 'wardNumber'] }
                    ]
                },
                {
                    model: User,
                    as: 'collector',
                    attributes: ['id', 'firstName', 'lastName']
                },
                {
                    model: AdminManagement,
                    as: 'collectorStaff',
                    attributes: ['id', 'full_name', 'role']
                },
                {
                    model: User,
                    as: 'cashier',
                    attributes: ['id', 'firstName', 'lastName']
                },
                {
                    model: AdminManagement,
                    as: 'cashierStaff',
                    attributes: ['id', 'full_name', 'role']
                }
            ],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit),
            order: [['paymentDate', 'DESC']]
        });

        res.json({
            success: true,
            data: {
                payments: rows,
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(count / parseInt(limit))
            }
        });
    } catch (error) {
        next(error);
    }
};
