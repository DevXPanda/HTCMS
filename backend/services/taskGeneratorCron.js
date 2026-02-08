import cron from 'node-cron';
import { User, Ward } from '../models/index.js';
import { getTodayInKolkata, generateTasksForCollector } from './taskGeneratorService.js';

/**
 * Auto-generate daily tasks for all collectors
 * Runs every day at 6:00 AM (Asia/Kolkata timezone)
 */
export const startTaskGeneratorCronJob = () => {
  // Schedule task generation at 6:00 AM every day
  cron.schedule('0 6 * * *', async () => {
    console.log('🔄 Starting daily task generation for collectors...');

    try {
      // Get today's date in Asia/Kolkata timezone
      const todayInfo = getTodayInKolkata();
      const { dateStr } = todayInfo;

      console.log(`📅 Generating tasks for ${dateStr} (Asia/Kolkata)`);

      // Get all active collectors
      const collectors = await User.findAll({
        where: {
          role: 'collector',
          isActive: true
        },
        include: [
          {
            model: Ward,
            as: 'assignedWards',
            attributes: ['id', 'wardNumber', 'wardName']
          }
        ]
      });

      let totalTasksGenerated = 0;

      for (const collector of collectors) {
        const result = await generateTasksForCollector(collector, todayInfo);
        totalTasksGenerated += result.tasksGenerated;
      }

      console.log(`Generated ${totalTasksGenerated} tasks for ${collectors.length} collectors`);
    } catch (error) {
      console.error('Error in task generator cron job:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });

  console.log('Daily task generator cron job scheduled (runs at 6:00 AM daily, Asia/Kolkata timezone)');
};
