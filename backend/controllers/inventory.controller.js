import { InventoryItem, InventoryTransaction, User } from '../models/index.js';
import { Op } from 'sequelize';

// Items
export const getAllItems = async (req, res, next) => {
    try {
        const { category, module, search } = req.query;
        const where = {};
        if (category) where.category = category;
        if (module) where.module = module;
        if (search) where.name = { [Op.iLike]: `%${search}%` };

        const items = await InventoryItem.findAll({ where, order: [['name', 'ASC']] });
        res.json({ success: true, data: { items } });
    } catch (error) {
        next(error);
    }
};

export const createItem = async (req, res, next) => {
    try {
        const item = await InventoryItem.create(req.body);
        res.status(201).json({ success: true, data: { item } });
    } catch (error) {
        next(error);
    }
};

// Transactions
export const getAllTransactions = async (req, res, next) => {
    try {
        const { item_id, type, facility_id, facility_type } = req.query;
        const where = {};
        if (item_id) where.inventory_item_id = item_id;
        if (type) where.transaction_type = type;
        if (facility_id) where.facility_id = facility_id;
        if (facility_type) where.facility_type = facility_type;

        const transactions = await InventoryTransaction.findAll({
            where,
            include: [
                { model: InventoryItem, as: 'item', attributes: ['name', 'unit'] },
                { model: User, as: 'performer', attributes: ['firstName', 'lastName'] }
            ],
            order: [['transaction_date', 'DESC']]
        });
        res.json({ success: true, data: { transactions } });
    } catch (error) {
        next(error);
    }
};

export const recordTransaction = async (req, res, next) => {
    const t = await InventoryItem.sequelize.transaction();
    try {
        const { inventory_item_id, transaction_type, quantity } = req.body;

        const item = await InventoryItem.findByPk(inventory_item_id, { transaction: t });
        if (!item) throw new Error('Inventory item not found');

        // Update stock
        const qty = parseFloat(quantity);
        if (transaction_type === 'in') {
            item.current_stock = parseFloat(item.current_stock) + qty;
        } else {
            if (parseFloat(item.current_stock) < qty) {
                throw new Error('Insufficient stock');
            }
            item.current_stock = parseFloat(item.current_stock) - qty;
        }
        await item.save({ transaction: t });

        const transaction = await InventoryTransaction.create({
            ...req.body,
            performed_by: req.user.id
        }, { transaction: t });

        await t.commit();
        res.status(201).json({ success: true, data: { transaction, current_stock: item.current_stock } });
    } catch (error) {
        await t.rollback();
        res.status(400).json({ success: false, message: error.message });
    }
};
