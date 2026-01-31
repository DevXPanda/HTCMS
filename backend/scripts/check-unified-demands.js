import { sequelize } from '../config/database.js';
import { Demand, Assessment, WaterTaxAssessment } from '../models/index.js';

const checkUnifiedDemands = async () => {
  try {
    console.log('🔍 Checking unified demands...\n');

    // Get unified demands
    const unifiedDemands = await Demand.findAll({
      where: {
        remarks: {
          [sequelize.Sequelize.Op.iLike]: '%UNIFIED_DEMAND%'
        }
      },
      attributes: ['id', 'demandNumber', 'serviceType', 'assessmentId', 'waterTaxAssessmentId', 'remarks', 'status', 'totalAmount', 'balanceAmount']
    });

    console.log(`📋 Found ${unifiedDemands.length} unified demands:\n`);

    for (const demand of unifiedDemands) {
      console.log(`📄 Demand: ${demand.demandNumber}`);
      console.log(`  ID: ${demand.id}`);
      console.log(`  Service Type: ${demand.serviceType}`);
      console.log(`  Assessment ID: ${demand.assessmentId}`);
      console.log(`  Water Tax Assessment ID: ${demand.waterTaxAssessmentId}`);
      console.log(`  Remarks: ${demand.remarks}`);
      console.log(`  Status: ${demand.status}`);
      console.log(`  Total Amount: ₹${demand.totalAmount}`);
      console.log(`  Balance Amount: ₹${demand.balanceAmount}`);
      
      // Check if it's properly detected as unified
      const isUnified = demand.remarks && typeof demand.remarks === 'string' && demand.remarks.includes('UNIFIED_DEMAND');
      console.log(`  Is Unified: ${isUnified ? '✅' : '❌'}`);
      
      // Check related assessments
      if (demand.assessmentId) {
        const assessment = await Assessment.findByPk(demand.assessmentId, {
          attributes: ['id', 'assessmentNumber', 'status']
        });
        console.log(`  Related Assessment: ${assessment ? assessment.assessmentNumber : 'Not found'} (${assessment?.status || 'N/A'})`);
      }
      
      if (demand.waterTaxAssessmentId) {
        const waterAssessment = await WaterTaxAssessment.findByPk(demand.waterTaxAssessmentId, {
          attributes: ['id', 'assessmentNumber', 'status']
        });
        console.log(`  Related Water Assessment: ${waterAssessment ? waterAssessment.assessmentNumber : 'Not found'} (${waterAssessment?.status || 'N/A'})`);
      }
      
      console.log('');
    }

    console.log('✅ Unified demands check completed!');

  } catch (error) {
    console.error('❌ Error checking unified demands:', error);
  } finally {
    await sequelize.close();
  }
};

checkUnifiedDemands();
