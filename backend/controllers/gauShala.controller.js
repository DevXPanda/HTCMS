import { GauShalaFacility, GauShalaCattle, GauShalaComplaint, GauShalaFeedingRecord, GauShalaInspection, CattleMedicalRecord, Ward, User, AdminManagement } from '../models/index.js';
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

export const updateFacility = async (req, res, next) => {
    try {
        const { id } = req.params;
        const facility = await GauShalaFacility.findByPk(id);
        if (!facility) return res.status(404).json({ success: false, message: 'Gaushala facility not found' });

        await facility.update(req.body);
        await auditLogger.logUpdate(req, req.user, 'GauShalaFacility', id, { name: facility.name }, `Updated Gaushala facility: ${facility.name}`);
        res.json({ success: true, data: { facility } });
    } catch (error) {
        next(error);
    }
};

export const deleteFacility = async (req, res, next) => {
    try {
        const { id } = req.params;
        const facility = await GauShalaFacility.findByPk(id);
        if (!facility) return res.status(404).json({ success: false, message: 'Gaushala facility not found' });

        await auditLogger.logDelete(req, req.user, 'GauShalaFacility', id, { name: facility.name }, `Deleted Gaushala facility: ${facility.name}`);
        await facility.destroy();
        res.json({ success: true, message: 'Gaushala facility deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// Cattle
export const getAllCattle = async (req, res, next) => {
    try {
        const { facility_id, animal_type, health_status, tag_number } = req.query;
        const where = {};
        if (facility_id) where.gau_shala_facility_id = facility_id;
        if (animal_type) where.animal_type = animal_type;
        if (health_status) where.health_status = health_status;
        if (tag_number) where.tag_number = { [Op.iLike]: `%${tag_number}%` };

        const rows = await GauShalaCattle.findAll({
            where,
            include: [{ model: GauShalaFacility, as: 'facility', attributes: ['id', 'name'] }],
            order: [['created_at', 'DESC']]
        });
        res.json({ success: true, data: { cattle: rows } });
    } catch (error) {
        next(error);
    }
};

export const createCattle = async (req, res, next) => {
    try {
        const cattle = await GauShalaCattle.create(req.body);
        await auditLogger.logCreate(req, req.user, 'GauShalaCattle', cattle.id, { tag_number: cattle.tag_number }, `Added cattle: ${cattle.tag_number}`);
        res.status(201).json({ success: true, data: { cattle } });
    } catch (error) {
        next(error);
    }
};

export const updateCattle = async (req, res, next) => {
    try {
        const { id } = req.params;
        const cattle = await GauShalaCattle.findByPk(id);
        if (!cattle) return res.status(404).json({ success: false, message: 'Cattle record not found' });

        await cattle.update(req.body);
        await auditLogger.logUpdate(req, req.user, 'GauShalaCattle', id, { tag_number: cattle.tag_number }, `Updated cattle: ${cattle.tag_number}`);
        res.json({ success: true, data: { cattle } });
    } catch (error) {
        next(error);
    }
};

export const deleteCattle = async (req, res, next) => {
    try {
        const { id } = req.params;
        const cattle = await GauShalaCattle.findByPk(id);
        if (!cattle) return res.status(404).json({ success: false, message: 'Cattle record not found' });

        await auditLogger.logDelete(req, req.user, 'GauShalaCattle', id, { tag_number: cattle.tag_number }, `Deleted cattle: ${cattle.tag_number}`);
        await cattle.destroy();
        res.json({ success: true, message: 'Cattle record deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// Feeding Records
export const getAllFeedingRecords = async (req, res, next) => {
    try {
        const { facility_id } = req.query;
        const where = {};
        if (facility_id) where.gau_shala_facility_id = facility_id;

        const rows = await GauShalaFeedingRecord.findAll({
            where,
            include: [{ model: GauShalaFacility, as: 'facility', attributes: ['id', 'name'] }],
            order: [['record_date', 'DESC']]
        });
        res.json({ success: true, data: { feedingRecords: rows } });
    } catch (error) {
        next(error);
    }
};

export const createFeedingRecord = async (req, res, next) => {
    try {
        const { gau_shala_facility_id, record_date, fodder_type, quantity, notes } = req.body;

        if (!gau_shala_facility_id || !record_date || !fodder_type) {
            return res.status(400).json({ success: false, message: 'Facility, record date, and fodder type are required' });
        }
        if (quantity !== undefined && quantity !== null && (isNaN(quantity) || Number(quantity) <= 0)) {
            return res.status(400).json({ success: false, message: 'Quantity must be a positive number' });
        }

        const record = await GauShalaFeedingRecord.create({
            gau_shala_facility_id, record_date, fodder_type, quantity, notes
        });
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
                { model: AdminManagement, as: 'inspector', attributes: ['id', 'full_name', 'employee_id', 'role'] }
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
        console.log('Incoming inspection data:', req.body);
        const inspection = await GauShalaInspection.create(req.body);
        res.status(201).json({ success: true, data: { inspection } });
    } catch (error) {
        console.error('Sequelize error creating inspection:', error);
        next(error);
    }
};

export const getInspectionById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const inspection = await GauShalaInspection.findByPk(id, {
            include: [
                { model: GauShalaFacility, as: 'facility', attributes: ['id', 'name'] },
                { model: AdminManagement, as: 'inspector', attributes: ['id', 'full_name', 'employee_id', 'role'] }
            ]
        });
        if (!inspection) return res.status(404).json({ success: false, message: 'Inspection not found' });
        res.json({ success: true, data: { inspection } });
    } catch (error) {
        next(error);
    }
};

export const updateInspection = async (req, res, next) => {
    try {
        const { id } = req.params;
        const inspection = await GauShalaInspection.findByPk(id);
        if (!inspection) return res.status(404).json({ success: false, message: 'Inspection not found' });

        await inspection.update(req.body);
        res.json({ success: true, data: { inspection } });
    } catch (error) {
        next(error);
    }
};

// Complaints
export const getAllComplaints = async (req, res, next) => {
    try {
        const { facility_id, status } = req.query;
        const where = {};
        if (facility_id) where.gau_shala_facility_id = facility_id;
        if (status) where.status = status;

        const rows = await GauShalaComplaint.findAll({
            where,
            include: [{ model: GauShalaFacility, as: 'facility', attributes: ['id', 'name'] }],
            order: [['created_at', 'DESC']]
        });
        res.json({ success: true, data: { complaints: rows } });
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

export const updateComplaint = async (req, res, next) => {
    try {
        const complaint = await GauShalaComplaint.findByPk(req.params.id);
        if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
        const { status, priority, resolution_notes } = req.body;
        await complaint.update({
            ...(status && { status }),
            ...(priority && { priority }),
            ...(resolution_notes !== undefined && { resolution_notes }),
            ...(status === 'resolved' && { resolved_at: new Date() })
        });
        res.json({ success: true, data: { complaint } });
    } catch (error) {
        next(error);
    }
};

export const deleteComplaint = async (req, res, next) => {
    try {
        const complaint = await GauShalaComplaint.findByPk(req.params.id);
        if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
        await complaint.destroy();
        res.json({ success: true, message: 'Complaint deleted successfully' });
    } catch (error) {
        next(error);
    }
};

export const getReports = async (req, res, next) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const monthStart = today.slice(0, 7);

        const [
            totalFacilities,
            activeFacilities,
            totalCattle,
            healthyCattle,
            sickCattle,
            underTreatmentCattle,
            criticalCattle,
            pendingComplaints,
            inProgressComplaints,
            resolvedComplaints,
            totalComplaints,
            totalInspections,
            totalFeedingRecords,
            allFeedingRecords,
            facilities
        ] = await Promise.all([
            GauShalaFacility.count(),
            GauShalaFacility.count({ where: { status: 'active' } }),
            GauShalaCattle.count(),
            GauShalaCattle.count({ where: { health_status: 'healthy' } }),
            GauShalaCattle.count({ where: { health_status: 'sick' } }),
            GauShalaCattle.count({ where: { health_status: 'under_treatment' } }),
            GauShalaCattle.count({ where: { health_status: 'critical' } }),
            GauShalaComplaint.count({ where: { status: 'pending' } }),
            GauShalaComplaint.count({ where: { status: 'in_progress' } }),
            GauShalaComplaint.count({ where: { status: { [Op.in]: ['resolved', 'closed'] } } }),
            GauShalaComplaint.count(),
            GauShalaInspection.count(),
            GauShalaFeedingRecord.count(),
            GauShalaFeedingRecord.findAll({ attributes: ['record_date', 'quantity'] }),
            GauShalaFacility.findAll({
                attributes: ['id', 'name', 'status'],
                include: [
                    { model: GauShalaCattle, as: 'cattle', attributes: ['id', 'health_status'] },
                    { model: GauShalaFeedingRecord, as: 'feedingRecords', attributes: ['id', 'quantity', 'record_date'] }
                ]
            })
        ]);

        // Calculate feeding stats
        const todayFodder = allFeedingRecords
            .filter(r => (r.record_date || '').slice(0, 10) === today)
            .reduce((sum, r) => sum + parseFloat(r.quantity || 0), 0);

        const monthlyFodder = allFeedingRecords
            .filter(r => (r.record_date || '').slice(0, 7) === monthStart)
            .reduce((sum, r) => sum + parseFloat(r.quantity || 0), 0);

        // Per-facility summary
        const facilityStats = facilities.map(f => ({
            id: f.id,
            name: f.name,
            status: f.status,
            cattleCount: f.cattle?.length || 0,
            healthyCattle: f.cattle?.filter(c => c.health_status === 'healthy').length || 0,
            feedingCount: f.feedingRecords?.length || 0,
            totalFodder: f.feedingRecords?.reduce((sum, r) => sum + parseFloat(r.quantity || 0), 0) || 0
        }));

        res.json({
            success: true,
            data: {
                totalFacilities,
                activeFacilities,
                inactiveFacilities: totalFacilities - activeFacilities,
                totalCattle,
                healthyCattle,
                sickCattle,
                underTreatmentCattle,
                criticalCattle,
                healthRate: totalCattle > 0 ? ((healthyCattle / totalCattle) * 100).toFixed(1) : 0,
                activeComplaints: pendingComplaints + inProgressComplaints,
                pendingComplaints,
                inProgressComplaints,
                resolvedComplaints,
                totalComplaints,
                totalInspections,
                totalFeedingRecords,
                todayFodder,
                monthlyFodder,
                facilityStats
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
        await auditLogger.logCreate(req, req.user, 'CattleMedicalRecord', record.id, { treatment: record.treatment }, `Added medical record: ${record.treatment}`);
        res.status(201).json({ success: true, data: { record } });
    } catch (error) {
        next(error);
    }
};

export const updateMedicalRecord = async (req, res, next) => {
    try {
        const { id } = req.params;
        const record = await CattleMedicalRecord.findByPk(id);
        if (!record) return res.status(404).json({ success: false, message: 'Medical record not found' });

        await record.update(req.body);
        await auditLogger.logUpdate(req, req.user, 'CattleMedicalRecord', id, { treatment: record.treatment }, `Updated medical record: ${record.treatment}`);
        res.json({ success: true, data: { record } });
    } catch (error) {
        next(error);
    }
};

export const deleteMedicalRecord = async (req, res, next) => {
    try {
        const { id } = req.params;
        const record = await CattleMedicalRecord.findByPk(id);
        if (!record) return res.status(404).json({ success: false, message: 'Medical record not found' });

        await auditLogger.logDelete(req, req.user, 'CattleMedicalRecord', id, { treatment: record.treatment }, `Deleted medical record: ${record.treatment}`);
        await record.destroy();
        res.json({ success: true, message: 'Medical record deleted successfully' });
    } catch (error) {
        next(error);
    }
};
