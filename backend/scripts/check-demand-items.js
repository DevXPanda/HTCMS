import { sequelize } from '../config/database.js';
import { Demand, DemandItem } from '../models/index.js';

const checkDemandItems = async () => {
  try {
    console.log('🔍 Checking demand items for unified demands...\n');

    // Get unified demands
    const unifiedDemands = await Demand.findAll({
      where: {
        remarks: {
          [sequelize.Sequelize.Op.iLike]: '%UNIFIED_DEMAND%'
        }
      },
      attributes: ['id', 'demandNumber', 'serviceType', 'totalAmount', 'balanceAmount']
    });

    console.log(`📋 Found ${unifiedDemands.length} unified demands:\n`);

    for (const demand of unifiedDemands) {
      console.log(`📄 Demand: ${demand.demandNumber} (ID: ${demand.id})`);
      console.log(`  Total Amount: ₹${demand.totalAmount}`);
      console.log(`  Balance Amount: ₹${demand.balanceAmount}`);
      
      // Check demand items
      const demandItems = await DemandItem.findAll({
        where: { demandId: demand.id },
        attributes: ['id', 'taxType', 'referenceId', 'connectionId', 'totalAmount', 'paidAmount']
      });

      console.log(`  📦 Demand Items: ${demandItems.length} found`);
      
      if (demandItems.length === 0) {
        console.log(`  ❌ No demand items found - This is the problem!`);
      } else {
        demandItems.forEach((item, index) => {
          const balance = parseFloat(item.totalAmount) - parseFloat(item.paidAmount);
          console.log(`    ${index + 1}. ${item.taxType}: ₹${item.totalAmount} (Paid: ₹${item.paidAmount}, Balance: ₹${balance})`);
          console.log(`       Reference ID: ${item.referenceId}, Connection ID: ${item.connectionId}`);
        });
      }
      
      console.log('');
    }

    // Check all demand items in the system
    const allDemandItems = await DemandItem.findAll({
      attributes: ['demandId', 'taxType', 'totalAmount'],
      limit: 10
    });

    console.log(`📊 Total demand items in system: ${allDemandItems.length}`);
    console.log('Sample items:');
    allDemandItems.forEach((item, index) => {
      console.log(`  ${index + 1}. Demand ID: ${item.demandId}, Type: ${item.taxType}, Amount: ₹${item.totalAmount}`);
    });

    console.log('\n✅ Demand items check completed!');

  } catch (error) {
    console.error('❌ Error checking demand items:', error);
  } finally {
    await sequelize.close();
  }
};

checkDemandItems();
