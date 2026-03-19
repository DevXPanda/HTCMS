import { Op, Sequelize, fn, col } from 'sequelize';
import { Property, User, Payment, Worker, Demand, Assessment, Notice, AdminManagement } from '../models/index.js';

const normalizeRole = (r) => (r || '').toString().toUpperCase().replace(/-/g, '_');

const ROLE_MODULES = {
  ADMIN:           ['properties', 'citizens', 'workers', 'payments', 'demands', 'assessments', 'notices', 'staff'],
  SBM:             ['properties', 'citizens', 'workers', 'payments', 'demands', 'assessments', 'notices', 'staff'],
  EO:              ['workers'],
  SUPERVISOR:      ['workers'],
  SFI:             ['workers'],
  COLLECTOR:       ['properties', 'demands'],
  CLERK:           ['properties', 'payments', 'demands', 'assessments'],
  INSPECTOR:       ['properties', 'assessments'],
  OFFICER:         ['properties', 'payments', 'demands'],
  ACCOUNT_OFFICER: ['payments', 'demands'],
  CITIZEN:         ['properties', 'payments', 'demands', 'notices'],
  ASSESSOR:        ['properties', 'assessments'],
  CASHIER:         ['payments'],
};

function buildWordConditions(words, fields) {
  return words.map((word) => {
    const wLike = `%${word}%`;
    return {
      [Op.or]: fields.map((f) => {
        if (typeof f === 'string') return { [f]: { [Op.iLike]: wLike } };
        return Sequelize.where(f, { [Op.iLike]: wLike });
      }),
    };
  });
}

export const globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ properties: [], citizens: [], workers: [], payments: [], demands: [], assessments: [], notices: [], staff: [] });
    }

    const term = q.trim();
    const words = term.split(/\s+/).filter((w) => w.length >= 1);
    if (words.length === 0) {
      return res.json({ properties: [], citizens: [], workers: [], payments: [], demands: [], assessments: [], notices: [], staff: [] });
    }

    const role = normalizeRole(req.user?.role);
    const modules = ROLE_MODULES[role] || [];
    if (modules.length === 0) {
      return res.json({ properties: [], citizens: [], workers: [], payments: [], demands: [], assessments: [], notices: [], staff: [] });
    }

    const ulbId = req.user?.dataValues?.ulb_id || req.user?.ulb_id || null;
    const wardIds = req.user?.dataValues?.ward_ids || req.user?.ward_ids || [];
    const userId = req.user?.id || req.user?.dataValues?.id;

    const empty = { properties: [], citizens: [], workers: [], payments: [], demands: [], assessments: [], notices: [], staff: [] };
    const results = { ...empty };
    const promises = [];

    if (modules.includes('properties')) {
      const searchFields = ['ownerName', 'ownerPhone', 'propertyNumber', 'uniqueCode', 'address'];
      const where = { [Op.and]: buildWordConditions(words, searchFields) };
      if (role === 'CITIZEN') where.ownerId = userId;
      else if (wardIds?.length > 0 && !['ADMIN', 'SBM'].includes(role)) where.wardId = { [Op.in]: wardIds };
      promises.push(
        Property.findAll({ where, limit: 5, attributes: ['id', 'propertyNumber', 'uniqueCode', 'ownerName', 'ownerPhone', 'address', 'wardId'], order: [['id', 'DESC']] })
          .then((rows) => { results.properties = rows.map((r) => r.toJSON()); })
          .catch((e) => { console.error('Global search properties error:', e.message); })
      );
    }

    if (modules.includes('citizens')) {
      const fullNameCol = fn('concat', col('firstName'), ' ', col('lastName'));
      const searchFields = ['firstName', 'lastName', 'email', 'phone', 'username', fullNameCol];
      const userWhere = { role: 'citizen', [Op.and]: buildWordConditions(words, searchFields) };
      promises.push(
        User.findAll({ where: userWhere, limit: 5, attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'username'], order: [['id', 'DESC']] })
          .then((rows) => { results.citizens = rows.map((r) => r.toJSON()); })
          .catch((e) => { console.error('Global search citizens error:', e.message); })
      );
    }

    if (modules.includes('workers')) {
      const searchFields = ['full_name', 'mobile', 'employee_code'];
      const workerWhere = { [Op.and]: buildWordConditions(words, searchFields) };
      if (ulbId && !['ADMIN', 'SBM'].includes(role)) workerWhere.ulb_id = ulbId;
      promises.push(
        Worker.findAll({ where: workerWhere, limit: 5, attributes: ['id', 'full_name', 'mobile', 'employee_code', 'worker_type', 'status'], order: [['created_at', 'DESC']] })
          .then((rows) => { results.workers = rows.map((r) => r.toJSON()); })
          .catch((e) => { console.error('Global search workers error:', e.message); })
      );
    }

    if (modules.includes('payments')) {
      const searchFields = ['paymentNumber', 'receiptNumber'];
      const payWhere = { [Op.and]: buildWordConditions(words, searchFields) };
      if (role === 'CITIZEN') {
        const ownedProps = await Property.findAll({ where: { ownerId: userId }, attributes: ['id'] });
        const propIds = ownedProps.map((p) => p.id);
        if (propIds.length > 0) payWhere.propertyId = { [Op.in]: propIds };
        else payWhere.id = -1;
      }
      promises.push(
        Payment.findAll({ where: payWhere, limit: 5, attributes: ['id', 'paymentNumber', 'receiptNumber', 'amount', 'paymentMode', 'status', 'paymentDate'], order: [['id', 'DESC']] })
          .then((rows) => { results.payments = rows.map((r) => r.toJSON()); })
          .catch((e) => { console.error('Global search payments error:', e.message); })
      );
    }

    if (modules.includes('demands')) {
      const searchFields = ['demandNumber'];
      const demandWhere = { [Op.and]: buildWordConditions(words, searchFields) };
      if (role === 'CITIZEN') {
        const ownedProps = await Property.findAll({ where: { ownerId: userId }, attributes: ['id'] });
        const propIds = ownedProps.map((p) => p.id);
        if (propIds.length > 0) demandWhere.propertyId = { [Op.in]: propIds };
        else demandWhere.id = -1;
      }
      promises.push(
        Demand.findAll({ where: demandWhere, limit: 5, attributes: ['id', 'demandNumber', 'totalAmount', 'status', 'financialYear', 'serviceType'], order: [['id', 'DESC']] })
          .then((rows) => { results.demands = rows.map((r) => r.toJSON()); })
          .catch((e) => { console.error('Global search demands error:', e.message); })
      );
    }

    if (modules.includes('assessments')) {
      const searchFields = ['assessmentNumber'];
      const aWhere = { [Op.and]: buildWordConditions(words, searchFields) };
      promises.push(
        Assessment.findAll({ where: aWhere, limit: 5, attributes: ['id', 'assessmentNumber', 'assessmentYear', 'annualTaxAmount', 'status'], order: [['id', 'DESC']] })
          .then((rows) => { results.assessments = rows.map((r) => r.toJSON()); })
          .catch((e) => { console.error('Global search assessments error:', e.message); })
      );
    }

    if (modules.includes('notices')) {
      const searchFields = ['noticeNumber'];
      const nWhere = { [Op.and]: buildWordConditions(words, searchFields) };
      if (role === 'CITIZEN') nWhere.ownerId = userId;
      promises.push(
        Notice.findAll({ where: nWhere, limit: 5, attributes: ['id', 'noticeNumber', 'noticeType', 'status', 'financialYear'], order: [['id', 'DESC']] })
          .then((rows) => { results.notices = rows.map((r) => r.toJSON()); })
          .catch((e) => { console.error('Global search notices error:', e.message); })
      );
    }

    if (modules.includes('staff')) {
      const fullNameCol = fn('concat', col('full_name'), ' ', col('employee_id'));
      const searchFields = ['full_name', 'email', 'phone_number', 'employee_id', fullNameCol];
      const sWhere = { [Op.and]: buildWordConditions(words, searchFields) };
      promises.push(
        AdminManagement.findAll({ where: sWhere, limit: 5, attributes: ['id', 'full_name', 'email', 'phone_number', 'employee_id', 'role', 'status'], order: [['id', 'DESC']] })
          .then((rows) => { results.staff = rows.map((r) => r.toJSON()); })
          .catch((e) => { console.error('Global search staff error:', e.message); })
      );
    }

    await Promise.all(promises);
    res.json(results);
  } catch (err) {
    console.error('Global search error:', err);
    res.status(500).json({ message: 'Search failed' });
  }
};
