import { sequelize } from '../config/database.js';
import { Demand, WaterBill } from '../models/index.js';

const removePartiallyPaidStatus = async () => {
  try {
    console.log('🔧 Removing partially_paid status from all records...\n');

    // Update demands with partially_paid status to pending using raw SQL
    console.log('📄 Updating Demands...');
    const [demandsUpdated] = await sequelize.query(`
      UPDATE demands 
      SET status = 'pending' 
      WHERE status = 'partially_paid' 
      AND "balanceAmount" > 0
    `);
    console.log(`  ✅ Updated ${demandsUpdated} demands from partially_paid to pending`);

    // Update water bills with partially_paid status to pending using raw SQL
    console.log('\n💧 Updating Water Bills...');
    const [billsUpdated] = await sequelize.query(`
      UPDATE water_bills 
      SET status = 'pending' 
      WHERE status = 'partially_paid' 
      AND "balanceAmount" > 0
    `);
    console.log(`  ✅ Updated ${billsUpdated} water bills from partially_paid to pending`);

    // Verify the updates using raw SQL
    console.log('\n🔍 Verifying results...');
    
    const [demandResults] = await sequelize.query(`
      SELECT COUNT(*) as count FROM demands WHERE status = 'partially_paid'
    `);
    
    const [billResults] = await sequelize.query(`
      SELECT COUNT(*) as count FROM water_bills WHERE status = 'partially_paid'
    `);

    const remainingPartiallyPaidDemands = parseInt(demandResults[0].count);
    const remainingPartiallyPaidBills = parseInt(billResults[0].count);

    console.log(`📊 Remaining partially_paid records:`);
    console.log(`  Demands: ${remainingPartiallyPaidDemands}`);
    console.log(`  Water Bills: ${remainingPartiallyPaidBills}`);

    if (remainingPartiallyPaidDemands === 0 && remainingPartiallyPaidBills === 0) {
      console.log('\n✅ Success! All partially_paid statuses have been removed.');
    } else {
      console.log('\n⚠️  Some partially_paid records remain. This might be due to zero balance records.');
    }

    // Show status distribution using raw SQL
    console.log('\n📈 Current status distribution:');
    
    const [demandStatusResults] = await sequelize.query(`
      SELECT status, COUNT(*) as count 
      FROM demands 
      GROUP BY status 
      ORDER BY status
    `);
    
    console.log('  Demands:');
    demandStatusResults.forEach(ds => {
      console.log(`    ${ds.status}: ${ds.count}`);
    });

    const [billStatusResults] = await sequelize.query(`
      SELECT status, COUNT(*) as count 
      FROM water_bills 
      GROUP BY status 
      ORDER BY status
    `);
    
    console.log('  Water Bills:');
    billStatusResults.forEach(bs => {
      console.log(`    ${bs.status}: ${bs.count}`);
    });

    console.log('\n✅ partially_paid status removal completed!');

  } catch (error) {
    console.error('❌ Error removing partially_paid status:', error);
  } finally {
    await sequelize.close();
  }
};

removePartiallyPaidStatus();
