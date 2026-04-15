import { Property, Demand, Payment, Ward, User, Assessment, CollectorTask, WaterConnection, Shop, ULB, AdminManagement } from '../models/index.js';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';

class QueryExecutorService {
  constructor() {
    this.models = {
      properties: Property,
      demands: Demand,
      payments: Payment,
      wards: Ward
    };
  }

  async executeQuery(aiQuery, user) {
    const { collection, action, aggregation, field, filters = {}, sort, limit } = aiQuery;
    const Model = this.models[collection];

    if (!Model) {
      throw new Error(`Collection ${collection} not found`);
    }

    // 1. Build Where Clause with Field Mapping
    const fieldMap = {
      'property_id': 'propertyNumber',
      'ownerName': 'ownerName',
      'owner_name': 'ownerName',
      'status': 'status'
    };

    const where = {};
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        const dbField = fieldMap[key] || key;
        if (dbField === 'ownerName' && value) {
          where[dbField] = { [Op.iLike]: `%${value}%` };
        } else if (value !== null && value !== undefined && value !== 'REPLACE_WITH_ACTUAL_NAME') {
          where[dbField] = value;
        }
      }
    }

    // Role-based security filters
    if (user.role === 'citizen') {
      if (collection === 'properties') where.ownerId = user.id;
      else where['$property.ownerId$'] = user.id;
    }

    // console.log('[AI QUERY DEBUG]:', { collection, action, filters, where });

    // 2. Handle Aggregations
    if (action === 'AGGREGATE') {
      const dbField = field === 'amount' || field === 'total_amount' ? 'totalAmount' : field;
      
      let result;
      if (aggregation === 'SUM') result = await Model.sum(dbField, { where, include: collection !== 'properties' ? ['property'] : [] });
      if (aggregation === 'COUNT') result = await Model.count({ where, include: collection !== 'properties' ? ['property'] : [] });
      if (aggregation === 'MAX') result = await Model.max(dbField, { where, include: collection !== 'properties' ? ['property'] : [] });

      return {
        type: 'RESULT',
        action: 'AGGREGATE',
        value: result || 0,
        summary: `Total ${aggregation} of ${field} calculated successfully.`
      };
    }

    // 3. Handle Fetch (List/Detail)
    const fieldMapping = {
      'property_number': 'propertyNumber',
      'propertyNumber': 'propertyNumber',
      'owner_name': 'ownerName',
      'ownerName': 'ownerName',
      'amount': 'totalAmount',
      'total_amount': 'totalAmount',
      'status': 'status',
      'createdAt': 'createdAt'
    };

    const sortField = sort?.field ? (fieldMapping[sort.field] || sort.field) : 'createdAt';
    const order = [[sortField, sort?.direction === -1 ? 'DESC' : 'ASC']];
    const safeLimit = limit && limit > 0 ? Math.min(limit, 50) : 10;

    const data = await Model.findAll({
      where,
      include: collection !== 'properties' ? [{ model: Property, as: 'property' }] : [{ model: Demand, as: 'demands' }],
      order,
      limit: safeLimit
    });

    return {
      type: 'RESULT',
      action: 'FETCH',
      count: data.length,
      data: this.formatResults(data, collection)
    };
  }

  async fetchComprehensiveUlbData(user) {
    const isCitizen = user?.role === 'citizen';
    const isAdmin = user?.role === 'admin';
    const ulbId = user?.ulb_id;

    // Scoping strategy:
    // 1. Citizen: Only their own properties.
    // 2. ULB Staff: Everything in their specific ULB.
    // 3. Super Admin (no ulbId): Can see across all ULBs (limited for safety).
    
    const baseWhere = {};
    if (isCitizen) {
      baseWhere.ownerId = user.id;
    } else if (ulbId) {
      baseWhere.ulb_id = ulbId;
    }

    const refWhere = isCitizen ? { '$property.ownerId$': user.id } : (ulbId ? { ulb_id: ulbId } : {});

    // 1. Properties & Tax Demands
    const properties = await Property.findAll({ 
      where: baseWhere, 
      include: [
        { model: Demand, as: 'demands' },
        { model: Ward, as: 'ward' }
      ],
      limit: 10 
    });


    // 2. Payments (Revenue)
    const payments = await Payment.findAll({ 
      where: refWhere, 
      include: [
        { model: Property, as: 'property' },
        { model: Demand, as: 'demand' }
      ],
      limit: 10,
      order: [['createdAt', 'DESC']]
    });

    // 3. Assessments
    const assessments = await Assessment.findAll({
      where: refWhere,
      include: [
        { model: Property, as: 'property' },
        { model: Demand, as: 'demands' }
      ],
      limit: 5,
      order: [['createdAt', 'DESC']]
    });

    // 4. Utility & Commercial Data (New)
    const shops = await Shop.findAll({
      where: baseWhere,
      limit: 15
    });

    const waterConnections = await WaterConnection.findAll({
      where: baseWhere,
      limit: 15
    });



    // 4. Counts & Summaries
    let meta = {};
    let wards = [];
    let staffList = [];
    if (!isCitizen) {
      // Include collector details in ward fetch
      wards = await Ward.findAll({ 
        where: ulbId ? { ulb_id: ulbId } : {}, 
        include: [{ model: AdminManagement, as: 'collector', attributes: ['full_name', 'employee_id'] }],
        limit: 50 
      });

      const targetWardIds = wards.map(w => w.id);

      // Comprehensive Staff List for the ULB
      const staffMembers = await AdminManagement.findAll({
        where: ulbId ? { ulb_id: ulbId } : {},
        attributes: ['full_name', 'role', 'employee_id', 'phone_number'],
        limit: 50
      });

      staffList = staffMembers.map(s => ({
        name: s.full_name,
        role: s.role,
        id: s.employee_id,
        phone: s.phone_number
      }));

      // Financial Statistics (Aggregates) - Match Dashboard precisely
      const allPropertyIds = await Property.findAll({
        where: { wardId: { [Op.in]: targetWardIds } },
        attributes: ['id'],
        raw: true
      }).then(props => props.map(p => p.id));

      const totalCollection = await Payment.sum('amount', {
        where: { 
          propertyId: { [Op.in]: allPropertyIds },
          status: 'completed'
        }
      }) || 0;

      const totalOutstanding = await Demand.sum('balanceAmount', {
        include: [{
          model: Property,
          as: 'property',
          where: { wardId: { [Op.in]: targetWardIds } },
          attributes: []
        }]
      }) || 0;

      meta = {
        total_citizens: await User.count({ where: { role: 'citizen', ...(ulbId && { ulb_id: ulbId }) } }),
        total_staff: await User.count({ where: { role: { [Op.not]: 'citizen' }, ...(ulbId && { ulb_id: ulbId }) } }),
        total_collection: '₹' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(totalCollection),
        total_outstanding: '₹' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(totalOutstanding),
        water_connections: await WaterConnection.count({ where: ulbId ? { ulb_id: ulbId } : {} }),
        shops_count: await Shop.count({ where: ulbId ? { ulb_id: ulbId } : {} }),
        tasks_pending: await CollectorTask.count({ where: { status: 'pending', ...(ulbId && { ulb_id: ulbId }) } })
      };

      // Ward Summaries (Comprehensive for Accuracy)
      const wardSummaries = await Promise.all(wards.map(async (w) => {
        const propertiesInWard = await Property.findAll({
          where: { wardId: w.id },
          attributes: ['id'],
          raw: true
        });
        const pIds = propertiesInWard.map(p => p.id);

        const collection = await Payment.sum('amount', {
          where: { propertyId: { [Op.in]: pIds }, status: 'completed' }
        }) || 0;

        const outstanding = await Demand.sum('balanceAmount', {
          where: { propertyId: { [Op.in]: pIds } }
        }) || 0;

        const pending = await Demand.count({
          where: { propertyId: { [Op.in]: pIds }, status: 'pending' }
        });
        
        return {
          ward_name: w.wardName,
          ward_no: w.wardNumber,
          total_properties: propertiesInWard.length,
          total_collection: collection,
          outstanding_amount: outstanding,
          pending_demands: pending,
          // Formatted versions for AI direct reading
          formatted_collection: '₹' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(collection),
          formatted_outstanding: '₹' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(outstanding)
        };
      }));

      meta.ward_breakdown = wardSummaries;
    }

    // 5. Multi-ULB Insight (Related ULBs)
    let relatedUlbs = [];
    if (isAdmin && !ulbId) {
      relatedUlbs = await ULB.findAll({ where: { status: 'ACTIVE' }, limit: 5 });
    }

    return {
      current_ulb: user.ulbName || (ulbId ? 'Current ULB' : 'Global'),
      related_ulbs: relatedUlbs.map(u => u.name),
      properties: this.formatResults(properties, 'properties'),
      payments: this.formatResults(payments, 'payments'),
      staff: staffList,
      utility: {
        shops: shops.map(s => ({ name: s.shopName, category: s.tradeType, status: s.status })),
        water: waterConnections.map(w => ({ connection_no: w.connectionNumber, status: w.status }))
      },
      assessments: assessments.map(a => ({ 
        id: a.id, 
        property_no: a.property?.propertyNumber || 'N/A', 
        type: a.assessmentType, 
        status: a.status,
        demands: a.demands?.map(d => d.demandNumber) || []
      })),
      wards: wards.map(w => ({ 
        name: w.wardName, 
        ward_id: w.wardNumber,
        collector: w.collector?.full_name || 'Not Assigned'
      })),
      system_summary: meta,
      timestamp: new Date().toISOString()
    };
  }

  formatResults(data, collection) {
    return data.map(item => {
      if (collection === 'properties') {
        const totalPending = item.demands?.filter(d => d.status === 'pending').reduce((s, d) => s + Number(d.totalAmount), 0) || 0;
        const formattedPending = '₹' + new Intl.NumberFormat('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(totalPending);

        return {
          'id': item.propertyNumber,
          'owner': item.ownerName,
          'demand_no': item.demands?.[0]?.demandNumber || 'N/A',
          'ward_name': item.ward?.wardName || 'N/A',
          'pending_tax': formattedPending
        };
      }

      if (collection === 'payments') {
        const amt = Number(item.totalAmount || item.amount || 0);
        const formattedAmt = '₹' + new Intl.NumberFormat('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(amt);

        return {
          'property': item.property?.propertyNumber || 'N/A',
          'demand_no': item.demand?.demandNumber || 'N/A',
          'amount': formattedAmt,
          'date': item.paymentDate ? new Date(item.paymentDate).toLocaleDateString() : 'N/A'
        };
      }



      return item;
    });
  }
}




export const queryExecutor = new QueryExecutorService();
