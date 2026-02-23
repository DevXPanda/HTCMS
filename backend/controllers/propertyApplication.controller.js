import { PropertyApplication, User, Ward, Property } from '../models/index.js';
import { Op } from 'sequelize';
import { auditLogger } from '../utils/auditLogger.js';
import { getNextPropertyNumberInWard, generatePropertyUniqueId } from '../services/uniqueIdService.js';

/**
 * @route   POST /api/property-applications
 * @desc    Create new property application (Clerk only)
 * @access  Private (Clerk, Admin)
 */
export const createPropertyApplication = async (req, res, next) => {
    try {
        const {
            applicantId,
            wardId,
            ownerName,
            ownerPhone,
            propertyType,
            usageType,
            address,
            city,
            state,
            pincode,
            area,
            builtUpArea,
            floors,
            constructionType,
            constructionYear,
            occupancyStatus,
            geolocation,
            photos,
            documents,
            remarks
        } = req.body;

        const user = req.user;

        // Validation
        if (!wardId || !ownerName || !propertyType || !address || !city || !state || !pincode || !area) {
            return res.status(400).json({
                success: false,
                message: 'Required fields missing: wardId, ownerName, propertyType, address, city, state, pincode, area'
            });
        }

        // Verify ward exists
        const ward = await Ward.findByPk(wardId);
        if (!ward) {
            return res.status(404).json({
                success: false,
                message: 'Ward not found'
            });
        }

        // Determine Applicant ID
        let finalApplicantId = applicantId;

        // If no applicantId provided (e.g. Clerk creating for a citizen), find or create the citizen
        if (!finalApplicantId) {
            if (ownerPhone) {
                // Try to find existing citizen by phone
                let citizen = await User.findOne({ where: { phone: ownerPhone, role: 'citizen' } });

                if (!citizen) {
                    // Create new citizen account
                    // Generate a random password for the new user (they can reset it later)
                    const tempPassword = Math.random().toString(36).slice(-8);
                    const nameParts = ownerName.split(' ');
                    const firstName = nameParts[0];
                    const lastName = nameParts.slice(1).join(' ') || '.';
                    const username = `citizen_${Date.now()}`;

                    citizen = await User.create({
                        username,
                        email: `${username}@placeholder.com`, // Placeholder email
                        password: tempPassword,
                        firstName,
                        lastName,
                        phone: ownerPhone,
                        role: 'citizen',
                        createdBy: user.role === 'admin' ? user.id : null // Only link if creator is also in Users table
                    });
                }
                finalApplicantId = citizen.id;
            } else {
                // Fallback if no phone: Check if the creator is a User (Citizen self-register)
                // If creator is Clerk (from admin_management), we CANNOT use their ID.
                if (req.userType === 'staff' || req.user.role === 'clerk') {
                    return res.status(400).json({
                        success: false,
                        message: 'Owner Phone is required to create a property application.'
                    });
                }
                finalApplicantId = user.id;
            }
        } else {
            // Verify provided applicantId exists
            const applicant = await User.findByPk(applicantId);
            if (!applicant) {
                return res.status(404).json({
                    success: false,
                    message: 'Applicant user not found'
                });
            }
        }

        // Generate application number
        const count = await PropertyApplication.count();
        const applicationNumber = `PROP-APP-${Date.now()}-${count + 1}`;

        // Handle createdBy FK constraint
        // createdBy references 'users' table. 
        // If logged in user is Clerk (admin_management), we cannot use user.id directly if it violates FK.
        // However, usually createdBy in this model implies the 'User' account.
        // If the system separates Staff and Users tables, this field design is flawed for Staff creators.
        // WORKAROUND: For now, if creator is staff, we might store the applicantId here too, 
        // OR we assume there is a mapping. 
        // Safest approach without schema change: Use finalApplicantId as createdBy 
        // and log the actual clerk in audit logs.
        let createdById = user.id;

        // If user is staff/clerk, their ID likely does not exist in 'users' table or conflicts.
        // We check if we can validly use it, otherwise fallback to applicantId.
        if (req.userType === 'staff' || user.role === 'clerk') {
            // Staff IDs are likely not in Users table.
            // We use finalApplicantId to satisfy the constraint
            createdById = finalApplicantId;
        }

        // Create application
        const application = await PropertyApplication.create({
            applicationNumber,
            applicantId: finalApplicantId,
            createdBy: createdById,
            wardId,
            ownerName,
            ownerPhone,
            propertyType,
            usageType,
            address,
            city,
            state,
            pincode,
            area,
            builtUpArea,
            floors,
            constructionType,
            constructionYear,
            occupancyStatus,
            geolocation,
            photos,
            documents,
            remarks: user.role === 'clerk' ? `${remarks || ''} (Created by Clerk: ${user.full_name}, ID: ${user.id})` : remarks,
            status: 'DRAFT'
        });

        // Audit log
        await auditLogger.logCreate(
            req,
            user,
            'PropertyApplication',
            application.id,
            application.toJSON(),
            `Property application ${applicationNumber} created as DRAFT`,
            { applicationNumber, status: 'DRAFT' }
        );

        res.status(201).json({
            success: true,
            message: 'Property application created successfully',
            data: { application }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/property-applications
 * @desc    Get all property applications (role-filtered)
 * @access  Private
 */
export const getPropertyApplications = async (req, res, next) => {
    try {
        const {
            status,
            wardId,
            search,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'DESC'
        } = req.query;

        const user = req.user;
        const where = {};

        // Role-based filtering
        if (user.role === 'clerk') {
            // Clerks see only their own applications
            where.createdBy = user.id;
        }
        // Admin and assessor can see all applications

        if (status) where.status = status;
        if (wardId) where.wardId = wardId;

        if (search) {
            where[Op.or] = [
                { applicationNumber: { [Op.iLike]: `%${search}%` } },
                { ownerName: { [Op.iLike]: `%${search}%` } },
                { ownerPhone: { [Op.iLike]: `%${search}%` } },
                { address: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows } = await PropertyApplication.findAndCountAll({
            where,
            include: [
                { model: User, as: 'applicant', attributes: ['id', 'firstName', 'lastName', 'email'] },
                { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] },
                { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] },
                { model: User, as: 'inspector', attributes: ['id', 'firstName', 'lastName', 'email'] },
                { model: User, as: 'decidedByOfficer', attributes: ['id', 'firstName', 'lastName', 'email'] },
                { model: Property, as: 'approvedProperty', attributes: ['id', 'propertyNumber'] }
            ],
            limit: parseInt(limit),
            offset,
            order: [[sortBy, sortOrder]]
        });

        res.json({
            success: true,
            data: {
                applications: rows,
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
 * @route   GET /api/property-applications/:id
 * @desc    Get property application by ID (role-filtered)
 * @access  Private
 */
export const getPropertyApplicationById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const where = { id };

        // Clerks can only see their own applications
        if (user.role === 'clerk') {
            where.createdBy = user.id;
        }

        const application = await PropertyApplication.findOne({
            where,
            include: [
                { model: User, as: 'applicant', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] },
                { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] },
                { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] },
                { model: User, as: 'inspector', attributes: ['id', 'firstName', 'lastName', 'email'] },
                { model: User, as: 'decidedByOfficer', attributes: ['id', 'firstName', 'lastName', 'email'] },
                { model: Property, as: 'approvedProperty', attributes: ['id', 'propertyNumber', 'address'] }
            ]
        });

        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Property application not found or access denied'
            });
        }

        res.json({
            success: true,
            data: { application }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/property-applications/:id
 * @desc    Update property application (Clerk, only DRAFT/RETURNED status)
 * @access  Private (Clerk, Admin)
 */
export const updatePropertyApplication = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const where = { id };

        // Clerks can only update their own applications
        if (user.role === 'clerk') {
            where.createdBy = user.id;
        }

        const application = await PropertyApplication.findOne({ where });

        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Property application not found or access denied'
            });
        }

        // Check if status allows editing
        if (!['DRAFT', 'RETURNED'].includes(application.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot edit application in ${application.status} status. Only DRAFT or RETURNED applications can be edited.`
            });
        }

        const previousData = application.toJSON();

        // Update allowed fields
        const {
            wardId,
            ownerName,
            ownerPhone,
            propertyType,
            usageType,
            address,
            city,
            state,
            pincode,
            area,
            builtUpArea,
            floors,
            constructionType,
            constructionYear,
            occupancyStatus,
            geolocation,
            photos,
            documents,
            remarks
        } = req.body;

        if (wardId !== undefined) application.wardId = wardId;
        if (ownerName !== undefined) application.ownerName = ownerName;
        if (ownerPhone !== undefined) application.ownerPhone = ownerPhone;
        if (propertyType !== undefined) application.propertyType = propertyType;
        if (usageType !== undefined) application.usageType = usageType;
        if (address !== undefined) application.address = address;
        if (city !== undefined) application.city = city;
        if (state !== undefined) application.state = state;
        if (pincode !== undefined) application.pincode = pincode;
        if (area !== undefined) application.area = area;
        if (builtUpArea !== undefined) application.builtUpArea = builtUpArea;
        if (floors !== undefined) application.floors = floors;
        if (constructionType !== undefined) application.constructionType = constructionType;
        if (constructionYear !== undefined) application.constructionYear = constructionYear;
        if (occupancyStatus !== undefined) application.occupancyStatus = occupancyStatus;
        if (geolocation !== undefined) application.geolocation = geolocation;
        if (photos !== undefined) application.photos = photos;
        if (documents !== undefined) application.documents = documents;
        if (remarks !== undefined) application.remarks = remarks;

        await application.save();

        // Audit log
        await auditLogger.logUpdate(
            req,
            user,
            'PropertyApplication',
            application.id,
            previousData,
            application.toJSON(),
            `Property application ${application.applicationNumber} updated`,
            { applicationNumber: application.applicationNumber }
        );

        res.json({
            success: true,
            message: 'Property application updated successfully',
            data: { application }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/property-applications/:id/submit
 * @desc    Submit property application for inspection (DRAFT/RETURNED → SUBMITTED)
 * @access  Private (Clerk, Admin)
 */
export const submitPropertyApplication = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const where = { id };

        // Clerks can only submit their own applications
        if (user.role === 'clerk') {
            where.createdBy = user.id;
        }

        const application = await PropertyApplication.findOne({ where });

        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Property application not found or access denied'
            });
        }

        // Check if status allows submission
        if (!['DRAFT', 'RETURNED'].includes(application.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot submit application in ${application.status} status. Only DRAFT or RETURNED applications can be submitted.`
            });
        }

        const previousData = application.toJSON();

        // Update status to SUBMITTED
        application.status = 'SUBMITTED';
        application.submittedAt = new Date();

        await application.save();

        // Audit log
        await auditLogger.logUpdate(
            req,
            user,
            'PropertyApplication',
            application.id,
            previousData,
            application.toJSON(),
            `Property application ${application.applicationNumber} submitted for inspection`,
            {
                applicationNumber: application.applicationNumber,
                previousStatus: previousData.status,
                newStatus: 'SUBMITTED'
            }
        );

        res.json({
            success: true,
            message: 'Property application submitted for inspection successfully',
            data: { application }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/property-applications/:id/review
 * @desc    Assessor reviews application (SUBMITTED → UNDER_INSPECTION → APPROVED/REJECTED/RETURNED)
 * @access  Private (Assessor, Admin only)
 */
export const inspectionReviewApplication = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { action, inspectionRemarks, rejectionReason } = req.body;
        const user = req.user;

        // Validate action
        const validActions = ['start_inspection', 'approve', 'reject', 'return'];
        if (!validActions.includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid action. Must be one of: start_inspection, approve, reject, return'
            });
        }

        const application = await PropertyApplication.findByPk(id, {
            include: [
                { model: User, as: 'applicant', attributes: ['id', 'firstName', 'lastName', 'email'] },
                { model: Ward, as: 'ward' }
            ]
        });

        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Property application not found'
            });
        }

        const previousData = application.toJSON();
        let newStatus;
        let description;

        switch (action) {
            case 'start_inspection':
                if (application.status !== 'SUBMITTED') {
                    return res.status(400).json({
                        success: false,
                        message: 'Can only start inspection on SUBMITTED applications'
                    });
                }
                newStatus = 'UNDER_INSPECTION';
                application.inspectedBy = user.id;
                application.inspectedAt = new Date();
                description = `Property application ${application.applicationNumber} inspection started`;
                break;

            case 'approve':
                if (!['SUBMITTED', 'UNDER_INSPECTION'].includes(application.status)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Can only approve SUBMITTED or UNDER_INSPECTION applications'
                    });
                }

                // Create actual Property record (unique ID = PREFIX + WARD(3) + PROPERTY_NUMBER(4))
                const nextNum = await getNextPropertyNumberInWard(application.wardId);
                const uniqueCode = generatePropertyUniqueId(application.wardId, application.propertyType, nextNum);
                const propertyNumber = uniqueCode;

                const newProperty = await Property.create({
                    propertyNumber,
                    uniqueCode,
                    ownerId: application.applicantId,
                    ownerName: application.ownerName,
                    ownerPhone: application.ownerPhone,
                    wardId: application.wardId,
                    propertyType: application.propertyType,
                    usageType: application.usageType,
                    address: application.address,
                    city: application.city,
                    state: application.state,
                    pincode: application.pincode,
                    area: application.area,
                    builtUpArea: application.builtUpArea,
                    floors: application.floors,
                    constructionType: application.constructionType,
                    constructionYear: application.constructionYear,
                    occupancyStatus: application.occupancyStatus,
                    geolocation: application.geolocation,
                    photos: application.photos,
                    status: 'active',
                    createdBy: user.id
                });

                newStatus = 'APPROVED';
                application.approvedPropertyId = newProperty.id;
                application.inspectedBy = user.id;
                application.inspectedAt = new Date();
                description = `Property application ${application.applicationNumber} approved and property ${propertyNumber} created`;

                // Log property creation
                await auditLogger.logCreate(
                    req,
                    user,
                    'Property',
                    newProperty.id,
                    newProperty.toJSON(),
                    `Property ${propertyNumber} created from approved application ${application.applicationNumber}`,
                    { applicationId: application.id, applicationNumber: application.applicationNumber }
                );
                break;

            case 'reject':
                if (!['SUBMITTED', 'UNDER_INSPECTION'].includes(application.status)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Can only reject SUBMITTED or UNDER_INSPECTION applications'
                    });
                }
                if (!rejectionReason) {
                    return res.status(400).json({
                        success: false,
                        message: 'Rejection reason is required'
                    });
                }
                newStatus = 'REJECTED';
                application.rejectionReason = rejectionReason;
                application.inspectedBy = user.id;
                application.inspectedAt = new Date();
                description = `Property application ${application.applicationNumber} rejected`;
                break;

            case 'return':
                if (!['SUBMITTED', 'UNDER_INSPECTION'].includes(application.status)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Can only return SUBMITTED or UNDER_INSPECTION applications'
                    });
                }
                if (!inspectionRemarks) {
                    return res.status(400).json({
                        success: false,
                        message: 'Inspection remarks are required when returning application'
                    });
                }
                newStatus = 'RETURNED';
                application.inspectedBy = user.id;
                application.inspectedAt = new Date();
                description = `Property application ${application.applicationNumber} returned to clerk for corrections`;
                break;
        }

        application.status = newStatus;
        if (inspectionRemarks) application.inspectionRemarks = inspectionRemarks;

        await application.save();

        // Audit log
        const actionType = action === 'approve' ? 'APPROVE' : action === 'reject' ? 'REJECT' : 'SEND';
        await auditLogger.logUpdate(
            req,
            user,
            'PropertyApplication',
            application.id,
            previousData,
            application.toJSON(),
            description,
            {
                applicationNumber: application.applicationNumber,
                action,
                previousStatus: previousData.status,
                newStatus,
                inspectionRemarks,
                rejectionReason
            }
        );

        res.json({
            success: true,
            message: `Property application ${action}d successfully`,
            data: { application }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   DELETE /api/property-applications/:id
 * @desc    Delete property application (only DRAFT status)
 * @access  Private (Clerk, Admin)
 */
export const deletePropertyApplication = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const where = { id };

        // Clerks can only delete their own applications
        if (user.role === 'clerk') {
            where.createdBy = user.id;
        }

        const application = await PropertyApplication.findOne({ where });

        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Property application not found or access denied'
            });
        }

        // Only DRAFT applications can be deleted
        if (application.status !== 'DRAFT') {
            return res.status(400).json({
                success: false,
                message: 'Only DRAFT applications can be deleted'
            });
        }

        const previousData = application.toJSON();

        await application.destroy();

        // Audit log
        await auditLogger.logDelete(
            req,
            user,
            'PropertyApplication',
            application.id,
            previousData,
            `Property application ${application.applicationNumber} deleted`,
            { applicationNumber: application.applicationNumber }
        );

        res.json({
            success: true,
            message: 'Property application deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
