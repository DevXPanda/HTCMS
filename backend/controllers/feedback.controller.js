import { CitizenFeedback } from '../models/index.js';

export const getAllFeedback = async (req, res, next) => {
    try {
        const { facility_type, facility_id, min_rating } = req.query;
        const where = {};
        if (facility_type) where.facility_type = facility_type;
        if (facility_id) where.facility_id = facility_id;

        const feedback = await CitizenFeedback.findAll({
            where,
            order: [['feedback_date', 'DESC']]
        });
        res.json({ success: true, data: { feedback } });
    } catch (error) {
        next(error);
    }
};

export const submitFeedback = async (req, res, next) => {
    try {
        const feedback = await CitizenFeedback.create(req.body);
        res.status(201).json({ success: true, data: { feedback } });
    } catch (error) {
        next(error);
    }
};
