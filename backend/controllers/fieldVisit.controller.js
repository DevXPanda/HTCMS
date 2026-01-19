import { FieldVisit, FollowUp, Demand, Property, User, CollectorAttendance, Notice, Ward, CollectorTask, Payment } from '../models/index.js';
import { Op } from 'sequelize';
import { parseDeviceInfo } from '../utils/deviceParser.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { sequelize } from '../config/database.js';
import { updateNoticeOnPayment } from './notice.controller.js';
import { generatePaymentReceiptPdf } from '../utils/pdfHelpers.js';

/**
 * @route   POST /api/field-visits
 * @desc    Create a new field visit (Collector only)
 * @access  Private (Collector)
 */
export const createFieldVisit = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const user = req.user;
    
    // Only collectors can create field visits
    if (user.role !== 'collector') {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only collectors can create field visits'
      });
    }

    const {
      demandId,
      propertyId,
      visitType,
      citizenResponse,
      expectedPaymentDate,
      remarks,
      latitude,
      longitude,
      address,
      proofPhotoUrl,
      proofNote,
      taskId,
      // Payment data (only when visitType === 'payment_collection' && citizenResponse === 'will_pay_today')
      paymentAmount,
      paymentMode,
      transactionId,
      chequeNumber,
      chequeDate,
      bankName,
      paymentRemarks
    } = req.body;

    // Validate required fields
    if (!demandId || !propertyId || !visitType || !citizenResponse || !remarks) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: demandId, propertyId, visitType, citizenResponse, remarks'
      });
    }

    // Validate visit type
    const validVisitTypes = ['reminder', 'payment_collection', 'warning', 'final_warning'];
    if (!validVisitTypes.includes(visitType)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Invalid visit type. Must be one of: ${validVisitTypes.join(', ')}`
      });
    }

    // Validate citizen response
    const validResponses = ['will_pay_today', 'will_pay_later', 'refused_to_pay', 'not_available'];
    if (!validResponses.includes(citizenResponse)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Invalid citizen response. Must be one of: ${validResponses.join(', ')}`
      });
    }

    // Validate expected payment date if citizen promised to pay later
    if (citizenResponse === 'will_pay_later' && !expectedPaymentDate) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Expected payment date is required when citizen promises to pay later'
      });
    }

    // Validate payment data if collecting payment
    const isCollectingPayment = visitType === 'payment_collection' && citizenResponse === 'will_pay_today';
    if (isCollectingPayment) {
      if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Payment amount is required and must be greater than 0 when collecting payment'
        });
      }
      
      const validPaymentModes = ['cash', 'cheque', 'dd', 'card', 'upi'];
      if (!paymentMode || !validPaymentModes.includes(paymentMode)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Valid payment mode is required. Must be one of: ${validPaymentModes.join(', ')}`
        });
      }

      // Validate cheque-specific fields
      if ((paymentMode === 'cheque' || paymentMode === 'dd') && !chequeNumber) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Cheque number is required for cheque/DD payments'
        });
      }

      // Validate transaction reference for card/UPI
      if ((paymentMode === 'card' || paymentMode === 'upi') && !transactionId) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Transaction reference is required for card/UPI payments'
        });
      }
    }

    // Fetch demand and property
    const demand = await Demand.findByPk(demandId, {
      include: [
        { model: Property, as: 'property' },
        { model: User, as: 'generator' }
      ],
      transaction
    });

    if (!demand) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Tax Demand not found'
      });
    }

    const property = await Property.findByPk(propertyId, {
      include: [
        { model: User, as: 'owner' },
        { model: Ward, as: 'ward' }
      ],
      transaction
    });

    if (!property) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Verify collector has access to this property's ward
    const assignedWards = await Ward.findAll({
      where: { collectorId: user.id },
      transaction
    });

    const wardIds = assignedWards.map(w => w.id);
    if (!wardIds.includes(property.wardId)) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this property. It is not in your assigned wards.'
      });
    }

    // Check if demand is still unpaid
    if (demand.status === 'paid' && demand.balanceAmount <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot create visit for fully paid demand'
      });
    }

    // Get or create follow-up record
    let followUp = await FollowUp.findOne({
      where: { demandId },
      transaction
    });

    if (!followUp) {
      // Create new follow-up record
      followUp = await FollowUp.create({
        demandId,
        propertyId,
        ownerId: property.ownerId,
        visitCount: 0,
        escalationLevel: 0,
        escalationStatus: 'none',
        priority: demand.overdueDays > 30 ? 'high' : demand.overdueDays > 15 ? 'medium' : 'low',
        transaction
      });
    }

    // Count escalation visits (excluding payment_collection) for validation and escalation tracking
    const escalationVisitTypes = ['reminder', 'warning', 'final_warning'];
    const escalationVisitCount = await FieldVisit.count({
      where: {
        demandId,
        visitType: {
          [Op.in]: escalationVisitTypes
        }
      },
      transaction
    });

    // Validate visit sequence - prevent skipping escalation levels
    // Payment collection is a resolution action and can be done at any visit level
    // Only escalation visit types (reminder, warning, final_warning) must follow sequence
    if (escalationVisitTypes.includes(visitType)) {
      const nextEscalationSequence = escalationVisitCount + 1;
      const expectedVisitType = getExpectedEscalationType(nextEscalationSequence);
      
      if (visitType !== expectedVisitType) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Invalid escalation visit type. Expected ${expectedVisitType} for escalation visit #${nextEscalationSequence}. Cannot skip escalation levels. Payment collection can be done at any visit level.`
        });
      }
    }
    // Payment collection visits are allowed at any visit level - no sequence validation needed

    // Check attendance window
    const attendanceWindow = await checkAttendanceWindow(user.id, transaction);
    let attendanceId = null;
    let isWithinWindow = false;
    let windowNote = null;

    if (attendanceWindow) {
      attendanceId = attendanceWindow.id;
      isWithinWindow = true;
    } else {
      isWithinWindow = false;
      windowNote = 'Visit recorded outside attendance window. Collector may not be on duty.';
    }

    // Parse device information
    const deviceInfo = parseDeviceInfo(req);

    // Generate unique visit number: FV-YYYY-{sequence}
    // Format: FV-2026-000001
    const year = new Date().getFullYear();
    const existingVisitsCount = await FieldVisit.count({
      where: {
        visitDate: {
          [Op.gte]: new Date(`${year}-01-01`),
          [Op.lt]: new Date(`${year + 1}-01-01`)
        }
      },
      transaction
    });
    const sequence = String(existingVisitsCount + 1).padStart(6, '0');
    const visitNumber = `FV-${year}-${sequence}`;

    // Calculate new visit count before creating visit (needed for visitSequenceNumber)
    const newVisitCount = followUp.visitCount + 1;

    // Create field visit
    const visit = await FieldVisit.create({
      visitNumber: visitNumber,
      collectorId: user.id,
      propertyId,
      ownerId: property.ownerId,
      demandId,
      visitDate: new Date(),
      visitType,
      citizenResponse,
      expectedPaymentDate: citizenResponse === 'will_pay_later' ? new Date(expectedPaymentDate) : null,
      remarks,
      visitSequenceNumber: newVisitCount,
      visitLatitude: latitude || null,
      visitLongitude: longitude || null,
      visitAddress: address || null,
      ipAddress: deviceInfo.ipAddress,
      deviceType: deviceInfo.deviceType,
      browserName: deviceInfo.browserName,
      operatingSystem: deviceInfo.operatingSystem,
      source: deviceInfo.source,
      proofPhotoUrl: proofPhotoUrl || null,
      proofNote: proofNote || null,
      attendanceId,
      isWithinAttendanceWindow: isWithinWindow,
      attendanceWindowNote: windowNote,
      status: isWithinWindow ? 'recorded' : 'flagged'
    }, { transaction });

    // Update follow-up record
    // newVisitCount was already calculated above for visitSequenceNumber
    
    // Escalation level and status only update for escalation visits (not payment_collection)
    // escalationVisitCount was already calculated above for validation
    let newEscalationLevel = followUp.escalationLevel;
    let newEscalationStatus = followUp.escalationStatus;
    
    if (escalationVisitTypes.includes(visitType)) {
      const newEscalationVisitCount = escalationVisitCount + 1;
      newEscalationLevel = Math.min(newEscalationVisitCount, 4); // Max level 4 (enforcement eligible)
      
      if (newEscalationVisitCount === 1) {
        newEscalationStatus = 'first_reminder';
      } else if (newEscalationVisitCount === 2) {
        newEscalationStatus = 'second_reminder';
      } else if (newEscalationVisitCount === 3) {
        newEscalationStatus = 'final_warning';
      } else if (newEscalationVisitCount >= 4) {
        newEscalationStatus = 'enforcement_eligible';
      }
    }
    // Payment collection visits don't affect escalation level/status

    // Update priority based on visits and overdue days
    let newPriority = 'medium';
    if (newVisitCount >= 3 || demand.overdueDays > 60) {
      newPriority = 'critical';
    } else if (newVisitCount >= 2 || demand.overdueDays > 30) {
      newPriority = 'high';
    } else if (demand.overdueDays > 15) {
      newPriority = 'medium';
    } else {
      newPriority = 'low';
    }

    // Calculate next follow-up date
    let nextFollowUpDate = null;
    if (citizenResponse === 'will_pay_later' && expectedPaymentDate) {
      nextFollowUpDate = new Date(expectedPaymentDate);
      // Add 2 days buffer after expected date
      nextFollowUpDate.setDate(nextFollowUpDate.getDate() + 2);
    } else if (citizenResponse === 'not_available') {
      // Follow up in 3 days
      nextFollowUpDate = new Date();
      nextFollowUpDate.setDate(nextFollowUpDate.getDate() + 3);
    } else if (citizenResponse === 'refused_to_pay') {
      // Follow up in 7 days
      nextFollowUpDate = new Date();
      nextFollowUpDate.setDate(nextFollowUpDate.getDate() + 7);
    }

    await followUp.update({
      visitCount: newVisitCount,
      lastVisitDate: visit.visitDate,
      lastVisitId: visit.id,
      lastVisitType: visitType,
      lastCitizenResponse: citizenResponse,
      expectedPaymentDate: citizenResponse === 'will_pay_later' ? new Date(expectedPaymentDate) : null,
      escalationLevel: newEscalationLevel,
      escalationStatus: newEscalationStatus,
      isEnforcementEligible: newEscalationLevel >= 4,
      enforcementEligibleDate: newEscalationLevel >= 4 && !followUp.isEnforcementEligible ? new Date() : followUp.enforcementEligibleDate,
      priority: newPriority,
      nextFollowUpDate,
      lastUpdatedBy: user.id
    }, { transaction });

    // Check if notice should be triggered (after 3 escalation visits)
    // Ensure balanceAmount is numeric for comparison
    const balanceAmount = parseFloat(demand.balanceAmount || 0);
    let triggeredNotice = null;
    if (newEscalationLevel >= 3 && !followUp.noticeTriggered && balanceAmount > 0) {
      // Trigger enforcement notice
      triggeredNotice = await triggerEnforcementNotice(demand, property, followUp, user, transaction);
      
      if (triggeredNotice) {
        await followUp.update({
          noticeTriggered: true,
          noticeId: triggeredNotice.id
        }, { transaction });
      }
    }

    // Handle payment collection if applicable
    let payment = null;
    let receiptPdfUrl = null;
    if (isCollectingPayment) {
      const paymentAmountNum = parseFloat(paymentAmount);
      const currentBalance = parseFloat(demand.balanceAmount || 0);
      
      // Validate payment amount doesn't exceed balance
      if (paymentAmountNum > currentBalance) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Payment amount (₹${paymentAmountNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}) cannot exceed balance amount (₹${currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })})`
        });
      }

      // Generate payment number
      const year = new Date().getFullYear();
      const existingPaymentsCount = await Payment.count({
        where: {
          paymentDate: {
            [Op.gte]: new Date(`${year}-01-01`),
            [Op.lt]: new Date(`${year + 1}-01-01`)
          }
        },
        transaction
      });
      const paymentSequence = String(existingPaymentsCount + 1).padStart(6, '0');
      const paymentNumber = `PAY-${year}-${paymentSequence}`;

      // Generate receipt number
      const receiptNumber = `RCP-${year}-${Date.now()}`;

      // Create payment entry
      payment = await Payment.create({
        paymentNumber,
        demandId,
        propertyId,
        amount: paymentAmountNum,
        paymentMode,
        paymentDate: new Date(),
        chequeNumber: (paymentMode === 'cheque' || paymentMode === 'dd') ? chequeNumber : null,
        chequeDate: (paymentMode === 'cheque' || paymentMode === 'dd') && chequeDate ? new Date(chequeDate) : null,
        bankName: (paymentMode === 'cheque' || paymentMode === 'dd') ? bankName : null,
        transactionId: (paymentMode === 'card' || paymentMode === 'upi') ? transactionId : null,
        receiptNumber,
        status: 'completed',
        receivedBy: user.id,
        remarks: paymentRemarks || `Payment collected during field visit ${visit.visitNumber}`
      }, { transaction });

      // Update demand amounts
      const currentPaidAmount = parseFloat(demand.paidAmount || 0);
      const totalAmount = parseFloat(demand.totalAmount || 0);
      const newPaidAmount = Math.round((currentPaidAmount + paymentAmountNum) * 100) / 100;
      const newBalanceAmount = Math.round((totalAmount - newPaidAmount) * 100) / 100;

      demand.paidAmount = newPaidAmount;
      demand.balanceAmount = newBalanceAmount;

      // Update demand status
      if (newBalanceAmount <= 0) {
        demand.status = 'paid';
      } else if (newPaidAmount > 0) {
        demand.status = 'partially_paid';
      }

      await demand.save({ transaction });

      // Reload demand to ensure we have the latest data for notice update
      await demand.reload({ transaction });

      // Update notice status if demand is paid (called after transaction commit via setTimeout)
      // Note: updateNoticeOnPayment doesn't use transactions, so we call it after commit
      // The demand status will be correct after transaction commits

      // Resolve follow-up if demand is fully paid
      if (newBalanceAmount <= 0) {
        await followUp.update({
          isResolved: true,
          resolvedDate: new Date(),
          resolvedBy: user.id
        }, { transaction });

        // Create audit log for follow-up resolution
        try {
          await createAuditLog({
            req,
            user,
            actionType: 'RESOLVE',
            entityType: 'FollowUp',
            entityId: followUp.id,
            description: `Follow-up resolved automatically after field payment collection. Payment: ${payment.paymentNumber}`,
            metadata: {
              followUpId: followUp.id,
              demandId,
              paymentId: payment.id,
              paymentNumber: payment.paymentNumber,
              amount: payment.amount,
              visitId: visit.id,
              visitNumber: visit.visitNumber
            }
          });
        } catch (auditError) {
          console.error('Failed to create audit log for follow-up resolution:', auditError);
        }
      }

      // Close task if taskId is provided
      if (taskId) {
        const task = await CollectorTask.findOne({
          where: {
            id: taskId,
            collectorId: user.id,
            demandId
          },
          transaction
        });

        if (task && task.status !== 'completed') {
          await task.update({
            status: 'completed',
            completedAt: new Date(),
            completedBy: user.id,
            completionNote: `Task completed with payment collection. Payment: ${payment.paymentNumber}`,
            relatedVisitId: visit.id
          }, { transaction });

          // Create audit log for task completion
          try {
            await createAuditLog({
              req,
              user,
              actionType: 'TASK_COMPLETED',
              entityType: 'CollectorTask',
              entityId: task.id,
              description: `Task completed with payment collection during field visit`,
              metadata: {
                taskId: task.id,
                taskNumber: task.taskNumber,
                demandId,
                paymentId: payment.id,
                paymentNumber: payment.paymentNumber,
                visitId: visit.id,
                visitNumber: visit.visitNumber
              }
            });
          } catch (auditError) {
            console.error('Failed to create audit log for task completion:', auditError);
          }
        }
      }

      // Generate receipt PDF
      try {
        const receiptResult = await generatePaymentReceiptPdf(payment.id, req, user);
        receiptPdfUrl = receiptResult.pdfUrl;
      } catch (pdfError) {
        console.error('Error generating receipt PDF:', pdfError);
        // Don't fail the transaction if PDF generation fails
      }

      // Create audit log for payment
      try {
        await createAuditLog({
          req,
          user,
          actionType: 'PAYMENT_COLLECTED',
          entityType: 'Payment',
          entityId: payment.id,
          description: `Payment collected during field visit: ${payment.paymentNumber} - ₹${payment.amount}`,
          metadata: {
            paymentId: payment.id,
            paymentNumber: payment.paymentNumber,
            amount: payment.amount,
            paymentMode: payment.paymentMode,
            receiptNumber: payment.receiptNumber,
            demandId,
            propertyId,
            visitId: visit.id,
            visitNumber: visit.visitNumber
          }
        });
      } catch (auditError) {
        console.error('Failed to create audit log for payment:', auditError);
      }
    }

    // Create audit log - wrap in try-catch to ensure visit creation never fails
    try {
      await createAuditLog({
        req,
        user,
        actionType: 'FIELD_VISIT',
        entityType: 'FieldVisit',
        entityId: visit.id,
        description: `Collector recorded field visit #${newVisitCount} for demand ${demand.demandNumber}`,
        metadata: {
          visitId: visit.id,
          visitNumber: visit.visitNumber,
          demandId,
          propertyId,
          visitType,
          citizenResponse,
          visitSequence: newVisitCount,
          escalationStatus: newEscalationStatus,
          isWithinAttendanceWindow: isWithinWindow,
          noticeTriggered: triggeredNotice ? true : false,
          noticeId: triggeredNotice?.id || null
        }
      });
    } catch (auditError) {
      // Log error but don't fail visit creation
      console.error('Failed to create audit log for field visit:', auditError);
      // Field visit record is still created successfully
    }

    await transaction.commit();

    // Update notice status if demand is paid (called after transaction commit)
    // This ensures the demand changes are committed before notice updates
    if (isCollectingPayment && payment) {
      try {
        await updateNoticeOnPayment(demandId, req, user);
      } catch (noticeError) {
        console.error('Error updating notice on payment (non-critical):', noticeError);
        // Don't fail the request if notice update fails
      }
    }

    res.status(201).json({
      success: true,
      message: isCollectingPayment ? 'Field visit recorded and payment collected successfully' : 'Field visit recorded successfully',
      data: {
        visit,
        followUp,
        noticeTriggered: triggeredNotice ? {
          id: triggeredNotice.id,
          noticeNumber: triggeredNotice.noticeNumber
        } : null,
        payment: payment ? {
          id: payment.id,
          paymentNumber: payment.paymentNumber,
          receiptNumber: payment.receiptNumber,
          amount: payment.amount,
          paymentMode: payment.paymentMode,
          receiptPdfUrl
        } : null
      }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Helper function to get expected escalation visit type based on escalation sequence
 * Only returns escalation types (reminder, warning, final_warning)
 * Payment collection is not an escalation and can be done at any level
 * 
 * Escalation sequence:
 * - 1st escalation: reminder
 * - 2nd escalation: reminder (can repeat if needed)
 * - 3rd escalation: warning
 * - 4th+ escalation: final_warning
 */
function getExpectedEscalationType(escalationSequence) {
  if (escalationSequence === 1) return 'reminder';
  if (escalationSequence === 2) return 'reminder'; // Second escalation can still be reminder
  if (escalationSequence === 3) return 'warning';
  if (escalationSequence >= 4) return 'final_warning';
  return 'reminder';
}

/**
 * Helper function to check if collector has active attendance
 */
async function checkAttendanceWindow(collectorId, transaction) {
  const attendance = await CollectorAttendance.findOne({
    where: {
      collectorId,
      logoutAt: null
    },
    order: [['loginAt', 'DESC']],
    transaction
  });

  return attendance;
}

/**
 * Helper function to trigger enforcement notice
 */
async function triggerEnforcementNotice(demand, property, followUp, collector, transaction) {
  try {
    // Generate notice number
    const year = new Date().getFullYear();
    const count = await Notice.count({
      where: {
        noticeDate: {
          [Op.gte]: new Date(`${year}-01-01`),
          [Op.lt]: new Date(`${year + 1}-01-01`)
        }
      },
      transaction
    });
    const noticeNumber = `ENF-${year}-${String(count + 1).padStart(6, '0')}`;

    // Create enforcement notice
    const notice = await Notice.create({
      noticeNumber,
      noticeType: 'final_warrant',
      propertyId: property.id,
      ownerId: property.ownerId,
      demandId: demand.id,
      financialYear: demand.financialYear,
      noticeDate: new Date(),
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      amountDue: demand.balanceAmount,
      penaltyAmount: demand.penaltyAmount + demand.interestAmount,
      status: 'generated',
      generatedBy: collector.id,
      isCollectorTriggered: true,
      triggeredByVisitCount: followUp.visitCount,
      followUpId: followUp.id,
      remarks: `Enforcement notice triggered automatically after ${followUp.visitCount} field visits. Collector: ${collector.firstName} ${collector.lastName}`
    }, { transaction });

    // Log notice trigger
    await createAuditLog({
      req: null,
      user: collector,
      actionType: 'NOTICE_TRIGGERED',
      entityType: 'Notice',
      entityId: notice.id,
      description: `Collector triggered enforcement notice after ${followUp.visitCount} visits`,
      metadata: {
        noticeId: notice.id,
        noticeNumber: notice.noticeNumber,
        demandId: demand.id,
        visitCount: followUp.visitCount,
        collectorId: collector.id
      }
    });

    return notice;
  } catch (error) {
    console.error('Error triggering enforcement notice:', error);
    return null;
  }
}

/**
 * @route   GET /api/field-visits
 * @desc    Get field visits with filters
 * @access  Private (Admin, Assessor, Collector)
 */
export const getFieldVisits = async (req, res, next) => {
  try {
    const {
      collectorId,
      demandId,
      propertyId,
      visitType,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
      sortBy = 'visitDate',
      sortOrder = 'DESC'
    } = req.query;

    const where = {};
    const user = req.user;

    // Role-based access control
    if (user.role === 'collector') {
      // Collectors can only see their own visits
      where.collectorId = user.id;
    } else if (user.role === 'admin' || user.role === 'assessor') {
      // Admin and Assessor can see all visits
      if (collectorId) {
        where.collectorId = collectorId;
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Apply filters
    if (demandId) where.demandId = demandId;
    if (propertyId) where.propertyId = propertyId;
    if (visitType) where.visitType = visitType;

    if (dateFrom || dateTo) {
      where.visitDate = {};
      if (dateFrom) {
        where.visitDate[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.visitDate[Op.lte] = endDate;
      }
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await FieldVisit.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'collector',
          attributes: ['id', 'firstName', 'lastName', 'email']
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
          model: Demand,
          as: 'demand',
          attributes: ['id', 'demandNumber', 'balanceAmount', 'overdueDays']
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]]
    });

    res.json({
      success: true,
      data: {
        visits: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/field-visits/:id
 * @desc    Get field visit by ID
 * @access  Private (Admin, Assessor, Collector - own visits only)
 */
export const getFieldVisitById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const visit = await FieldVisit.findByPk(id, {
      include: [
        {
          model: User,
          as: 'collector',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: Property,
          as: 'property',
          include: [
            {
              model: Ward,
              as: 'ward',
              attributes: ['id', 'wardNumber', 'wardName']
            }
          ]
        },
        {
          model: Demand,
          as: 'demand',
          include: [
            {
              model: FollowUp,
              as: 'followUp'
            }
          ]
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: CollectorAttendance,
          as: 'attendance',
          attributes: ['id', 'loginAt', 'logoutAt']
        }
      ]
    });

    if (!visit) {
      return res.status(404).json({
        success: false,
        message: 'Field visit not found'
      });
    }

    // Role-based access control
    if (user.role === 'collector' && visit.collectorId !== user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own field visits.'
      });
    }

    if (user.role === 'citizen') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { visit }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/field-visits/context/:taskId
 * @desc    Get field visit context data for a task (Collector only)
 * @access  Private (Collector)
 * 
 * Returns only task-scoped data needed for recording a field visit:
 * - Citizen name & phone
 * - Property id & address
 * - Demand amount & overdue days
 * - Follow-up information
 */
export const getFieldVisitContext = async (req, res, next) => {
  try {
    const user = req.user;
    const { taskId } = req.params;

    // Only collectors can access this endpoint
    if (user.role !== 'collector') {
      return res.status(403).json({
        success: false,
        message: 'Only collectors can access field visit context'
      });
    }

    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: 'Task ID is required'
      });
    }

    // Get task with related data
    // Task has direct relationships: property, demand, followUp, owner
    const task = await CollectorTask.findOne({
      where: {
        id: taskId,
        collectorId: user.id // Ensure collector can only access their own tasks
      },
      include: [
        {
          model: Demand,
          as: 'demand',
          attributes: ['id', 'demandNumber', 'balanceAmount', 'overdueDays', 'dueDate', 'status'],
          required: false
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'propertyNumber', 'address'],
          required: false,
          include: [
            {
              model: User,
              as: 'owner',
              attributes: ['id', 'firstName', 'lastName', 'phone'], // Only necessary fields
              required: false
            },
            {
              model: Ward,
              as: 'ward',
              attributes: ['id', 'wardNumber', 'wardName'],
              required: false
            }
          ]
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'phone'], // Direct owner relationship from task
          required: false
        },
        {
          model: FollowUp,
          as: 'followUp',
          attributes: ['id', 'visitCount', 'lastVisitDate', 'escalationStatus', 'escalationLevel', 'lastVisitType', 'lastCitizenResponse'],
          required: false
        }
      ]
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or access denied'
      });
    }

    // Extract and return only necessary data (no sensitive user fields)
    // Use task's denormalized data first, fallback to related models
    const owner = task.owner || task.property?.owner || null;
    const citizenName = owner 
      ? `${owner.firstName} ${owner.lastName}`
      : task.citizenName || 'Unknown';
    
    const context = {
      citizen: {
        name: citizenName,
        phone: owner?.phone || null
      },
      property: {
        id: task.propertyId,
        propertyNumber: task.propertyNumber || task.property?.propertyNumber || 'N/A',
        address: task.property?.address || 'N/A',
        wardNumber: task.wardNumber || task.property?.ward?.wardNumber || 'N/A'
      },
      demand: {
        id: task.demandId,
        demandNumber: task.demand?.demandNumber || 'N/A',
        balanceAmount: parseFloat(task.dueAmount || task.demand?.balanceAmount || 0),
        overdueDays: task.overdueDays || task.demand?.overdueDays || 0,
        dueDate: task.demand?.dueDate || null,
        status: task.demand?.status || 'pending'
      },
      followUp: task.followUp ? {
        visitCount: task.followUp.visitCount || 0,
        lastVisitDate: task.followUp.lastVisitDate || null,
        escalationStatus: task.followUp.escalationStatus || 'none',
        escalationLevel: task.followUp.escalationLevel || 0,
        lastVisitType: task.followUp.lastVisitType || null,
        lastCitizenResponse: task.followUp.lastCitizenResponse || null
      } : null,
      task: {
        id: task.id,
        taskNumber: task.taskNumber,
        taskType: task.taskType,
        priority: task.priority
      }
    };

    res.json({
      success: true,
      data: { context }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/field-visits/admin/:visitId
 * @desc    Get complete field visit details for admin (read-only, comprehensive view)
 * @access  Private (Admin only)
 * 
 * Returns complete, read-only view of a field visit with all related data:
 * - FieldVisit core data
 * - Collector details
 * - Attendance snapshot
 * - Location details
 * - Device & network metadata
 * - Citizen & property context
 * - Demand context
 * - Collector input
 * - System outcomes (escalation, notices, follow-ups)
 */
export const getAdminFieldVisitDetails = async (req, res, next) => {
  try {
    const user = req.user;
    const { visitId } = req.params;

    // Only admin can access this endpoint
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admin can view detailed field visit information.'
      });
    }

    // Fetch complete field visit with all relations
    const visit = await FieldVisit.findByPk(visitId, {
      include: [
        {
          model: User,
          as: 'collector',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'role']
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'propertyNumber', 'address', 'city', 'state', 'pincode'],
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
          model: Demand,
          as: 'demand',
          attributes: ['id', 'demandNumber', 'financialYear', 'baseAmount', 'arrearsAmount', 
                       'penaltyAmount', 'interestAmount', 'totalAmount', 'paidAmount', 
                       'balanceAmount', 'overdueDays', 'dueDate', 'status'],
          include: [
            {
              model: FollowUp,
              as: 'followUp',
              attributes: ['id', 'visitCount', 'escalationLevel', 'escalationStatus', 
                          'priority', 'lastVisitDate', 'lastVisitType', 'lastCitizenResponse',
                          'isEnforcementEligible', 'noticeTriggered', 'nextFollowUpDate']
            }
          ]
        },
        {
          model: CollectorAttendance,
          as: 'attendance',
          attributes: ['id', 'loginAt', 'logoutAt', 'loginLatitude', 'loginLongitude', 
                       'loginAddress', 'ipAddress', 'deviceType', 'browserName', 
                       'operatingSystem', 'source', 'workingDurationMinutes']
        }
      ]
    });

    if (!visit) {
      return res.status(404).json({
        success: false,
        message: 'Field visit not found'
      });
    }

    // Check if any notices were generated after this visit
    const noticesAfterVisit = await Notice.count({
      where: {
        demandId: visit.demandId,
        createdAt: {
          [Op.gte]: visit.visitDate
        }
      }
    });

    // Get follow-up data from demand relationship
    const followUp = visit.demand?.followUp || null;

    // Check if follow-up was scheduled/updated after this visit
    const followUpUpdated = followUp && 
      followUp.lastVisitDate && 
      new Date(followUp.lastVisitDate) >= new Date(visit.visitDate);

    // Prepare comprehensive response
    const visitDetails = {
      // Core FieldVisit data
      visitId: visit.id,
      visitNumber: visit.visitNumber,
      visitType: visit.visitType,
      visitSequenceNumber: visit.visitSequenceNumber,
      status: visit.status,
      createdAt: visit.createdAt,
      visitDate: visit.visitDate,

      // Collector details
      collector: {
        id: visit.collector?.id,
        name: visit.collector ? `${visit.collector.firstName} ${visit.collector.lastName}` : 'Unknown',
        email: visit.collector?.email,
        phone: visit.collector?.phone,
        role: visit.collector?.role
      },

      // Attendance snapshot at visit time
      attendance: visit.attendance ? {
        id: visit.attendance.id,
        loginAt: visit.attendance.loginAt,
        logoutAt: visit.attendance.logoutAt,
        loginLatitude: visit.attendance.loginLatitude ? parseFloat(visit.attendance.loginLatitude) : null,
        loginLongitude: visit.attendance.loginLongitude ? parseFloat(visit.attendance.loginLongitude) : null,
        loginAddress: visit.attendance.loginAddress,
        ipAddress: visit.attendance.ipAddress,
        deviceType: visit.attendance.deviceType,
        browserName: visit.attendance.browserName,
        operatingSystem: visit.attendance.operatingSystem,
        source: visit.attendance.source,
        workingDurationMinutes: visit.attendance.workingDurationMinutes,
        isWithinWindow: visit.isWithinAttendanceWindow,
        windowNote: visit.attendanceWindowNote
      } : null,

      // Location details
      location: {
        latitude: visit.visitLatitude ? parseFloat(visit.visitLatitude) : null,
        longitude: visit.visitLongitude ? parseFloat(visit.visitLongitude) : null,
        address: visit.visitAddress
      },

      // Device & network metadata
      device: {
        deviceType: visit.deviceType,
        browserName: visit.browserName,
        operatingSystem: visit.operatingSystem,
        ipAddress: visit.ipAddress,
        source: visit.source
      },

      // Citizen & property context
      citizen: {
        id: visit.owner?.id,
        name: visit.owner ? `${visit.owner.firstName} ${visit.owner.lastName}` : 'Unknown',
        email: visit.owner?.email,
        phone: visit.owner?.phone
      },
      property: {
        id: visit.property?.id,
        propertyNumber: visit.property?.propertyNumber,
        address: visit.property?.address,
        city: visit.property?.city,
        state: visit.property?.state,
        pincode: visit.property?.pincode,
        ward: visit.property?.ward ? {
          id: visit.property.ward.id,
          wardNumber: visit.property.ward.wardNumber,
          wardName: visit.property.ward.wardName
        } : null
      },

      // Demand context at visit time
      demand: {
        id: visit.demand?.id,
        demandNumber: visit.demand?.demandNumber,
        financialYear: visit.demand?.financialYear,
        amountDue: visit.demand ? parseFloat(visit.demand.balanceAmount || 0) : 0,
        overdueDays: visit.demand?.overdueDays || 0,
        dueDate: visit.demand?.dueDate,
        status: visit.demand?.status,
        breakdown: {
          baseAmount: visit.demand ? parseFloat(visit.demand.baseAmount || 0) : 0,
          arrearsAmount: visit.demand ? parseFloat(visit.demand.arrearsAmount || 0) : 0,
          penaltyAmount: visit.demand ? parseFloat(visit.demand.penaltyAmount || 0) : 0,
          interestAmount: visit.demand ? parseFloat(visit.demand.interestAmount || 0) : 0,
          totalAmount: visit.demand ? parseFloat(visit.demand.totalAmount || 0) : 0,
          paidAmount: visit.demand ? parseFloat(visit.demand.paidAmount || 0) : 0,
          balanceAmount: visit.demand ? parseFloat(visit.demand.balanceAmount || 0) : 0
        }
      },

      // Collector input
      collectorInput: {
        citizenResponse: visit.citizenResponse,
        expectedPaymentDate: visit.expectedPaymentDate,
        remarks: visit.remarks,
        proofPhotoUrl: visit.proofPhotoUrl,
        proofNote: visit.proofNote
      },

      // System outcomes
      systemOutcomes: {
        escalationTriggered: followUp ? 
          (followUp.escalationLevel > 0 || followUp.escalationStatus !== 'none') : false,
        noticeGenerated: noticesAfterVisit > 0,
        nextFollowUpScheduled: followUp?.nextFollowUpDate ? true : false,
        followUpUpdated: followUpUpdated,
        currentEscalationStatus: followUp?.escalationStatus || 'none',
        currentEscalationLevel: followUp?.escalationLevel || 0,
        isEnforcementEligible: followUp?.isEnforcementEligible || false,
        noticeTriggered: followUp?.noticeTriggered || false
      },

      // Validation flags
      validation: {
        isWithinAttendanceWindow: visit.isWithinAttendanceWindow,
        attendanceWindowNote: visit.attendanceWindowNote,
        flaggedReason: visit.flaggedReason
      }
    };

    // Log admin viewing visit details (audit)
    try {
      await createAuditLog({
        req,
        user,
        actionType: 'VIEW',
        entityType: 'FieldVisit',
        entityId: visit.id,
        description: `Admin viewed field visit details: ${visit.visitNumber}`,
        metadata: {
          visitNumber: visit.visitNumber,
          collectorId: visit.collectorId,
          propertyId: visit.propertyId,
          demandId: visit.demandId
        }
      });
    } catch (auditError) {
      console.error('Failed to create audit log for admin viewing field visit:', auditError);
      // Don't fail the request if audit logging fails
    }

    res.json({
      success: true,
      data: { visitDetails }
    });
  } catch (error) {
    next(error);
  }
};
