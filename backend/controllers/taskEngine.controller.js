import { CollectorTask, FollowUp, Demand, Property, User, Ward } from '../models/index.js';
import { Op } from 'sequelize';
import { createAuditLog } from '../utils/auditLogger.js';
import { sequelize } from '../config/database.js';
import { getTodayInKolkata, generateTasksForCollector } from '../services/taskGeneratorService.js';

/**
 * @route   GET /api/tasks/daily
 * @desc    Get today's tasks for collector (auto-generated on-demand if needed)
 * @access  Private (Collector)
 */
export const getDailyTasks = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const user = req.user;

    if (user.role !== 'collector') {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only collectors can view daily tasks'
      });
    }

    // Get today's date in Asia/Kolkata timezone
    const todayInfo = getTodayInKolkata();
    const { dateStr } = todayInfo;

    console.log(`📅 Collector ${user.id} requested daily tasks for ${dateStr}`);

    // First, try to get existing tasks
    let tasks = await CollectorTask.findAll({
      where: {
        collectorId: user.id,
        taskDate: dateStr,
        status: {
          [Op.in]: ['pending', 'in_progress']
        }
      },
      transaction
    });

    // If no tasks found, generate them on-demand
    if (tasks.length === 0) {
      console.log(`⚠️  No tasks found for collector ${user.id}. Generating on-demand...`);

      // Get collector with assigned wards
      const collector = await User.findByPk(user.id, {
        include: [
          {
            model: Ward,
            as: 'assignedWards',
            attributes: ['id', 'wardNumber', 'wardName']
          }
        ],
        transaction
      });

      if (collector && collector.assignedWards && collector.assignedWards.length > 0) {
        // Generate tasks for this collector
        const result = await generateTasksForCollector(collector, todayInfo, transaction);

        console.log(`✅ Generated ${result.tasksGenerated} tasks on-demand for collector ${user.id}`);

        // Fetch the newly created tasks
        tasks = await CollectorTask.findAll({
          where: {
            collectorId: user.id,
            taskDate: dateStr,
            status: {
              [Op.in]: ['pending', 'in_progress']
            }
          },
          transaction
        });
      } else {
        console.log(`⚠️  Collector ${user.id} has no assigned wards. Cannot generate tasks.`);
      }
    }

    await transaction.commit();

    // Now fetch tasks with all includes (outside transaction for better performance)
    const tasksWithDetails = await CollectorTask.findAll({
      where: {
        collectorId: user.id,
        taskDate: dateStr,
        status: {
          [Op.in]: ['pending', 'in_progress']
        }
      },
      include: [
        {
          model: Demand,
          as: 'demand',
          attributes: ['id', 'demandNumber', 'balanceAmount', 'overdueDays', 'dueDate', 'status', 'serviceType']
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'propertyNumber', 'address'],
          include: [
            {
              model: Ward,
              as: 'ward',
              attributes: ['id', 'wardNumber', 'wardName']
            }
          ]
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: FollowUp,
          as: 'followUp',
          attributes: ['id', 'visitCount', 'lastVisitDate', 'escalationStatus']
        }
      ],
      order: [
        ['priority', 'DESC'],
        ['overdueDays', 'DESC'],
        ['taskDate', 'ASC']
      ]
    });

    // Group by priority
    const tasksByPriority = {
      critical: tasksWithDetails.filter(t => t.priority === 'critical'),
      high: tasksWithDetails.filter(t => t.priority === 'high'),
      medium: tasksWithDetails.filter(t => t.priority === 'medium'),
      low: tasksWithDetails.filter(t => t.priority === 'low')
    };

    console.log(`📊 Returning ${tasksWithDetails.length} tasks for collector ${user.id} (Critical: ${tasksByPriority.critical.length}, High: ${tasksByPriority.high.length}, Medium: ${tasksByPriority.medium.length}, Low: ${tasksByPriority.low.length})`);

    res.json({
      success: true,
      data: {
        tasks: tasksWithDetails,
        tasksByPriority,
        summary: {
          total: tasksWithDetails.length,
          critical: tasksByPriority.critical.length,
          high: tasksByPriority.high.length,
          medium: tasksByPriority.medium.length,
          low: tasksByPriority.low.length
        },
        message: tasksWithDetails.length === 0
          ? 'No tasks for today. This may mean all demands are paid or no demands are due/overdue in your assigned wards.'
          : null
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/tasks/generate
 * @desc    Generate daily tasks for all collectors (Admin only, or auto-cron)
 * @access  Private (Admin) or System
 */
export const generateDailyTasks = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const user = req.user;

    // Only admin can manually trigger, or system (no user)
    if (user && user.role !== 'admin') {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only admin can generate tasks'
      });
    }

    // Get today's date in Asia/Kolkata timezone
    const todayInfo = getTodayInKolkata();
    const { dateStr } = todayInfo;

    console.log(`🔄 Admin triggered task generation for ${dateStr}`);

    // Get all collectors
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
      ],
      transaction
    });

    let totalTasksGenerated = 0;
    const results = [];

    for (const collector of collectors) {
      const result = await generateTasksForCollector(collector, todayInfo, transaction);
      totalTasksGenerated += result.tasksGenerated;
      results.push({
        collectorId: collector.id,
        collectorName: `${collector.firstName} ${collector.lastName}`,
        ...result
      });
    }

    await transaction.commit();

    console.log(`✅ Task generation completed: ${totalTasksGenerated} tasks for ${collectors.length} collectors`);

    res.json({
      success: true,
      message: `Generated ${totalTasksGenerated} tasks for ${collectors.length} collectors`,
      data: {
        tasksGenerated: totalTasksGenerated,
        collectorsProcessed: collectors.length,
        results: results,
        details: collectors.length > 0
          ? `Processed ${collectors.length} collectors. ${totalTasksGenerated > 0 ? 'Tasks generated successfully.' : 'No tasks generated - no demands due today or overdue found.'}`
          : 'No active collectors found.'
      }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * @route   PATCH /api/tasks/:id/complete
 * @desc    Mark task as completed (Collector only)
 * @access  Private (Collector)
 */
export const completeTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (user.role !== 'collector') {
      return res.status(403).json({
        success: false,
        message: 'Only collectors can complete tasks'
      });
    }

    const task = await CollectorTask.findByPk(id, {
      include: [
        {
          model: Demand,
          as: 'demand'
        }
      ]
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    if (task.collectorId !== user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only complete your own tasks'
      });
    }

    if (task.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Task is already completed'
      });
    }

    const { completionNote, relatedVisitId } = req.body;

    await task.update({
      status: 'completed',
      completedAt: new Date(),
      completedBy: user.id,
      completionNote: completionNote || 'Task completed',
      relatedVisitId: relatedVisitId || null
    });

    // Create audit log
    await createAuditLog({
      req,
      user,
      actionType: 'TASK_COMPLETED',
      entityType: 'CollectorTask',
      entityId: task.id,
      description: `Collector completed task: ${task.actionRequired}`,
      metadata: {
        taskId: task.id,
        taskNumber: task.taskNumber,
        demandId: task.demandId,
        taskType: task.taskType,
        relatedVisitId: relatedVisitId || null
      }
    });

    res.json({
      success: true,
      message: 'Task marked as completed',
      data: { task }
    });
  } catch (error) {
    next(error);
  }
};
