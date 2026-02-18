import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Worker, WorkerAttendance, WorkerPayroll, AdminManagement, Ward } from '../models/index.js';

const DEFAULT_DAILY_RATE = Number(process.env.PAYROLL_DEFAULT_DAILY_RATE) || 0;

/**
 * Generate payroll for a given month.
 * ULB workers: count present days per worker.
 * Contract workers: same count, grouped by contractor_id in response.
 * POST /api/payroll/generate
 * Body: { month, year }
 */
export const generatePayroll = async (req, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'month and year are required' });
    }
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (m < 1 || m > 12 || y < 2000 || y > 2100) {
      return res.status(400).json({ success: false, message: 'Invalid month or year' });
    }

    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const workers = await Worker.findAll({
      where: { status: 'ACTIVE' },
      attributes: ['id', 'full_name', 'worker_type', 'contractor_id', 'eo_id', 'ward_id', 'daily_rate']
    });

    const workerIds = workers.map(w => w.id);
    if (workerIds.length === 0) {
      return res.json({
        success: true,
        data: {
          period: { month: m, year: y },
          summary: [],
          by_contractor: [],
          message: 'No active workers'
        }
      });
    }

    const [presentDaysRows] = await sequelize.query(
      `SELECT worker_id, COUNT(DISTINCT attendance_date) AS present_days
       FROM worker_attendance
       WHERE worker_id IN (:workerIds)
         AND attendance_date >= :startDate
         AND attendance_date <= :endDate
       GROUP BY worker_id`,
      {
        replacements: { workerIds, startDate, endDate },
        type: sequelize.QueryTypes.SELECT
      }
    );

    const presentDaysMap = {};
    (presentDaysRows || []).forEach(row => {
      presentDaysMap[row.worker_id] = Number(row.present_days) || 0;
    });

    const summary = [];
    const byContractor = {};

    for (const worker of workers) {
      const present_days = presentDaysMap[worker.id] || 0;
      const dailyRate = worker.daily_rate != null ? Number(worker.daily_rate) : DEFAULT_DAILY_RATE;
      const payable_amount = Math.round((present_days * dailyRate) * 100) / 100;

      let payrollRow = await WorkerPayroll.findOne({
        where: { worker_id: worker.id, period_month: m, period_year: y }
      });
      if (payrollRow) {
        payrollRow.present_days = present_days;
        payrollRow.payable_amount = payable_amount;
        payrollRow.daily_rate_used = dailyRate;
        await payrollRow.save();
      } else {
        payrollRow = await WorkerPayroll.create({
          worker_id: worker.id,
          period_month: m,
          period_year: y,
          present_days,
          payable_amount,
          daily_rate_used: dailyRate,
          eo_verification_status: 'pending',
          admin_approval_status: 'pending'
        });
      }

      summary.push({
        worker_id: worker.id,
        worker_name: worker.full_name,
        worker_type: worker.worker_type,
        contractor_id: worker.contractor_id,
        eo_id: worker.eo_id,
        ward_id: worker.ward_id,
        present_days,
        payable_amount,
        daily_rate_used: dailyRate,
        eo_verification_status: payrollRow?.eo_verification_status ?? 'pending',
        admin_approval_status: payrollRow?.admin_approval_status ?? 'pending',
        payroll_id: payrollRow?.id
      });

      if (worker.worker_type === 'CONTRACTUAL' && worker.contractor_id) {
        if (!byContractor[worker.contractor_id]) {
          byContractor[worker.contractor_id] = { contractor_id: worker.contractor_id, workers: [], total_payable: 0 };
        }
        byContractor[worker.contractor_id].workers.push({
          worker_id: worker.id,
          worker_name: worker.full_name,
          present_days,
          payable_amount
        });
        byContractor[worker.contractor_id].total_payable =
          (byContractor[worker.contractor_id].total_payable || 0) + payable_amount;
      }
    }

    const by_contractor = Object.values(byContractor);

    return res.json({
      success: true,
      data: {
        period: { month: m, year: y, startDate, endDate },
        summary,
        by_contractor,
        message: `Payroll generated for ${m}/${y}`
      }
    });
  } catch (error) {
    console.error('generatePayroll error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate payroll', error: error.message });
  }
};

/**
 * Get payroll summary (list).
 * GET /api/payroll?month=&year=&workerId=&contractorId=
 */
export const getPayroll = async (req, res) => {
  try {
    const { month, year, workerId, contractorId } = req.query;

    const where = {};
    if (month) where.period_month = parseInt(month, 10);
    if (year) where.period_year = parseInt(year, 10);
    if (workerId) where.worker_id = workerId;

    const payrollList = await WorkerPayroll.findAll({
      where: Object.keys(where).length ? where : undefined,
      include: [
        { model: Worker, as: 'worker', attributes: ['id', 'full_name', 'mobile', 'worker_type', 'contractor_id', 'eo_id', 'ward_id'] }
      ],
      order: [['period_year', 'DESC'], ['period_month', 'DESC'], ['worker_id']]
    });

    let items = payrollList.map(p => ({
      payroll_id: p.id,
      worker_id: p.worker_id,
      worker_name: p.worker?.full_name,
      worker_type: p.worker?.worker_type,
      contractor_id: p.worker?.contractor_id,
      eo_id: p.worker?.eo_id,
      ward_id: p.worker?.ward_id,
      period_month: p.period_month,
      period_year: p.period_year,
      present_days: p.present_days,
      payable_amount: Number(p.payable_amount),
      daily_rate_used: p.daily_rate_used != null ? Number(p.daily_rate_used) : null,
      eo_verification_status: p.eo_verification_status,
      eo_verified_at: p.eo_verified_at,
      eo_verified_by: p.eo_verified_by,
      admin_approval_status: p.admin_approval_status,
      admin_approved_at: p.admin_approved_at,
      admin_approved_by: p.admin_approved_by
    }));

    if (contractorId) {
      const cId = parseInt(contractorId, 10);
      items = items.filter(i => i.contractor_id === cId);
    }

    const by_contractor = {};
    items.forEach(i => {
      if (i.worker_type === 'CONTRACTUAL' && i.contractor_id) {
        if (!by_contractor[i.contractor_id]) by_contractor[i.contractor_id] = { contractor_id: i.contractor_id, workers: [], total_payable: 0 };
        by_contractor[i.contractor_id].workers.push({
          worker_id: i.worker_id,
          worker_name: i.worker_name,
          present_days: i.present_days,
          payable_amount: i.payable_amount,
          eo_verification_status: i.eo_verification_status,
          admin_approval_status: i.admin_approval_status
        });
        by_contractor[i.contractor_id].total_payable += i.payable_amount;
      }
    });

    return res.json({
      success: true,
      data: {
        summary: items,
        by_contractor: Object.values(by_contractor)
      }
    });
  } catch (error) {
    console.error('getPayroll error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch payroll', error: error.message });
  }
};

/**
 * EO verification: set payroll item to verified/rejected.
 * PATCH /api/payroll/:id/verify
 * Body: { status: 'verified' | 'rejected' }
 */
export const verifyPayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be verified or rejected' });
    }

    const user = req.user;
    if (req.userType !== 'admin_management' || user.role !== 'eo') {
      return res.status(403).json({ success: false, message: 'EO role required to verify payroll' });
    }

    const payroll = await WorkerPayroll.findByPk(id, { include: [{ model: Worker, as: 'worker' }] });
    if (!payroll) return res.status(404).json({ success: false, message: 'Payroll record not found' });

    if (payroll.worker?.eo_id !== user.id) {
      return res.status(403).json({ success: false, message: 'You can only verify payroll for workers under your EO' });
    }

    payroll.eo_verification_status = status;
    payroll.eo_verified_at = new Date();
    payroll.eo_verified_by = user.id;
    await payroll.save();

    return res.json({
      success: true,
      data: {
        payroll_id: payroll.id,
        worker_id: payroll.worker_id,
        eo_verification_status: payroll.eo_verification_status,
        eo_verified_at: payroll.eo_verified_at,
        eo_verified_by: payroll.eo_verified_by
      }
    });
  } catch (error) {
    console.error('verifyPayroll error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify payroll', error: error.message });
  }
};

/**
 * Admin final approval: set payroll item to approved/rejected.
 * PATCH /api/payroll/:id/approve
 * Body: { status: 'approved' | 'rejected' }
 */
export const approvePayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be approved or rejected' });
    }

    const payroll = await WorkerPayroll.findByPk(id);
    if (!payroll) return res.status(404).json({ success: false, message: 'Payroll record not found' });

    payroll.admin_approval_status = status;
    payroll.admin_approved_at = new Date();
    payroll.admin_approved_by = req.user?.id ?? null;
    await payroll.save();

    return res.json({
      success: true,
      data: {
        payroll_id: payroll.id,
        worker_id: payroll.worker_id,
        admin_approval_status: payroll.admin_approval_status,
        admin_approved_at: payroll.admin_approved_at,
        admin_approved_by: payroll.admin_approved_by
      }
    });
  } catch (error) {
    console.error('approvePayroll error:', error);
    return res.status(500).json({ success: false, message: 'Failed to approve payroll', error: error.message });
  }
};
