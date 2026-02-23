import { GauShalaFacility, GauShalaCattle, GauShalaComplaint, GauShalaFeedingRecord, GauShalaInspection, CattleMedicalRecord, Ward, User } from '../models/index.js';
import { Op } from 'sequelize';
import { auditLogger } from '../utils/auditLogger.js';

// Facilities
export const getAllFacilities = async (req, res, next) => {
    try {
        const { ward_id, status, search, page = 1, limit = 10 } = req.query;
        const where = {};
        if (ward_id) where.ward_id = ward_id;
        if (status) where.status = status;
        if (search) where.name = { [Op.iLike]: `%${search}%` };

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const { count, rows } = await GauShalaFacility.findAndCountAll({
            where,
            include: [{ model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] }],
            limit: parseInt(limit),
            offset,
            order: [['created_at', 'DESC']]
        });
        res.json({ success: true, data: { facilities: rows, pagination: { total: count, page, limit, pages: Math.ceil(count / limit) } } });
    } catch (error) {
        next(error);
    }
};

export const getFacilityById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const facility = await GauShalaFacility.findByPk(id, {
            include: [
                { model: Ward, as: 'ward' },
                { model: GauShalaCattle, as: 'cattle', limit: 5 },
                { model: GauShalaComplaint, as: 'complaints', limit: 5 },
                { model: GauShalaFeedingRecord, as: 'feedingRecords', limit: 5 },
                { model: GauShalaInspection, as: 'inspections', limit: 5 }
            ]
        });
        if (!facility) return res.status(404).json({ success: false, message: 'Gaushala facility not found' });
        res.json({ success: true, data: { facility } });
    } catch (error) {
        next(error);
    }
};

export const createFacility = async (req, res, next) => {
    try {
        const facility = await GauShalaFacility.create(req.body);
        await auditLogger.logCreate(req, req.user, 'GauShalaFacility', facility.id, { name: facility.name }, `Created Gaushala facility: ${facility.name}`);
        res.status(201).json({ success: true, data: { facility } });
    } catch (error) {
        next(error);
    }
};

// Cattle
export const getAllCattle = async (req, res, next) => {
    try {
        const { facility_id, animal_type, health_status, tag_number, page = 1, limit = 10 } = req.query;
        const where = {};
        if (facility_id) where.gau_shala_facility_id = facility_id;
        if (animal_type) where.animal_type = animal_type;
        if (health_status) where.health_status = health_status;
        if (tag_number) where.tag_number = { [Op.iLike]: `%${tag_number}%` };

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const { count, rows } = await GauShalaCattle.findAndCountAll({
            where,
            include: [{ model: GauShalaFacility, as: 'facility', attributes: ['id', 'name'] }],
            limit: parseInt(limit),
            offset,
            order: [['created_at', 'DESC']]
        });
        res.json({ success: true, data: { cattle: rows, pagination: { total: count, page, limit, pages: Math.ceil(count / limit) } } });
    } catch (error) {
        next(error);
    }
};

export const createCattle = async (req, res, next) => {
    try {
        const cattle = await GauShalaCattle.create(req.body);
        res.status(201).json({ success: true, data: { cattle } });
    } catch (error) {
        next(error);
    }
};

// Feeding Records
export const getAllFeedingRecords = async (req, res, next) => {
    try {
        const { facility_id, page = 1, limit = 10 } = req.query;
        const where = {};
        if (facility_id) where.gau_shala_facility_id = facility_id;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const { count, rows } = await GauShalaFeedingRecord.findAndCountAll({
            where,
            include: [{ model: GauShalaFacility, as: 'facility', attributes: ['id', 'name'] }],
            limit: parseInt(limit),
            offset,
            order: [['record_date', 'DESC']]
        });
        res.json({ success: true, data: { feedingRecords: rows, pagination: { total: count, page, limit, pages: Math.ceil(count / limit) } } });
    } catch (error) {
        next(error);
    }
};

export const createFeedingRecord = async (req, res, next) => {
    try {
        const record = await GauShalaFeedingRecord.create(req.body);
        res.status(201).json({ success: true, data: { record } });
    } catch (error) {
        next(error);
    }
};

// Inspections
export const getAllInspections = async (req, res, next) => {
    try {
        const { facility_id, inspector_id, status, page = 1, limit = 10 } = req.query;
        const where = {};
        if (facility_id) where.gau_shala_facility_id = facility_id;
        if (inspector_id) where.inspector_id = inspector_id;
        if (status) where.status = status;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const { count, rows } = await GauShalaInspection.findAndCountAll({
            where,
            include: [
                { model: GauShalaFacility, as: 'facility', attributes: ['id', 'name'] },
                { model: User, as: 'inspector', attributes: ['id', 'firstName', 'lastName'] }
            ],
            limit: parseInt(limit),
            offset,
            order: [['inspection_date', 'DESC']]
        });
        res.json({ success: true, data: { inspections: rows, pagination: { total: count, page, limit, pages: Math.ceil(count / limit) } } });
    } catch (error) {
        next(error);
    }
};

export const createInspection = async (req, res, next) => {
    try {
        const inspection = await GauShalaInspection.create({
            ...req.body,
            inspector_id: req.user.id
        });
        res.status(201).json({ success: true, data: { inspection } });
    } catch (error) {
        next(error);
    }
};

// Complaints
export const getAllComplaints = async (req, res, next) => {
    try {
        const { facility_id, status, page = 1, limit = 10 } = req.query;
        const where = {};
        if (facility_id) where.gau_shala_facility_id = facility_id;
        if (status) where.status = status;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const { count, rows } = await GauShalaComplaint.findAndCountAll({
            where,
            include: [{ model: GauShalaFacility, as: 'facility', attributes: ['id', 'name'] }],
            limit: parseInt(limit),
            offset,
            order: [['created_at', 'DESC']]
        });
        res.json({ success: true, data: { complaints: rows, pagination: { total: count, page, limit, pages: Math.ceil(count / limit) } } });
    } catch (error) {
        next(error);
    }
};

export const createComplaint = async (req, res, next) => {
    try {
        const complaint = await GauShalaComplaint.create(req.body);
        res.status(201).json({ success: true, data: { complaint } });
    } catch (error) {
        next(error);
    }
};

export const getReports = async (req, res, next) => {
    try {
        const [
            totalFacilities,
            activeFacilities,
            totalCattle,
            healthyCattle,
            activeComplaints,
            totalInspections
        ] = await Promise.all([
            GauShalaFacility.count(),
            GauShalaFacility.count({ where: { status: 'active' } }),
            GauShalaCattle.count(),
            GauShalaCattle.count({ where: { health_status: 'healthy' } }),
            GauShalaComplaint.count({ where: { status: 'pending' } }),
            GauShalaInspection.count()
        ]);

        res.json({
            success: true,
            data: {
                totalFacilities,
                activeFacilities,
                totalCattle,
                healthyCattle,
                healthRate: totalCattle > 0 ? ((healthyCattle / totalCattle) * 100).toFixed(1) : 0,
                activeComplaints,
                totalInspections
            }
        });
    } catch (error) {
        next(error);
    }
};

// Medical Records
export const getCattleMedicalRecords = async (req, res, next) => {
    try {
        const { cattle_id } = req.params;
        const records = await CattleMedicalRecord.findAll({
            where: { gau_shala_cattle_id: cattle_id },
            order: [['record_date', 'DESC']]
        });
        res.json({ success: true, data: { records } });
    } catch (error) {
        next(error);
    }
};

export const createMedicalRecord = async (req, res, next) => {
    try {
        const record = await CattleMedicalRecord.create(req.body);
        res.status(201).json({ success: true, data: { record } });
    } catch (error) {
        next(error);
    }
};
