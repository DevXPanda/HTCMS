import { MrfFacility, MrfSale, Ward } from '../models/index.js';
import { Op } from 'sequelize';
import { auditLogger } from '../utils/auditLogger.js';

export const getAllFacilities = async (req, res, next) => {
    try {
        const { ward_id, status, search, page = 1, limit = 10 } = req.query;
        const where = {};
        if (ward_id) where.ward_id = ward_id;
        if (status) where.status = status;
        if (search) {
            where.name = { [Op.iLike]: `%${search}%` };
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const { count, rows } = await MrfFacility.findAndCountAll({
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
        const facility = await MrfFacility.findByPk(id, {
            include: [{ model: Ward, as: 'ward' }]
        });
        if (!facility) return res.status(404).json({ success: false, message: 'MRF facility not found' });
        res.json({ success: true, data: { facility } });
    } catch (error) {
        next(error);
    }
};

export const createFacility = async (req, res, next) => {
    try {
        const facility = await MrfFacility.create(req.body);
        await auditLogger.logCreate(req, req.user, 'MrfFacility', facility.id, { name: facility.name }, `Created MRF facility: ${facility.name}`);
        res.status(201).json({ success: true, data: { facility } });
    } catch (error) {
        next(error);
    }
};

export const updateFacility = async (req, res, next) => {
    try {
        const { id } = req.params;
        const facility = await MrfFacility.findByPk(id);
        if (!facility) return res.status(404).json({ success: false, message: 'MRF facility not found' });
        const previousData = facility.toJSON();
        await facility.update(req.body);
        await auditLogger.logUpdate(req, req.user, 'MrfFacility', facility.id, previousData, facility.toJSON(), `Updated MRF facility: ${facility.name}`);
        res.json({ success: true, data: { facility } });
    } catch (error) {
        next(error);
    }
};

export const deleteFacility = async (req, res, next) => {
    try {
        const { id } = req.params;
        const facility = await MrfFacility.findByPk(id);
        if (!facility) return res.status(404).json({ success: false, message: 'MRF facility not found' });
        facility.status = 'inactive';
        await facility.save();
        await auditLogger.logDelete(req, req.user, 'MrfFacility', facility.id, facility.toJSON(), `Deactivated MRF facility: ${facility.name}`);
        res.json({ success: true, message: 'MRF facility deactivated successfully' });
    } catch (error) {
        next(error);
    }
};

export const getReports = async (req, res, next) => {
    try {
        const [
            totalFacilities,
            activeFacilities,
            maintenanceFacilities
        ] = await Promise.all([
            MrfFacility.count(),
            MrfFacility.count({ where: { status: 'active' } }),
            MrfFacility.count({ where: { status: 'maintenance' } })
        ]);

        res.json({
            success: true,
            data: {
                totalFacilities,
                activeFacilities,
                maintenanceFacilities,
                totalProcessing: 124.5, // Mock for now as processing model isn't here yet
                efficiency: 88
            }
        });
    } catch (error) {
        next(error);
    }
};

// Sales
export const getAllSales = async (req, res, next) => {
    try {
        const { facility_id, material_type } = req.query;
        const where = {};
        if (facility_id) where.mrf_facility_id = facility_id;
        if (material_type) where.material_type = material_type;

        const sales = await MrfSale.findAll({
            where,
            order: [['sale_date', 'DESC']]
        });
        res.json({ success: true, data: { sales } });
    } catch (error) {
        next(error);
    }
};

export const createSale = async (req, res, next) => {
    try {
        const sale = await MrfSale.create(req.body);
        res.status(201).json({ success: true, data: { sale } });
    } catch (error) {
        next(error);
    }
};
