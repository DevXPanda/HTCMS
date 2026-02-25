import { ToiletComplaint, ToiletFacility } from './models/index.js';

async function test() {
    try {
        console.log('Testing ToiletComplaint.findAll...');
        const complaints = await ToiletComplaint.findAll({
            where: { assignedTo: 1 }, // testing with an integer
            include: [{ model: ToiletFacility, as: 'facility' }],
            order: [['createdAt', 'DESC']]
        });
        console.log('Success, found:', complaints.length);
        process.exit(0);
    } catch (e) {
        console.error('Query failed:', e.message);
        process.exit(1);
    }
}

test();
