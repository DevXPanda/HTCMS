import { FacilityUtilityBill } from '../models/index.js';

export const getAllBills = async (req, res, next) => {
    try {
        const { facility_type, facility_id, utility_type, status } = req.query;
        const where = {};
        if (facility_type) where.facility_type = facility_type;
        if (facility_id) where.facility_id = facility_id;
        if (utility_type) where.utility_type = utility_type;
        if (status) where.payment_status = status;

        const bills = await FacilityUtilityBill.findAll({
            where,
            order: [['bill_date', 'DESC']]
        });
        res.json({ success: true, data: { bills } });
    } catch (error) {
        next(error);
    }
};

export const recordBill = async (req, res, next) => {
    try {
        const bill = await FacilityUtilityBill.create(req.body);
        res.status(201).json({ success: true, data: { bill } });
    } catch (error) {
        next(error);
    }
};

export const updateBillStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const bill = await FacilityUtilityBill.findByPk(id);
        if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });

        bill.payment_status = status;
        await bill.save();
        res.json({ success: true, data: { bill } });
    } catch (error) {
        next(error);
    }
};
