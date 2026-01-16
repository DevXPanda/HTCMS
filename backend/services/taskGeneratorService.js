import { CollectorTask, FollowUp, Demand, Property, User, Ward } from '../models/index.js';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * Get today's date in Asia/Kolkata timezone as YYYY-MM-DD
 * This ensures consistent date handling across the system
 */
export const getTodayInKolkata = () => {
  const now = new Date();
  
  // Get date components in Asia/Kolkata timezone
  const kolkataDateParts = now.toLocaleString('en-CA', { 
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  // toLocaleString with 'en-CA' returns YYYY-MM-DD format directly
  const dateStr = kolkataDateParts; // Already in YYYY-MM-DD format
  
  // Create date object for comparison (in local time, but represents Kolkata date)
  const kolkataDate = new Date(dateStr + 'T00:00:00');
  kolkataDate.setHours(0, 0, 0, 0);
  
  return {
    date: kolkataDate,
    dateStr: dateStr,
    timestamp: kolkataDate
  };
};

/**
 * Generate tasks for a specific collector
 * This is a reusable function that can be called from cron or on-demand
 */
export const generateTasksForCollector = async (collector, todayInfo, transaction = null) => {
  const { date, dateStr } = todayInfo;
  const wardIds = collector.assignedWards?.map(w => w.id) || [];

  if (wardIds.length === 0) {
    console.log(`⚠️  Collector ${collector.id} has no assigned wards. Skipping task generation.`);
    return { tasksGenerated: 0, demandsProcessed: 0, skipped: [] };
  }

  console.log(`📋 Generating tasks for collector ${collector.id} (${collector.firstName} ${collector.lastName})`);
  console.log(`   Assigned wards: ${wardIds.join(', ')}`);

  // Get demands that are due today OR overdue (dueDate <= today)
  // AND have balance > 0
  // AND are in collector's assigned wards
  const eligibleDemands = await Demand.findAll({
    where: {
      status: {
        [Op.in]: ['pending', 'partially_paid', 'overdue']
      },
      balanceAmount: {
        [Op.gt]: 0
      },
      dueDate: {
        [Op.lte]: date // Include today's due dates (<= instead of <)
      }
    },
    include: [
      {
        model: Property,
        as: 'property',
        where: {
          wardId: {
            [Op.in]: wardIds
          }
        },
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'firstName', 'lastName']
          },
          {
            model: Ward,
            as: 'ward',
            attributes: ['id', 'wardNumber', 'wardName']
          }
        ],
        required: true
      }
    ],
    transaction
  });

  console.log(`   Found ${eligibleDemands.length} eligible demands (due today or overdue)`);

  let tasksGenerated = 0;
  const skipped = [];

  // Get initial count of existing tasks for this collector on this date (for sequence)
  const existingTasksCount = await CollectorTask.count({
    where: {
      collectorId: collector.id,
      taskDate: dateStr
    },
    transaction
  });

  // Format date as YYYYMMDD
  const dateFormatted = dateStr.replace(/-/g, '');

  for (const demand of eligibleDemands) {
    try {
      // Get or create follow-up
      let followUp = await FollowUp.findOne({
        where: { demandId: demand.id },
        transaction
      });

      if (!followUp) {
        // Calculate overdue days for new follow-up
        const dueDate = new Date(demand.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const overdueDays = Math.max(0, Math.floor((date - dueDate) / (1000 * 60 * 60 * 24)));

        followUp = await FollowUp.create({
          demandId: demand.id,
          propertyId: demand.propertyId,
          ownerId: demand.property?.ownerId || null,
          visitCount: 0,
          escalationLevel: 0,
          escalationStatus: 'none',
          priority: overdueDays > 30 ? 'high' : overdueDays > 15 ? 'medium' : 'low',
          isResolved: false
        }, { transaction });
        
        console.log(`   Created new follow-up for demand ${demand.demandNumber}`);
      }

      // Check if task already exists for today
      const existingTask = await CollectorTask.findOne({
        where: {
          collectorId: collector.id,
          demandId: demand.id,
          taskDate: dateStr,
          status: {
            [Op.in]: ['pending', 'in_progress']
          }
        },
        transaction
      });

      if (existingTask) {
        skipped.push({ demandId: demand.id, reason: 'Task already exists for today' });
        continue;
      }

      // Determine task type and priority
      const dueDate = new Date(demand.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const isDueToday = dueDate.getTime() === date.getTime();
      const overdueDays = Math.max(0, Math.floor((date - dueDate) / (1000 * 60 * 60 * 24)));
      
      let taskType = 'overdue_followup';
      let priority = 'medium';
      let actionRequired = '';

      // Priority 1: Promised payment date reached
      if (followUp.expectedPaymentDate && new Date(followUp.expectedPaymentDate) <= date) {
        taskType = 'promised_payment';
        priority = 'high';
        actionRequired = `Citizen promised to pay by ${new Date(followUp.expectedPaymentDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}. Follow up for payment.`;
      }
      // Priority 2: Next follow-up date reached
      else if (followUp.nextFollowUpDate && new Date(followUp.nextFollowUpDate) <= date) {
        taskType = 'overdue_followup';
        priority = followUp.visitCount >= 2 ? 'high' : 'medium';
        actionRequired = `Follow up required. Last visit: ${followUp.lastVisitDate ? new Date(followUp.lastVisitDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Never'}. Visit count: ${followUp.visitCount}`;
      }
      // Priority 3: Enforcement eligible
      else if (followUp.isEnforcementEligible && !followUp.noticeTriggered) {
        taskType = 'enforcement_visit';
        priority = 'critical';
        actionRequired = `Enforcement eligible after ${followUp.visitCount} visits. Final warning visit required.`;
      }
      // Priority 4: Multiple visits completed
      else if (followUp.visitCount >= 3) {
        taskType = 'escalation_visit';
        priority = 'critical';
        actionRequired = `Escalation visit required. ${followUp.visitCount} visits completed.`;
      }
      // Priority 5: Due today or overdue
      else if (isDueToday) {
        taskType = 'due_today';
        priority = 'high';
        const balanceAmount = parseFloat(demand.balanceAmount || 0);
        actionRequired = `Demand due today. Amount due: ₹${balanceAmount.toFixed(2)}. Collect payment or record visit.`;
      }
      // Priority 6: Overdue
      else {
        taskType = 'overdue_followup';
        priority = overdueDays > 60 ? 'critical' : overdueDays > 30 ? 'high' : 'medium';
        const balanceAmount = parseFloat(demand.balanceAmount || 0);
        actionRequired = `Demand overdue by ${overdueDays} days. Amount due: ₹${balanceAmount.toFixed(2)}`;
      }

      // Ensure numeric values
      const dueAmount = parseFloat(demand.balanceAmount || 0);
      const visitCount = parseInt(followUp.visitCount || 0);

      // Generate unique task number: TASK-YYYYMMDD-{collectorId}-{sequence}
      // Sequence is per-day per-collector, incrementing as we create tasks
      const sequence = String(existingTasksCount + tasksGenerated + 1).padStart(3, '0'); // 001, 002, etc.
      const taskNumber = `TASK-${dateFormatted}-${collector.id}-${sequence}`;

      // Create task
      await CollectorTask.create({
        taskNumber: taskNumber,
        collectorId: collector.id,
        demandId: demand.id,
        propertyId: demand.propertyId,
        ownerId: demand.property?.ownerId || null,
        followUpId: followUp.id,
        taskDate: dateStr,
        taskType,
        priority,
        actionRequired,
        citizenName: demand.property?.owner ? `${demand.property.owner.firstName} ${demand.property.owner.lastName}` : 'Unknown',
        propertyNumber: demand.property?.propertyNumber || 'N/A',
        wardNumber: demand.property?.ward?.wardNumber || 'N/A',
        dueAmount: dueAmount,
        overdueDays: overdueDays,
        visitCount: visitCount,
        lastVisitDate: followUp.lastVisitDate,
        lastVisitStatus: followUp.lastVisitType ? `${followUp.lastVisitType} - ${followUp.lastCitizenResponse}` : 'No visits yet',
        expectedPaymentDate: followUp.expectedPaymentDate,
        generatedBy: 'system',
        generationReason: isDueToday 
          ? `Auto-generated: Demand due today`
          : `Auto-generated: Demand overdue by ${overdueDays} days`,
        isAutoGenerated: true
      }, { transaction });

      tasksGenerated++;
      console.log(`   ✅ Created task for demand ${demand.demandNumber} (${taskType}, ${priority})`);
    } catch (error) {
      console.error(`   ❌ Error creating task for demand ${demand.demandNumber}:`, error.message);
      skipped.push({ demandId: demand.id, reason: `Error: ${error.message}` });
    }
  }

  return {
    tasksGenerated,
    demandsProcessed: eligibleDemands.length,
    skipped
  };
};
