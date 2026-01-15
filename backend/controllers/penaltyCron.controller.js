import { triggerPenaltyCronJob, getLastRunStatus } from '../services/penaltyCron.js';

/**
 * @route   GET /api/penalty-cron/status
 * @desc    Get last cron job run status
 * @access  Private (Admin only)
 */
export const getCronStatus = async (req, res, next) => {
  try {
    const status = getLastRunStatus();
    res.json({
      success: true,
      data: { status }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/penalty-cron/trigger
 * @desc    Manually trigger penalty cron job
 * @access  Private (Admin only)
 */
export const triggerCronJob = async (req, res, next) => {
  try {
    const status = await triggerPenaltyCronJob();
    res.json({
      success: true,
      message: 'Penalty cron job executed successfully',
      data: { status }
    });
  } catch (error) {
    next(error);
  }
};
