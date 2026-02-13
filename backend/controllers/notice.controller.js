import { Notice, Demand, Property, User, Payment, ShopTaxAssessment, Shop } from '../models/index.js';
import { Op, Sequelize } from 'sequelize';
import { auditLogger, createAuditLog } from '../utils/auditLogger.js';
import { generateNoticePdfHelper } from '../utils/pdfHelpers.js';

/**
 * Generate unique notice number
 */
const generateNoticeNumber = async (noticeType) => {
  const prefix = {
    'reminder': 'REM',
    'demand': 'DEM',
    'penalty': 'PEN',
    'final_warrant': 'FWR'
  }[noticeType] || 'NOT';

  const year = new Date().getFullYear();
  const count = await Notice.count({
    where: {
      noticeNumber: {
        [Op.like]: `${prefix}-${year}-%`
      }
    }
  });

  const sequence = String(count + 1).padStart(6, '0');
  return `${prefix}-${year}-${sequence}`;
};

/**
 * Validate escalation rules
 */
const validateEscalation = async (demandId, newNoticeType) => {
  const noticeOrder = {
    'reminder': 1,
    'demand': 2,
    'penalty': 3,
    'final_warrant': 4
  };

  const currentOrder = noticeOrder[newNoticeType];
  if (!currentOrder) {
    throw new Error('Invalid notice type');
  }

  // Get all notices for this demand
  const existingNotices = await Notice.findAll({
    where: { demandId },
    order: [['createdAt', 'DESC']]
  });

  if (existingNotices.length === 0) {
    // First notice must be reminder or demand
    if (currentOrder > 2) {
      throw new Error('First notice must be Reminder or Demand Notice');
    }
    return true;
  }

  // Check if demand is unpaid
  const demand = await Demand.findByPk(demandId);
  if (!demand) {
    throw new Error('Tax Demand not found');
  }

  if (demand.status === 'paid' || demand.balanceAmount <= 0) {
    throw new Error('Cannot escalate notice for paid demand');
  }

  // Get highest notice type already issued
  const highestOrder = Math.max(
    ...existingNotices.map(n => noticeOrder[n.noticeType] || 0)
  );

  // Can only escalate to next level
  if (currentOrder <= highestOrder) {
    throw new Error(`Cannot escalate. ${newNoticeType} notice already exists or higher level notice exists`);
  }

  // Check if due date has passed for escalation beyond reminder
  if (currentOrder > 1 && new Date() < new Date(demand.dueDate)) {
    throw new Error('Due date has not passed. Cannot escalate beyond reminder notice');
  }

  return true;
};

/**
 * @route   POST /api/notices/generate
 * @desc    Generate notice for a demand/property
 * @access  Private (Admin, Assessor)
 */
export const generateNotice = async (req, res, next) => {
  try {
    const {
      demandId,
      noticeType,
      dueDate,
      remarks
    } = req.body;

    // Validation
    if (!demandId || !noticeType) {
      return res.status(400).json({
        success: false,
        message: 'Demand ID and Notice Type are required'
      });
    }

    const validTypes = ['reminder', 'demand', 'penalty', 'final_warrant'];
    if (!validTypes.includes(noticeType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notice type'
      });
    }

    // Get demand with property and owner (include shop info for SHOP_TAX)
    const demand = await Demand.findByPk(demandId, {
      include: [
        {
          model: Property,
          as: 'property',
          required: false, // SHOP_TAX demands have propertyId but property might not be directly accessible
          include: [
            { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'], required: false }
          ]
        },
        {
          model: ShopTaxAssessment,
          as: 'shopTaxAssessment',
          required: false,
          include: [
            {
              model: Shop,
              as: 'shop',
              required: false,
              include: [
                { model: Property, as: 'property', required: false, include: [{ model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'], required: false }] }
              ]
            }
          ]
        }
      ]
    });

    if (!demand) {
      return res.status(404).json({
        success: false,
        message: 'Tax Demand not found'
      });
    }

    // For SHOP_TAX: get property/owner from shop if not directly available
    if (demand.serviceType === 'SHOP_TAX' && demand.shopTaxAssessment?.shop?.property) {
      demand.property = demand.shopTaxAssessment.shop.property;
      if (demand.shopTaxAssessment.shop.property.owner) {
        demand.property.owner = demand.shopTaxAssessment.shop.property.owner;
      }
    }

    // Validate ownership - property and owner must exist
    if (!demand.property || !demand.property.owner) {
      return res.status(400).json({
        success: false,
        message: 'Property or owner information not found. Cannot generate notice without owner details.'
      });
    }

    // Validate escalation rules
    try {
      await validateEscalation(demandId, noticeType);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    // Check for duplicate notice of same type
    const existingNotice = await Notice.findOne({
      where: {
        demandId,
        noticeType,
        status: { [Op.in]: ['generated', 'sent', 'viewed'] }
      }
    });

    if (existingNotice) {
      return res.status(400).json({
        success: false,
        message: `A ${noticeType} notice already exists for this demand`
      });
    }

    // Get previous notice if escalating
    const previousNotice = await Notice.findOne({
      where: { demandId },
      order: [['createdAt', 'DESC']]
    });

    // Calculate amounts
    const amountDue = parseFloat(demand.balanceAmount);
    const penaltyAmount = noticeType === 'penalty' || noticeType === 'final_warrant' 
      ? parseFloat(demand.penaltyAmount) + parseFloat(demand.interestAmount)
      : 0;

    // Generate notice number
    const noticeNumber = await generateNoticeNumber(noticeType);

    // Create notice
    const notice = await Notice.create({
      noticeNumber,
      noticeType,
      propertyId: demand.propertyId,
      ownerId: demand.property.ownerId,
      demandId,
      financialYear: demand.financialYear,
      noticeDate: new Date(),
      dueDate: dueDate || demand.dueDate,
      amountDue,
      penaltyAmount,
      status: 'generated',
      generatedBy: req.user.id,
      previousNoticeId: previousNotice ? previousNotice.id : null,
      remarks
    });

    // Fetch created notice with relations
    const createdNotice = await Notice.findByPk(notice.id, {
      include: [
        { model: Property, as: 'property', include: [{ model: User, as: 'owner' }] },
        { model: Demand, as: 'demand' },
        { model: User, as: 'generator', attributes: ['id', 'firstName', 'lastName'] },
        { model: Notice, as: 'previousNotice' }
      ]
    });

    // Log notice generation
    await auditLogger.logCreate(
      req,
      req.user,
      'Notice',
      notice.id,
      { noticeNumber: notice.noticeNumber, noticeType: notice.noticeType, amountDue: notice.amountDue },
      `Generated ${noticeType} notice: ${notice.noticeNumber}`,
      { propertyId: notice.propertyId, demandId: notice.demandId, ownerId: notice.ownerId }
    );

    // Generate notice PDF automatically
    try {
      await generateNoticePdfHelper(notice.id, req, req.user);
    } catch (pdfError) {
      console.error('Error generating notice PDF:', pdfError);
      // Don't fail notice generation if PDF generation fails
    }

    res.status(201).json({
      success: true,
      message: 'Notice generated successfully',
      data: { notice: createdNotice }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/notices
 * @desc    List all notices (with filters)
 * @access  Private (Admin, Assessor)
 */
export const getAllNotices = async (req, res, next) => {
  try {
    const {
      wardId,
      noticeType,
      status,
      propertyId,
      ownerId,
      financialYear,
      dateFrom,
      dateTo,
      search,
      page = 1,
      limit = 10
    } = req.query;

    const where = {};

    if (noticeType) where.noticeType = noticeType;
    if (status) where.status = status;
    if (propertyId) where.propertyId = propertyId;
    if (ownerId) where.ownerId = ownerId;
    if (financialYear) where.financialYear = financialYear;

    if (dateFrom || dateTo) {
      where.noticeDate = {};
      if (dateFrom) where.noticeDate[Op.gte] = new Date(dateFrom);
      if (dateTo) where.noticeDate[Op.lte] = new Date(dateTo);
    }

    if (search) {
      where[Op.or] = [
        { noticeNumber: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Filter by ward if provided
    const includeProperty = [
      {
        model: Property,
        as: 'property',
        include: [
          { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ],
        ...(wardId ? { where: { wardId } } : {})
      }
    ];

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Notice.findAndCountAll({
      where,
      include: [
        ...includeProperty,
        { model: Demand, as: 'demand', attributes: ['id', 'demandNumber', 'balanceAmount', 'status'] },
        { model: User, as: 'generator', attributes: ['id', 'firstName', 'lastName'] },
        { model: Notice, as: 'previousNotice', attributes: ['id', 'noticeNumber', 'noticeType'] }
      ],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        notices: rows,
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
 * @route   GET /api/notices/:id
 * @desc    View notice details
 * @access  Private (Admin, Assessor)
 */
export const getNoticeById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notice = await Notice.findByPk(id, {
      include: [
        {
          model: Property,
          as: 'property',
          include: [
            { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'address'] }
          ]
        },
        {
          model: Demand,
          as: 'demand',
          include: [
            { model: Property, as: 'property' }
          ]
        },
        { model: User, as: 'generator', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] },
        {
          model: Notice,
          as: 'previousNotice',
          include: [
            { model: Property, as: 'property' },
            { model: Demand, as: 'demand' }
          ]
        },
        {
          model: Notice,
          as: 'escalatedNotices',
          include: [
            { model: Property, as: 'property' },
            { model: Demand, as: 'demand' }
          ]
        }
      ]
    });

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    res.json({
      success: true,
      data: { notice }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/notices/:id/send
 * @desc    Mark notice as sent (email/sms/print)
 * @access  Private (Admin, Assessor)
 */
export const sendNotice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { deliveryMode } = req.body;

    if (!deliveryMode || !['print', 'email', 'sms'].includes(deliveryMode)) {
      return res.status(400).json({
        success: false,
        message: 'Valid delivery mode (print, email, sms) is required'
      });
    }

    const notice = await Notice.findByPk(id);
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    if (notice.status === 'resolved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot send resolved notice'
      });
    }

    const previousData = { status: notice.status };
    notice.status = 'sent';
    notice.deliveryMode = deliveryMode;
    notice.sentDate = new Date();
    await notice.save();

    // Log notice send
    await auditLogger.logSend(
      req,
      req.user,
      'Notice',
      notice.id,
      { status: notice.status, deliveryMode: notice.deliveryMode },
      `Sent notice: ${notice.noticeNumber} via ${deliveryMode}`,
      { propertyId: notice.propertyId, demandId: notice.demandId }
    );

    // Generate PDF if not already generated
    if (!notice.pdfUrl) {
      try {
        await generateNoticePdfHelper(notice.id, req, req.user);
      } catch (pdfError) {
        console.error('Error generating notice PDF:', pdfError);
        // Don't fail notice send if PDF generation fails
      }
    }

    const updatedNotice = await Notice.findByPk(id, {
      include: [
        { model: Property, as: 'property', include: [{ model: User, as: 'owner' }] },
        { model: Demand, as: 'demand' },
        { model: User, as: 'generator' }
      ]
    });

    res.json({
      success: true,
      message: 'Notice marked as sent',
      data: { notice: updatedNotice }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/notices/:id/escalate
 * @desc    Escalate notice to next enforcement stage
 * @access  Private (Admin, Assessor)
 */
export const escalateNotice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { noticeType, dueDate, remarks } = req.body;

    if (!noticeType) {
      return res.status(400).json({
        success: false,
        message: 'Notice type is required for escalation'
      });
    }

    const currentNotice = await Notice.findByPk(id, {
      include: [{ model: Demand, as: 'demand' }]
    });

    if (!currentNotice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    // Validate escalation
    try {
      await validateEscalation(currentNotice.demandId, noticeType);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    // Mark current notice as escalated
    const previousData = { status: currentNotice.status, noticeType: currentNotice.noticeType };
    currentNotice.status = 'escalated';
    await currentNotice.save();

    // Log escalation of previous notice
    await auditLogger.logEscalate(
      req,
      req.user,
      'Notice',
      currentNotice.id,
      previousData,
      { status: currentNotice.status },
      `Escalated notice: ${currentNotice.noticeNumber} to ${noticeType}`,
      { propertyId: currentNotice.propertyId, demandId: currentNotice.demandId }
    );

    // Get demand with property
    const demand = await Demand.findByPk(currentNotice.demandId, {
      include: [
        {
          model: Property,
          as: 'property',
          include: [{ model: User, as: 'owner' }]
        }
      ]
    });

    // Calculate amounts
    const amountDue = parseFloat(demand.balanceAmount);
    const penaltyAmount = noticeType === 'penalty' || noticeType === 'final_warrant'
      ? parseFloat(demand.penaltyAmount) + parseFloat(demand.interestAmount)
      : 0;

    // Generate new notice
    const noticeNumber = await generateNoticeNumber(noticeType);

    const newNotice = await Notice.create({
      noticeNumber,
      noticeType,
      propertyId: demand.propertyId,
      ownerId: demand.property.ownerId,
      demandId: demand.id,
      financialYear: demand.financialYear,
      noticeDate: new Date(),
      dueDate: dueDate || demand.dueDate,
      amountDue,
      penaltyAmount,
      status: 'generated',
      generatedBy: req.user.id,
      previousNoticeId: currentNotice.id,
      remarks
    });

    const escalatedNotice = await Notice.findByPk(newNotice.id, {
      include: [
        { model: Property, as: 'property', include: [{ model: User, as: 'owner' }] },
        { model: Demand, as: 'demand' },
        { model: User, as: 'generator' },
        { model: Notice, as: 'previousNotice' }
      ]
    });

    // Log creation of new escalated notice
    await auditLogger.logCreate(
      req,
      req.user,
      'Notice',
      newNotice.id,
      { noticeNumber: newNotice.noticeNumber, noticeType: newNotice.noticeType, amountDue: newNotice.amountDue },
      `Generated escalated ${noticeType} notice: ${newNotice.noticeNumber}`,
      { propertyId: newNotice.propertyId, demandId: newNotice.demandId, previousNoticeId: currentNotice.id }
    );

    res.status(201).json({
      success: true,
      message: 'Notice escalated successfully',
      data: {
        previousNotice: currentNotice,
        newNotice: escalatedNotice
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/citizen/notices
 * @desc    View notices related to logged-in citizen
 * @access  Private (Citizen)
 */
export const getCitizenNotices = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { noticeType, status, page = 1, limit = 10 } = req.query;

    const where = {
      ownerId: userId
    };

    if (noticeType) where.noticeType = noticeType;
    if (status) where.status = status;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Notice.findAndCountAll({
      where,
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'propertyNumber', 'address', 'wardId']
        },
        {
          model: Demand,
          as: 'demand',
          attributes: ['id', 'demandNumber', 'financialYear', 'balanceAmount', 'status']
        },
        {
          model: Notice,
          as: 'previousNotice',
          attributes: ['id', 'noticeNumber', 'noticeType', 'noticeDate']
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    // Mark notices as viewed when citizen accesses them
    const noticeIds = rows.map(n => n.id);
    await Notice.update(
      { status: 'viewed', viewedDate: new Date() },
      {
        where: {
          id: { [Op.in]: noticeIds },
          status: { [Op.in]: ['generated', 'sent'] }
        }
      }
    );

    res.json({
      success: true,
      data: {
        notices: rows,
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
 * @route   GET /api/citizen/notices/:id
 * @desc    View notice details (Citizen)
 * @access  Private (Citizen)
 */
export const getCitizenNoticeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notice = await Notice.findOne({
      where: { id, ownerId: userId },
      include: [
        {
          model: Property,
          as: 'property',
          include: [
            { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] }
          ]
        },
        {
          model: Demand,
          as: 'demand',
          include: [
            { model: Property, as: 'property' }
          ]
        },
        {
          model: Notice,
          as: 'previousNotice',
          attributes: ['id', 'noticeNumber', 'noticeType', 'noticeDate', 'amountDue']
        },
        {
          model: Notice,
          as: 'escalatedNotices',
          attributes: ['id', 'noticeNumber', 'noticeType', 'noticeDate', 'amountDue']
        }
      ]
    });

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found or access denied'
      });
    }

    // Mark as viewed
    if (notice.status === 'generated' || notice.status === 'sent') {
      notice.status = 'viewed';
      notice.viewedDate = new Date();
      await notice.save();
    }

    res.json({
      success: true,
      data: { notice }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Auto-update notice status when payment is made
 * This should be called from payment controller after successful payment
 */
export const updateNoticeOnPayment = async (demandId, req = null, user = null) => {
  try {
    const demand = await Demand.findByPk(demandId);
    if (!demand) return;

    // If demand is fully paid, mark all related notices as resolved
    if (demand.status === 'paid' && demand.balanceAmount <= 0) {
      const noticesToResolve = await Notice.findAll({
        where: {
          demandId,
          status: { [Op.in]: ['generated', 'sent', 'viewed'] }
        }
      });

      for (const notice of noticesToResolve) {
        const previousData = { status: notice.status };
        notice.status = 'resolved';
        notice.resolvedDate = new Date();
        await notice.save();

        // Log notice resolution (if req and user are available)
        if (req && user) {
          await auditLogger.logResolve(
            req,
            user,
            'Notice',
            notice.id,
            previousData,
            { status: notice.status, resolvedDate: notice.resolvedDate },
            `Resolved notice: ${notice.noticeNumber} (payment completed)`,
            { propertyId: notice.propertyId, demandId: notice.demandId }
          );
        }
      }
    }
  } catch (error) {
    console.error('Error updating notice on payment:', error);
  }
};

/**
 * @route   POST /api/notices/:id/generate-pdf
 * @desc    Generate PDF for a notice
 * @access  Private (Admin, Assessor, Citizen - own notices only)
 */
export const generateNoticePdf = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notice = await Notice.findByPk(id, {
      include: [
        { model: Property, as: 'property' },
        { model: Demand, as: 'demand' }
      ]
    });

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    // Check access - Citizens can only generate PDFs for their own notices
    if (req.user.role === 'citizen') {
      if (notice.ownerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only generate PDFs for your own notices.'
        });
      }
    }

    // Check if PDF already exists
    if (notice.pdfUrl) {
      return res.json({
        success: true,
        message: 'Notice PDF already generated',
        data: { pdfUrl: notice.pdfUrl }
      });
    }

    // Generate PDF
    const result = await generateNoticePdfHelper(notice.id, req, req.user);

    res.json({
      success: true,
      message: 'Notice PDF generated successfully',
      data: { pdfUrl: result.pdfUrl }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/notices/pdfs/:filename
 * @desc    Download notice PDF
 * @access  Private (Role-based access enforced)
 */
export const downloadNoticePdf = async (req, res, next) => {
  try {
    const { filename } = req.params;

    // Extract notice ID from filename (format: NOTICE_<id>_<timestamp>_<random>.pdf)
    const match = filename.match(/NOTICE_(\d+)_/);
    if (!match) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notice filename'
      });
    }

    const noticeId = parseInt(match[1]);

    // Fetch notice with relations
    const notice = await Notice.findByPk(noticeId, {
      include: [
        { model: Property, as: 'property' },
        { model: Demand, as: 'demand' }
      ]
    });

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    // Check access - Citizens can only download their own notices
    if (req.user.role === 'citizen') {
      if (notice.ownerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    // Collector can view notices for their assigned wards
    if (req.user.role === 'collector') {
      const property = await Property.findByPk(notice.propertyId, {
        include: [{ model: Ward, as: 'ward' }]
      });
      if (!property || !property.ward || property.ward.collectorId !== (req.user.staff_id || req.user.id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view notices for your assigned wards.'
        });
      }
    }

    // Check if PDF exists
    if (!notice.pdfUrl) {
      return res.status(404).json({
        success: false,
        message: 'Notice PDF not generated yet'
      });
    }

    // Verify filename matches
    if (!notice.pdfUrl.includes(filename)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notice filename'
      });
    }

    // Read and send PDF file
    const { readPdfFile, getNoticePdfPath } = await import('../utils/pdfStorage.js');
    const filePath = getNoticePdfPath(filename);

    try {
      const pdfBuffer = await readPdfFile(filePath);

      // Log PDF download
      await createAuditLog({
        req,
        user: req.user,
        actionType: 'NOTICE_PDF_DOWNLOADED',
        entityType: 'Notice',
        entityId: notice.id,
        description: `Downloaded ${notice.noticeType} notice PDF: ${notice.noticeNumber}`,
        metadata: { filename, noticeType: notice.noticeType }
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="notice_${notice.noticeNumber}.pdf"`);
      res.send(pdfBuffer);
    } catch (fileError) {
      return res.status(404).json({
        success: false,
        message: 'Notice PDF file not found'
      });
    }
  } catch (error) {
    next(error);
  }
};
