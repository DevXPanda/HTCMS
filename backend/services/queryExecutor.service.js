import { Property, Demand, Payment, Ward, User, Assessment, CollectorTask, WaterConnection, Shop } from '../models/index.js';
import { Op } from 'sequelize';

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

    console.log('[AI QUERY DEBUG]:', { collection, action, filters, where });

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
    const where = isCitizen ? { ownerId: user.id } : {};
    const refWhere = isCitizen ? { '$property.ownerId$': user.id } : {};

    // 1. Properties & Tax Demands
    const properties = await Property.findAll({ 
      where, 
      include: [
        { model: Demand, as: 'demands' },
        { model: Ward, as: 'ward' }
      ],
      limit: 30 
    });


    // 2. Payments (Revenue)
    const payments = await Payment.findAll({ 
      where: refWhere, 
      include: [
        { model: Property, as: 'property' },
        { model: Demand, as: 'demand' }
      ],
      limit: 20,
      order: [['createdAt', 'DESC']]
    });

    // 3. Assessments (Sample)
    const assessments = await Assessment.findAll({
      where: refWhere,
      include: [
        { model: Property, as: 'property' },
        { model: Demand, as: 'demands' }
      ],
      limit: 10,
      order: [['createdAt', 'DESC']]
    });



    // 4. Counts & Summaries (Admin Only)
    let meta = {};
    let wards = [];
    if (!isCitizen) {
      wards = await Ward.findAll({ limit: 50 });
      meta = {
        total_citizens: await User.count({ where: { role: 'citizen' } }),
        total_staff: await User.count({ where: { role: { [Op.not]: 'citizen' } } }),
        water_connections: await WaterConnection.count(),
        shops_count: await Shop.count(),
        tasks_pending: await CollectorTask.count({ where: { status: 'pending' } })
      };
    }

    return {
      properties: this.formatResults(properties, 'properties'),
      payments: this.formatResults(payments, 'payments'),
      assessments: assessments.map(a => ({ 
        id: a.id, 
        property_no: a.property?.propertyNumber || 'N/A', 
        type: a.assessmentType, 
        status: a.status,
        demands: a.demands?.map(d => d.demandNumber) || []
      })),
      wards: wards.map(w => ({ name: w.wardName, ward_id: w.wardNumber })),
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
