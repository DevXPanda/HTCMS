import { MrfFacility, MrfSale, Ward, MrfWasteEntry, MrfWorkerAssignment, MrfTask, Worker, AdminManagement, ToiletComplaint } from '../models/index.js';
import { Op, fn, col, literal } from 'sequelize';
import { auditLogger } from '../utils/auditLogger.js';
import { sequelize } from '../config/database.js';

export const getAllFacilities = async (req, res, next) => {
    try {
        const { ward_id, status, search, page = 1, limit = 10 } = req.query;
        const where = {};
        if (ward_id) where.ward_id = ward_id;

        // Ensure status is lowercase to match DB enum if applicable
        if (status) where.status = status.toLowerCase();

        if (search) {
            where.name = { [Op.iLike]: `%${search}%` };
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);



        const { count, rows } = await MrfFacility.findAndCountAll({
            where,
            include: [
                { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] },
                { model: AdminManagement, as: 'supervisor', attributes: ['id', 'full_name'] }
            ],
            limit: parseInt(limit),
            offset,
            order: [['created_at', 'DESC']]
        });

        const facilityIds = rows.map(r => r.id);
        const workerCounts = facilityIds.length > 0
            ? await MrfWorkerAssignment.findAll({
                attributes: ['mrf_facility_id', [fn('COUNT', col('id')), 'workerCount']],
                where: { mrf_facility_id: { [Op.in]: facilityIds }, isActive: true },
                group: ['mrf_facility_id'],
                raw: true
            })
            : [];
        const countMap = Object.fromEntries(
            workerCounts.map(c => [c.mrf_facility_id, Number(c.workerCount) || 0])
        );

        const facilities = rows.map(f => {
            const plain = f.get ? f.get({ plain: true }) : f;
            plain.workerCount = countMap[plain.id] ?? 0;
            return plain;
        });

        res.json({ success: true, data: { facilities, pagination: { total: count, page, limit, pages: Math.ceil(count / limit) } } });
    } catch (error) {
        console.error('Sequelize Error in getAllFacilities:');
        console.error(error.stack || error);
        next(error);
    }
};

export const getFacilityById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const facility = await MrfFacility.findByPk(id, {
            include: [
                { model: Ward, as: 'ward' },
                { model: AdminManagement, as: 'supervisor', attributes: ['id', 'full_name', 'phone_number'] }
            ]
        });

        if (!facility) {
            return res.status(404).json({ success: false, message: 'MRF facility not found' });
        }

        const facilityIdNum = parseInt(id, 10);
        const today = new Date().toISOString().split('T')[0];
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

        const [todayWaste, monthlyWaste, workerCount, activeTasks] = await Promise.all([
            MrfWasteEntry.sum('quantity_kg', { where: { mrf_facility_id: facilityIdNum, entry_date: today } }).catch(() => 0),
            MrfWasteEntry.sum('quantity_kg', { where: { mrf_facility_id: facilityIdNum, entry_date: { [Op.gte]: firstDayOfMonth } } }).catch(() => 0),
            MrfWorkerAssignment.count({ where: { mrf_facility_id: facilityIdNum, isActive: true } }).catch(() => 0),
            MrfTask.count({ where: { mrf_facility_id: facilityIdNum, status: { [Op.ne]: 'Completed' } } }).catch(() => 0)
        ]);

        res.json({
            success: true,
            data: {
                facility,
                stats: {
                    todayWaste: todayWaste || 0,
                    monthlyWaste: monthlyWaste || 0,
                    workerCount: workerCount || 0,
                    activeTasks: activeTasks || 0
                }
            }
        });
    } catch (error) {
        console.error(`❌ Error in getFacilityById for ID ${req.params.id}:`);
        console.error(error.stack || error);
        next(error);
    }
};

export const createFacility = async (req, res, next) => {
    try {
        const facility = await MrfFacility.create(req.body);
        await auditLogger.logCreate(req, req.user, 'MrfFacility', facility.id, facility.toJSON(), `Created MRF facility: ${facility.name}`);
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

// Waste Entries
export const getWasteEntries = async (req, res, next) => {
    try {
        const { facility_id, mrf_facility_id, startDate, endDate } = req.query;
        const targetFacilityId = mrf_facility_id || facility_id;
        const where = { mrf_facility_id: targetFacilityId };

        if (startDate && endDate) {
            where.entry_date = { [Op.between]: [startDate, endDate] };
        }
        const entries = await MrfWasteEntry.findAll({
            where,
            include: [{ model: AdminManagement, as: 'receiver', attributes: ['full_name'] }],
            order: [['entry_date', 'DESC'], ['createdAt', 'DESC']]
        });
        res.json({ success: true, data: { entries } });
    } catch (error) {
        console.error('Error in getWasteEntries:', error);
        next(error);
    }
};

export const createWasteEntry = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const entry = await MrfWasteEntry.create(req.body, { transaction: t });
        await auditLogger.logCreate(req, req.user, 'MrfWasteEntry', entry.id, entry.toJSON(), `Logged waste entry: ${entry.quantity_kg}kg ${entry.waste_type} at MRF ID ${entry.mrf_facility_id}`);
        await t.commit();
        res.status(201).json({ success: true, data: { entry } });
    } catch (error) {
        await t.rollback();
        next(error);
    }
};

// Worker Assignments
export const getAssignments = async (req, res, next) => {
    try {
        const { facility_id, mrf_facility_id } = req.query;
        const rawId = mrf_facility_id || facility_id;
        const targetFacilityId = rawId != null && rawId !== '' ? parseInt(String(rawId), 10) : NaN;
        if (Number.isNaN(targetFacilityId)) {
            return res.json({ success: true, data: { assignments: [] } });
        }
        const assignments = await MrfWorkerAssignment.findAll({
            where: { mrf_facility_id: targetFacilityId, isActive: true },
            include: [{ model: Worker, as: 'worker', attributes: ['id', 'full_name', 'employee_code', 'worker_type'] }]
        });
        res.json({ success: true, data: { assignments } });
    } catch (error) {
        next(error);
    }
};

export const assignWorker = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { worker_id, shift, mrf_facility_id } = req.body;

        // Prevent duplicate active assignment for same shift
        const existing = await MrfWorkerAssignment.findOne({
            where: { worker_id, shift, isActive: true },
            transaction: t
        });
        if (existing) {
            await t.rollback();
            return res.status(400).json({ success: false, message: `Worker is already actively assigned to the ${shift} shift.` });
        }

        const assignment = await MrfWorkerAssignment.create(req.body, { transaction: t });
        await auditLogger.logCreate(req, req.user, 'MrfWorkerAssignment', assignment.id, assignment.toJSON(), `Assigned worker ${worker_id} to MRF ${mrf_facility_id} for ${shift} shift`);
        await t.commit();
        res.status(201).json({ success: true, data: { assignment } });
    } catch (error) {
        await t.rollback();
        next(error);
    }
};

export const removeAssignment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const assignment = await MrfWorkerAssignment.findByPk(id);
        if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

        assignment.isActive = false;
        await assignment.save();
        await auditLogger.logUpdate(req, req.user, 'MrfWorkerAssignment', assignment.id, { isActive: true }, { isActive: false }, `Deactivated worker assignment ${id}`);
        res.json({ success: true, message: 'Worker assignment deactivated' });
    } catch (error) {
        next(error);
    }
};

// Tasks
export const getTasks = async (req, res, next) => {
    try {
        const { facility_id, mrf_facility_id, status } = req.query;
        const targetFacilityId = mrf_facility_id || facility_id;
        const where = { mrf_facility_id: targetFacilityId };
        if (status) where.status = status;

        const tasks = await MrfTask.findAll({
            where,
            include: [
                { model: Worker, as: 'worker', attributes: ['full_name'] },
                { model: AdminManagement, as: 'supervisor', attributes: ['full_name'] }
            ],
            order: [['assigned_date', 'DESC']]
        });
        res.json({ success: true, data: { tasks } });
    } catch (error) {
        next(error);
    }
};

export const createTask = async (req, res, next) => {
    try {
        const task = await MrfTask.create(req.body);
        await auditLogger.logCreate(req, req.user, 'MrfTask', task.id, task.toJSON(), `Created MRF task: ${task.task_type} for worker ${task.worker_id}`);
        res.status(201).json({ success: true, data: { task } });
    } catch (error) {
        next(error);
    }
};

export const updateTaskStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;
        const task = await MrfTask.findByPk(id);
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

        const previousStatus = task.status;
        task.status = status;
        if (remarks) task.remarks = remarks;
        if (status === 'Completed') task.completed_at = new Date();

        await task.save();
        await auditLogger.logUpdate(req, req.user, 'MrfTask', task.id, { status: previousStatus }, { status }, `Updated task ${id} status to ${status}`);
        res.json({ success: true, data: { task } });
    } catch (error) {
        next(error);
    }
};

// Complaints
export const getLinkedComplaints = async (req, res, next) => {
    try {
        const { id } = req.params; // MRF ID from URL
        const { facility_id } = req.query; // Fallback from query
        const targetFacilityId = id || facility_id;

        const complaints = await ToiletComplaint.findAll({
            where: { mrf_facility_id: targetFacilityId },
            order: [['createdAt', 'DESC']]
        });
        res.json({ success: true, data: { complaints } });
    } catch (error) {
        next(error);
    }
};

export const getReports = async (req, res, next) => {
    try {
        const [
            totalFacilities,
            activeFacilities,
            maintenanceFacilities,
            totalWaste
        ] = await Promise.all([
            MrfFacility.count(),
            MrfFacility.count({ where: { status: 'active' } }),
            MrfFacility.count({ where: { status: 'maintenance' } }),
            MrfWasteEntry.sum('quantity_kg')
        ]);

        res.json({
            success: true,
            data: {
                totalFacilities,
                activeFacilities,
                maintenanceFacilities,
                totalProcessing: (totalWaste || 0) / 1000,
                efficiency: 88 // Placeholder for complex logic
            }
        });
    } catch (error) {
        next(error);
    }
};

export const exportWasteReport = async (req, res, next) => {
    try {
        const { mrf_facility_id, startDate, endDate } = req.query;
        const where = {};
        if (mrf_facility_id) where.mrf_facility_id = mrf_facility_id;
        if (startDate && endDate) {
            where.entry_date = { [Op.between]: [startDate, endDate] };
        }

        const entries = await MrfWasteEntry.findAll({
            where,
            include: [
                { model: MrfFacility, as: 'facility', attributes: ['name'] },
                { model: AdminManagement, as: 'receiver', attributes: ['full_name'] }
            ],
            order: [['entry_date', 'DESC']]
        });

        // Generate CSV
        const headers = ['Date', 'Facility', 'Material Type', 'Quantity (KG)', 'Source', 'Received By'];
        const rows = entries.map(e => [
            e.entry_date,
            e.facility?.name || 'N/A',
            e.waste_type,
            e.quantity_kg,
            e.source,
            e.receiver?.full_name || 'N/A'
        ]);

        const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=mrf_waste_report_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csvContent);
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
