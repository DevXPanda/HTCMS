import cron from 'node-cron';
import { Demand, PenaltyRule, Notice } from '../models/index.js';
import { Op, Sequelize } from 'sequelize';
import {
  getActivePenaltyRule,
  calculateOverdueDays,
  shouldApplyPenalty,
  applyPenaltyToDemand
} from './penaltyCalculator.js';
import { createAuditLog } from '../utils/auditLogger.js';

/**
 * Penalty Cron Job Service
 * Automatically applies penalties and interest to overdue demands
 */

let cronJob = null;
let lastRunStatus = {
  lastRunAt: null,
  demandsProcessed: 0,
  demandsUpdated: 0,
  totalPenaltyApplied: 0,
  totalInterestApplied: 0,
  errors: [],
  skipped: []
};

/**
 * Create a mock request object for audit logging
 */
const createMockRequest = () => {
  return {
    ip: '127.0.0.1',
    headers: {
      'user-agent': 'HTCMS-CronJob/1.0'
    }
  };
};

/**
 * Create a system user object for audit logging
 */
const createSystemUser = () => {
  return {
    id: null,
    role: 'system',
    firstName: 'System',
    lastName: 'Cron Job'
  };
};

/**
 * Check if notice escalation is needed
 */
const checkNoticeEscalation = async (demand, overdueDays) => {
  try {
    // Get existing notices for this demand
    const existingNotices = await Notice.findAll({
      where: { demandId: demand.id },
      order: [['createdAt', 'DESC']]
    });

    if (existingNotices.length === 0) {
      // No notices exist, but we won't auto-create them here
      // Admin/Assessor should create initial reminder notice
      return;
    }

    // Check if penalty threshold crossed (e.g., 30 days overdue)
    const penaltyThresholdDays = 30;
    const finalWarrantThresholdDays = 90;

    if (overdueDays >= finalWarrantThresholdDays) {
      // Check if final warrant notice exists
      const hasFinalWarrant = existingNotices.some(n => n.noticeType === 'final_warrant');
      if (!hasFinalWarrant) {
        // Auto-escalate to final warrant (this would require admin approval in production)
        // For now, we just log it - actual escalation should be done by admin

      }
    } else if (overdueDays >= penaltyThresholdDays) {
      // Check if penalty notice exists
      const hasPenaltyNotice = existingNotices.some(n => n.noticeType === 'penalty');
      if (!hasPenaltyNotice) {

      }
    }
  } catch (error) {
    console.error(`[PENALTY_CRON] Error checking notice escalation for demand ${demand.id}:`, error);
  }
};

/**
 * Process a single demand
 */
const processDemand = async (demand, rule) => {
  try {
    const overdueDays = calculateOverdueDays(demand.dueDate, rule.gracePeriodDays);

    if (!shouldApplyPenalty(demand, rule, overdueDays)) {
      return {
        processed: false,
        reason: 'Penalty already applied or not eligible'
      };
    }

    // Apply penalty and interest
    const result = await applyPenaltyToDemand(demand, rule, overdueDays);

    // Check for notice escalation
    await checkNoticeEscalation(demand, overdueDays);

    // Create audit log
    const mockReq = createMockRequest();
    const systemUser = createSystemUser();

    await createAuditLog({
      req: mockReq,
      user: systemUser,
      actionType: 'PENALTY_APPLIED',
      entityType: 'Demand',
      entityId: demand.id,
      previousData: {
        penaltyAmount: result.previousPenaltyAmount,
        interestAmount: result.previousInterestAmount,
        totalAmount: result.previousTotalAmount,
        balanceAmount: result.previousBalanceAmount,
        status: demand.status,
        overdueDays: demand.overdueDays - overdueDays
      },
      newData: {
        penaltyAmount: result.newPenalty,
        interestAmount: result.newInterest,
        totalAmount: result.newTotalAmount,
        balanceAmount: result.newBalanceAmount,
        status: demand.status,
        overdueDays: demand.overdueDays,
        lastPenaltyAppliedAt: demand.lastPenaltyAppliedAt
      },
      description: `Auto-applied penalty (₹${result.penaltyAdded.toFixed(2)}) and interest (₹${result.interestAdded.toFixed(2)}) to overdue demand ${demand.demandNumber}. Overdue: ${overdueDays} days.`,
      metadata: {
        ruleId: rule.id,
        ruleName: rule.ruleName,
        overdueDays,
        penaltyAdded: result.penaltyAdded,
        interestAdded: result.interestAdded
      }
    });

    return {
      processed: true,
      demandId: demand.id,
      demandNumber: demand.demandNumber,
      penaltyAdded: result.penaltyAdded,
      interestAdded: result.interestAdded,
      overdueDays
    };
  } catch (error) {
    console.error(`[PENALTY_CRON] Error processing demand ${demand.id}:`, error);
    return {
      processed: false,
      error: error.message
    };
  }
};

/**
 * Main cron job function
 */
const runPenaltyCronJob = async () => {
  const startTime = new Date();


  const status = {
    lastRunAt: startTime,
    demandsProcessed: 0,
    demandsUpdated: 0,
    totalPenaltyApplied: 0,
    totalInterestApplied: 0,
    errors: [],
    skipped: []
  };

  try {
    // Get all overdue demands
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueDemands = await Demand.findAll({
      where: {
        status: {
          [Op.in]: ['pending', 'partially_paid', 'overdue']
        },
        dueDate: {
          [Op.lt]: today
        },
        balanceAmount: {
          [Op.gt]: 0
        }
      },
      include: [
        {
          model: PenaltyRule,
          as: 'penaltyRule',
          required: false
        }
      ],
      order: [['dueDate', 'ASC']]
    });



    // Group demands by financial year to get appropriate rules
    const demandsByFinancialYear = {};
    for (const demand of overdueDemands) {
      if (!demandsByFinancialYear[demand.financialYear]) {
        demandsByFinancialYear[demand.financialYear] = [];
      }
      demandsByFinancialYear[demand.financialYear].push(demand);
    }

    // Process each financial year group
    for (const [financialYear, demands] of Object.entries(demandsByFinancialYear)) {
      // Get active penalty rule for this financial year
      const rule = await getActivePenaltyRule(financialYear);

      if (!rule) {

        status.skipped.push({
          financialYear,
          reason: 'No active penalty rule found',
          count: demands.length
        });
        continue;
      }



      // Process each demand
      for (const demand of demands) {
        status.demandsProcessed++;

        const result = await processDemand(demand, rule);

        if (result.processed) {
          status.demandsUpdated++;
          status.totalPenaltyApplied += result.penaltyAdded || 0;
          status.totalInterestApplied += result.interestAdded || 0;
        } else {
          status.skipped.push({
            demandId: demand.id,
            demandNumber: demand.demandNumber,
            reason: result.reason || result.error
          });
        }
      }
    }

    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;



    // Update last run status
    lastRunStatus = status;

  } catch (error) {
    console.error('[PENALTY_CRON] Fatal error:', error);
    status.errors.push({
      message: error.message,
      stack: error.stack
    });
    lastRunStatus = status;
  }
};

/**
 * Start the cron job
 * Runs daily at 12:00 AM server time
 */
export const startPenaltyCronJob = () => {
  if (cronJob) {

    return;
  }

  // Schedule: Run daily at 12:00 AM (0 0 * * *)
  cronJob = cron.schedule('0 0 * * *', async () => {
    await runPenaltyCronJob();
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata' // Adjust to your server timezone
  });



  // Run immediately on startup (optional - comment out if not desired)
  // runPenaltyCronJob();
};

/**
 * Stop the cron job
 */
export const stopPenaltyCronJob = () => {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;

  }
};

/**
 * Get last run status
 */
export const getLastRunStatus = () => {
  return lastRunStatus;
};

/**
 * Manually trigger the cron job (for testing or admin use)
 */
export const triggerPenaltyCronJob = async () => {

  await runPenaltyCronJob();
  return lastRunStatus;
};
