import { sequelize } from './config/database.js';

async function updateConstraints() {
    try {
        console.log('Updating toilet_complaints_complaintType_check constraint...');

        // 1. Drop existing complaintType constraint
        await sequelize.query(`
            ALTER TABLE toilet_complaints 
            DROP CONSTRAINT IF EXISTS "toilet_complaints_complaintType_check"
        `);

        // 2. Add new complaintType constraint with expanded values
        await sequelize.query(`
            ALTER TABLE toilet_complaints 
            ADD CONSTRAINT "toilet_complaints_complaintType_check" 
            CHECK ("complaintType" = ANY (ARRAY[
                'Cleanliness'::text, 
                'Water Supply'::text, 
                'Electricity'::text, 
                'Maintenance'::text, 
                'Odor'::text, 
                'Security'::text, 
                'Safety'::text, 
                'Other'::text
            ]))
        `);

        console.log('Updating toilet_complaints_status_check constraint...');

        // 3. Drop existing status constraint
        await sequelize.query(`
            ALTER TABLE toilet_complaints 
            DROP CONSTRAINT IF EXISTS "toilet_complaints_status_check"
        `);

        // 4. Add new status constraint allowing 'in progress' with space
        await sequelize.query(`
            ALTER TABLE toilet_complaints 
            ADD CONSTRAINT "toilet_complaints_status_check" 
            CHECK (status = ANY (ARRAY[
                'pending'::text, 
                'in progress'::text, 
                'in_progress'::text, 
                'resolved'::text, 
                'closed'::text
            ]))
        `);

        console.log('Constraints updated successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Failed to update constraints:', error);
        process.exit(1);
    }
}

updateConstraints();
