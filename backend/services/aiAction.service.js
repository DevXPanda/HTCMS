import { Property, User, Demand, Payment, CollectorTask, Ward, ULB } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

class AIActionService {
  async execute(actionRequest, user) {
    const { action, params } = actionRequest;
    
    // Role-based Access Control for Actions
    const rolePermissions = {
      'admin': ['ADD_PROPERTY', 'ADD_CITIZEN', 'ASSIGN_TASK', 'UPDATE_TASK'],
      'officer': ['ADD_PROPERTY', 'ADD_CITIZEN', 'ASSIGN_TASK', 'UPDATE_TASK'],
      'inspector': ['ADD_PROPERTY', 'UPDATE_TASK'],
      'clerk': ['ADD_PROPERTY', 'ADD_CITIZEN'],
      'collector': ['COLLECT_PAYMENT', 'UPDATE_TASK'],
      'citizen': [], // Citizens can only view via this AI
      'all': ['GET_WARD_SUMMARY'] // Shared actions
    };

    const allowedActions = [
      ...(rolePermissions[user.role] || []),
      ...(rolePermissions['all'] || [])
    ];

    if (!allowedActions.includes(action)) {
      return {
        success: false,
        message: `Your role (${user.role}) is not authorized to perform the action: ${action}`
      };
    }

    try {
      switch (action) {
        case 'GET_WARD_SUMMARY':
          return await this.getWardSummary(params, user);
        case 'ADD_PROPERTY':
          return await this.addProperty(params, user);
        case 'ADD_CITIZEN':
          return await this.addCitizen(params, user);
        case 'ASSIGN_TASK':
          return await this.assignTask(params, user);
        case 'UPDATE_TASK':
          return await this.updateTask(params, user);
        case 'COLLECT_PAYMENT':
          return await this.collectPayment(params, user);
        default:
          return { success: false, message: `Action ${action} not implemented.` };
      }
    } catch (error) {
      console.error(`AI Action execution error (${action}):`, error);
      return { success: false, message: `Error performing action: ${error.message}` };
    }
  }

  async addProperty(params, user) {
    const { owner_name, property_number, ward_id, total_area, property_type } = params;
    
    // Basic validation
    if (!owner_name || !property_number || !ward_id) {
      throw new Error('Missing required property details (owner_name, property_number, ward_id)');
    }

    // Check if ward exists in this ULB
    const ward = await Ward.findOne({ where: { wardNumber: ward_id, ulb_id: user.ulb_id } });
    if (!ward) throw new Error(`Ward ${ward_id} not found in your ULB.`);

    const property = await Property.create({
      id: uuidv4(),
      propertyNumber: property_number,
      ownerName: owner_name,
      wardId: ward.id,
      totalArea: total_area || 0,
      propertyType: property_type || 'Residential',
      status: 'active',
      ulb_id: user.ulb_id,
      createdBy: user.id
    });

    return {
      success: true,
      message: `Property ${property_number} for ${owner_name} has been successfully registered in Ward ${ward_id}.`,
      data: property
    };
  }

  async addCitizen(params, user) {
    const { name, mobile, email, address } = params;

    if (!name || !mobile) {
      throw new Error('Name and mobile number are required to add a citizen.');
    }

    const citizen = await User.create({
      id: uuidv4(),
      fullName: name,
      phoneNumber: mobile,
      email: email || `${mobile}@ulb.com`,
      address: address || 'N/A',
      role: 'citizen',
      ulb_id: user.ulb_id,
      password: 'password123' // Default password
    });

    return {
      success: true,
      message: `Citizen ${name} has been registered successfully. Login credentials set to default.`,
      data: { id: citizen.id, name: citizen.fullName, mobile: citizen.phoneNumber }
    };
  }

  async assignTask(params, user) {
    const { collector_id, property_id, task_description, priority } = params;

    if (!collector_id || !property_id) {
      throw new Error('Collector ID and Property ID are required for task assignment.');
    }

    const task = await CollectorTask.create({
      id: uuidv4(),
      collectorId: collector_id,
      propertyId: property_id,
      title: 'AI Assigned Task',
      description: task_description || 'Property verification or tax collection.',
      priority: priority || 'medium',
      status: 'pending',
      ulb_id: user.ulb_id
    });

    return {
      success: true,
      message: `Task successfully assigned to collector.`,
      data: task
    };
  }

  async updateTask(params, user) {
    const { task_id, status, remarks } = params;

    const task = await CollectorTask.findByPk(task_id);
    if (!task) throw new Error('Task not found.');

    task.status = status || task.status;
    task.notes = remarks || task.notes;
    await task.save();

    return {
      success: true,
      message: `Task ${task_id} has been updated to ${task.status}.`,
      data: task
    };
  }

  async collectPayment(params, user) {
    const { demand_no, amount, payment_mode } = params;

    const demand = await Demand.findOne({ where: { demandNumber: demand_no } });
    if (!demand) throw new Error(`Demand ${demand_no} not found.`);

    const payment = await Payment.create({
      id: uuidv4(),
      demandId: demand.id,
      propertyId: demand.propertyId,
      totalAmount: amount,
      paymentMode: payment_mode || 'Cash',
      paymentDate: new Date(),
      status: 'completed',
      collectedBy: user.id,
      ulb_id: user.ulb_id
    });

    // Update demand status if fully paid (simple logic)
    if (amount >= demand.totalAmount) {
      demand.status = 'paid';
      await demand.save();
    }

    return {
      success: true,
      message: `Payment of ₹${amount} received against Demand ${demand_no}. Receipt generated.`,
      data: payment
    };
  }

  async getWardSummary(params, user) {
    const { ward_no } = params;
    if (!ward_no) throw new Error('Ward number is required.');

    // Normalize ward number (e.g., 23 -> 023)
    const normalizedWardNo = String(ward_no).trim().padStart(3, '0');

    // Find ward in this ULB
    const ward = await Ward.findOne({ 
      where: { 
        wardNumber: normalizedWardNo, 
        ulb_id: user.ulb_id 
      } 
    });

    if (!ward) return { success: false, message: `Ward ${normalizedWardNo} not found.` };

    // Fetch accurate statistics matching dashboard
    const properties = await Property.findAll({ where: { wardId: ward.id }, attributes: ['id'] });
    const pIds = properties.map(p => p.id);

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
      success: true,
      message: `Data for Ward ${normalizedWardNo} fetched.`,
      data: {
        ward: normalizedWardNo,
        total_properties: properties.length,
        total_collection: parseFloat(collection),
        outstanding_amount: parseFloat(outstanding),
        pending_demands: pending
      }
    };
  }
}

export const aiAction = new AIActionService();
