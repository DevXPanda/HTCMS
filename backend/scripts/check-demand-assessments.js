import { sequelize } from '../config/database.js';
import { Demand } from '../models/index.js';

const checkDemandAssessments = async () => {
  try {
    console.log('🔍 Checking unified demands and their assessment IDs...\n');

    // Get unified demands
    const unifiedDemands = await Demand.findAll({
      where: {
        remarks: {
          [sequelize.Sequelize.Op.iLike]: '%UNIFIED_DEMAND%'
        }
      },
      attributes: ['id', 'demandNumber', 'assessmentId', 'waterTaxAssessmentId', 'remarks']
    });

    console.log(`📋 Found ${unifiedDemands.length} unified demands:\n`);

    for (const demand of unifiedDemands) {
      console.log(`📄 Demand: ${demand.demandNumber} (ID: ${demand.id})`);
      console.log(`  Assessment ID: ${demand.assessmentId}`);
      console.log(`  Water Tax Assessment ID: ${demand.waterTaxAssessmentId}`);
      
      // Parse remarks to see what's inside
      try {
        const remarksObj = JSON.parse(demand.remarks);
        console.log(`  Remarks Breakdown:`);
        console.log(`    Type: ${remarksObj.type}`);
        console.log(`    Property Assessment ID: ${remarksObj.propertyAssessmentId}`);
        console.log(`    Water Assessment IDs: ${JSON.stringify(remarksObj.waterAssessmentIds)}`);
        
        if (remarksObj.breakdown) {
          console.log(`    Property Tax Assessment: ${remarksObj.breakdown.propertyTax?.assessmentId}`);
          console.log(`    Property Tax Base Amount: ${remarksObj.breakdown.propertyTax?.baseAmount}`);
        }
      } catch (e) {
        console.log(`  ❌ Could not parse remarks`);
      }
      
      console.log('');
    }

    console.log('✅ Assessment check completed!');

  } catch (error) {
    console.error('❌ Error checking assessments:', error);
  } finally {
    await sequelize.close();
  }
};

checkDemandAssessments();
