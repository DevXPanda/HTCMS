
import { sequelize } from '../config/database.js';
import { Assessment, WaterTaxAssessment } from '../models/index.js';

async function inspect() {
    try {
        await sequelize.authenticate();
        console.log('Connected.');

        const waterAssessments = await WaterTaxAssessment.findAll({
            order: [['id', 'DESC']],
            limit: 10,
            attributes: ['id', 'assessmentNumber', 'createdAt', 'status']
        });
        console.log('Last 10 Water Assessments:', JSON.stringify(waterAssessments, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        await sequelize.close();
    }
}

inspect();
