import {
  Property,
  Demand,
  Payment,
  ULB,
  Worker,
  WorkerAttendance,
  ToiletFacility,
  MrfFacility,
  GauShalaFacility,
  ToiletComplaint,
  GauShalaComplaint,
  WaterConnection,
  WaterBill,
  AdminManagement,
  CollectorAttendance,
  Shop,
  WaterConnectionRequest
} from '../models/index.js';
import { Op } from 'sequelize';

/**
 * @route   GET /api/sbm/dashboard
 * @desc    SBM global monitoring dashboard: aggregate stats across all ULBs (read-only view)
 * @access  Private (SBM only)
 */
export const getDashboard = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [
      ulbsTotal,
      propertiesTotal,
      demandsTotal,
      paymentsTotal,
      workersTotal,
      workersPresentToday,
      toiletFacilitiesCount,
      mrfFacilitiesCount,
      gaushalaFacilitiesCount,
      toiletComplaintsPending,
      gaushalaComplaintsPending,
      waterConnectionsTotal,
      waterBillsUnpaid,
      staffTotal,
      staffPresentToday,
      shopsTotal,
      waterRequestsPending
    ] = await Promise.all([
      ULB.count({ where: { status: 'ACTIVE' } }),
      Property.count(),
      Demand.count(),
      Payment.count(),
      Worker.count(),
      WorkerAttendance.count({
        where: {
          attendance_date: today,
          checkin_time: { [Op.ne]: null }
        }
      }),
      ToiletFacility.count(),
      MrfFacility.count(),
      GauShalaFacility.count(),
      ToiletComplaint.count({
        where: { status: { [Op.in]: ['open', 'pending'] } }
      }).catch(() => 0),
      GauShalaComplaint.count({
        where: { status: { [Op.in]: ['pending', 'in_progress'] } }
      }).catch(() => 0),
      WaterConnection.count(),
      WaterBill.count({
        where: { status: { [Op.in]: ['pending', 'partially_paid', 'overdue'] } }
      }).catch(() => 0),
      AdminManagement.count({
        where: { status: 'active', role: { [Op.notIn]: ['SBM'] } }
      }),
      CollectorAttendance.count({
        where: {
          loginAt: { [Op.ne]: null },
          logoutAt: null
        }
      }).catch(() => 0),
      Shop.count(),
      WaterConnectionRequest.count({
        where: { status: { [Op.in]: ['DRAFT', 'SUBMITTED', 'UNDER_INSPECTION', 'ESCALATED_TO_OFFICER', 'RETURNED'] } }
      }).catch(() => 0)
    ]);

    const presencePercent = workersTotal > 0
      ? Math.round((workersPresentToday / workersTotal) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        ulbs: { total: ulbsTotal },
        propertyTax: {
          properties: propertiesTotal,
          demands: demandsTotal,
          payments: paymentsTotal
        },
        workers: {
          total: workersTotal,
          presentToday: workersPresentToday,
          presencePercent
        },
        staff: {
          total: staffTotal,
          presentToday: staffPresentToday
        },
        facilities: {
          toilet: toiletFacilitiesCount,
          mrf: mrfFacilitiesCount,
          gaushala: gaushalaFacilitiesCount
        },
        complaints: {
          toiletPending: toiletComplaintsPending,
          gaushalaPending: gaushalaComplaintsPending
        },
        water: {
          connections: waterConnectionsTotal,
          billsUnpaid: waterBillsUnpaid,
          requestsPending: waterRequestsPending
        },
        shops: { total: shopsTotal }
      }
    });
  } catch (error) {
    next(error);
  }
};
