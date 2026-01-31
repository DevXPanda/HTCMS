import { sequelize } from '../config/database.js';
import { Demand, DemandItem } from '../models/index.js';

const fixUnifiedDemandItems = async () => {
  try {
    console.log('🔧 Fixing unified demand items...\n');

    // Get unified demands with incomplete items
    const unifiedDemands = await Demand.findAll({
      where: {
        remarks: {
          [sequelize.Sequelize.Op.iLike]: '%UNIFIED_DEMAND%'
        }
      },
      attributes: ['id', 'demandNumber', 'assessmentId', 'remarks']
    });

    console.log(`📋 Processing ${unifiedDemands.length} unified demands:\n`);

    for (const demand of unifiedDemands) {
      console.log(`📄 Processing Demand: ${demand.demandNumber} (ID: ${demand.id})`);
      
      // Delete existing items for this demand
      await DemandItem.destroy({
        where: { demandId: demand.id }
      });
      console.log(`  🗑️ Deleted existing demand items`);

      // Parse remarks to get breakdown
      let breakdown = null;
      let propertyAssessmentId = null;
      try {
        const remarksObj = JSON.parse(demand.remarks);
        breakdown = remarksObj.breakdown;
        propertyAssessmentId = remarksObj.propertyAssessmentId;
      } catch (e) {
        console.log(`  ❌ Could not parse remarks JSON\n`);
        continue;
      }

      if (!breakdown) {
        console.log(`  ❌ No breakdown found in remarks\n`);
        continue;
      }

      console.log(`  📊 Creating demand items from breakdown:`);

      const items = [];

      // Create property tax item if exists
      if (breakdown.propertyTax && breakdown.propertyTax.hasAssessment) {
        const propertyItem = {
          demandId: demand.id,
          taxType: 'PROPERTY',
          referenceId: propertyAssessmentId || demand.assessmentId || null,
          connectionId: null,
          baseAmount: breakdown.propertyTax.baseAmount || 0,
          arrearsAmount: breakdown.propertyTax.arrears || 0,
          penaltyAmount: breakdown.penalty || 0,
          interestAmount: breakdown.interest || 0,
          totalAmount: breakdown.propertyTax.baseAmount + (breakdown.propertyTax.arrears || 0) + (breakdown.penalty || 0) + (breakdown.interest || 0),
          paidAmount: 0,
          description: `Property tax for ${demand.demandNumber}`
        };
        
        if (propertyItem.referenceId) {
          items.push(propertyItem);
          console.log(`    🏠 PROPERTY: ₹${propertyItem.totalAmount} (Assessment: ${propertyItem.referenceId})`);
        }
      }

      // Create water tax items if exist
      if (breakdown.waterTax && breakdown.waterTax.connections) {
        for (const connection of breakdown.waterTax.connections) {
          const waterItem = {
            demandId: demand.id,
            taxType: 'WATER',
            referenceId: connection.assessmentId,
            connectionId: connection.connectionId,
            baseAmount: connection.amount || 0,
            arrearsAmount: 0,
            penaltyAmount: 0,
            interestAmount: 0,
            totalAmount: connection.amount || 0,
            paidAmount: 0,
            description: `Water tax for connection ${connection.connectionId}`
          };
          items.push(waterItem);
          console.log(`    💧 WATER: ₹${waterItem.totalAmount} (Assessment: ${waterItem.referenceId}, Connection: ${waterItem.connectionId})`);
        }
      }

      // Create demand items in database
      if (items.length > 0) {
        await DemandItem.bulkCreate(items);
        console.log(`  ✅ Created ${items.length} demand items\n`);
      } else {
        console.log(`  ❌ No items to create\n`);
      }
    }

    // Verify the results
    console.log('🔍 Verifying results...\n');
    
    for (const demand of unifiedDemands) {
      const items = await DemandItem.findAll({
        where: { demandId: demand.id },
        attributes: ['taxType', 'totalAmount', 'paidAmount']
      });

      const totalItemAmount = items.reduce((sum, item) => sum + parseFloat(item.totalAmount), 0);
      const totalPaidAmount = items.reduce((sum, item) => sum + parseFloat(item.paidAmount), 0);
      
      console.log(`📄 ${demand.demandNumber}:`);
      console.log(`  Items: ${items.length}`);
      console.log(`  Items Total: ₹${totalItemAmount}`);
      console.log(`  Demand Total: ₹${demand.totalAmount}`);
      console.log(`  Match: ${totalItemAmount === parseFloat(demand.totalAmount) ? '✅' : '❌'}\n`);
    }

    console.log('✅ Unified demand items fix completed!');

  } catch (error) {
    console.error('❌ Error fixing demand items:', error);
  } finally {
    await sequelize.close();
  }
};

fixUnifiedDemandItems();
