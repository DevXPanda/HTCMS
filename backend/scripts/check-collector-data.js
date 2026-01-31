import { sequelize } from '../config/database.js';
import { Demand, Ward, Property, User } from '../models/index.js';
import { Op } from 'sequelize';

const checkCollectorData = async () => {
  try {
    console.log('🔍 Checking collector data...\n');

    // Check collector user
    const collector = await User.findByPk(3);
    console.log('👤 Collector (ID: 3):');
    console.log(`  Name: ${collector?.firstName} ${collector?.lastName}`);
    console.log(`  Role: ${collector?.role}`);
    console.log(`  Email: ${collector?.email}\n`);

    // Check assigned wards
    const assignedWards = await Ward.findAll({
      where: { collectorId: 3 },
      attributes: ['id', 'wardNumber', 'wardName']
    });
    
    console.log('📍 Assigned Wards:');
    if (assignedWards.length === 0) {
      console.log('  ❌ No wards assigned to this collector');
    } else {
      assignedWards.forEach(ward => {
        console.log(`  ✅ Ward ${ward.wardNumber}: ${ward.wardName} (ID: ${ward.id})`);
      });
    }
    console.log('');

    // Check properties in assigned wards
    if (assignedWards.length > 0) {
      const wardIds = assignedWards.map(w => w.id);
      const properties = await Property.findAll({
        where: { wardId: { [Op.in]: wardIds } },
        attributes: ['id', 'propertyNumber', 'address', 'wardId']
      });
      
      console.log('🏠 Properties in Assigned Wards:');
      if (properties.length === 0) {
        console.log('  ❌ No properties found in assigned wards');
      } else {
        properties.forEach(property => {
          console.log(`  ✅ Property ${property.propertyNumber}: ${property.address} (Ward: ${property.wardId})`);
        });
      }
      console.log('');

      // Check demands for these properties
      const propertyIds = properties.map(p => p.id);
      const demands = await Demand.findAll({
        where: { propertyId: { [Op.in]: propertyIds } },
        attributes: ['id', 'demandNumber', 'propertyId', 'totalAmount', 'balanceAmount', 'status', 'remarks']
      });
      
      console.log('📋 Demands for Properties:');
      if (demands.length === 0) {
        console.log('  ❌ No demands found for properties');
      } else {
        demands.forEach(demand => {
          const isUnified = demand.remarks && demand.remarks.includes('UNIFIED_DEMAND');
          console.log(`  ${isUnified ? '✅' : '❌'} Demand ${demand.demandNumber}: ₹${demand.balanceAmount} (${demand.status}) ${isUnified ? '[UNIFIED]' : ''}`);
        });
      }
      console.log('');

      // Check unified demands specifically
      const unifiedDemands = demands.filter(d => d.remarks && d.remarks.includes('UNIFIED_DEMAND'));
      console.log('🎯 Unified Demands Summary:');
      console.log(`  Total Unified Demands: ${unifiedDemands.length}`);
      console.log(`  Total Unified Amount: ₹${unifiedDemands.reduce((sum, d) => sum + parseFloat(d.balanceAmount || 0), 0)}`);
    }

    console.log('\n✅ Data check completed!');

  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    await sequelize.close();
  }
};

checkCollectorData();
