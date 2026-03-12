import {
  Worker,
  WorkerAttendance,
  ToiletFacility,
  MrfFacility,
  GauShalaFacility,
  ToiletComplaint,
  GauShalaComplaint
} from '../models/index.js';
import { Op } from 'sequelize';
import { getEffectiveUlbForRequest, getEffectiveWardIdsForRequest } from '../utils/ulbAccessHelper.js';

/**
 * @route   GET /api/sfi/dashboard
 * @desc    SFI dashboard stats for assigned wards only: workers, facilities, complaints, attendance summary
 * @access  Private (SFI only)
 */
export const getDashboard = async (req, res, next) => {
  try {
    const { isSuperAdmin, effectiveUlbId } = getEffectiveUlbForRequest(req);
    if (isSuperAdmin || !effectiveUlbId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. SFI must be assigned to an ULB to view dashboard.'
      });
    }

    const wardIds = await getEffectiveWardIdsForRequest(req);
    const allowedWardIds = Array.isArray(wardIds) && wardIds.length > 0 ? wardIds : [];
    const facilityWhere = allowedWardIds.length
      ? { wardId: { [Op.in]: allowedWardIds } }
      : { id: { [Op.in]: [] } };
    const mrfWhere = allowedWardIds.length
      ? { ward_id: { [Op.in]: allowedWardIds } }
      : { id: { [Op.in]: [] } };
    const gaushalaWhere = allowedWardIds.length
      ? { ward_id: { [Op.in]: allowedWardIds } }
      : { id: { [Op.in]: [] } };
    const workerWardWhere = allowedWardIds.length ? { ward_id: { [Op.in]: allowedWardIds } } : { ward_id: { [Op.in]: [] } };

    const today = new Date().toISOString().split('T')[0];

    const [
      workersTotal,
      workersPresentToday,
      toiletFacilitiesCount,
      mrfFacilitiesCount,
      gaushalaFacilitiesCount,
      toiletComplaintsPending,
      gaushalaComplaintsPending,
      attendanceTodayTotal,
      attendanceTodayGeoViolations
    ] = await Promise.all([
      Worker.count({ where: { ulb_id: effectiveUlbId, ...workerWardWhere } }),
      WorkerAttendance.count({
        where: {
          ulb_id: effectiveUlbId,
          attendance_date: today,
          checkin_time: { [Op.ne]: null },
          ...(allowedWardIds.length ? { ward_id: { [Op.in]: allowedWardIds } } : {})
        }
      }),
      ToiletFacility.count({ where: facilityWhere }),
      MrfFacility.count({ where: mrfWhere }),
      GauShalaFacility.count({ where: gaushalaWhere }),
      ToiletComplaint.count({
        where: { status: { [Op.in]: ['open', 'pending'] } },
        include: [{ model: ToiletFacility, as: 'facility', required: true, where: facilityWhere }]
      }).catch(() => 0),
      GauShalaComplaint.count({
        where: { status: { [Op.in]: ['pending', 'in_progress'] } },
        include: [{ model: GauShalaFacility, as: 'facility', required: true, where: gaushalaWhere }]
      }).catch(() => 0),
      WorkerAttendance.count({
        where: {
          ulb_id: effectiveUlbId,
          attendance_date: today,
          ...(allowedWardIds.length ? { ward_id: { [Op.in]: allowedWardIds } } : {})
        }
      }),
      WorkerAttendance.count({
        where: {
          ulb_id: effectiveUlbId,
          attendance_date: today,
          geo_status: 'OUTSIDE_WARD',
          ...(allowedWardIds.length ? { ward_id: { [Op.in]: allowedWardIds } } : {})
        }
      })
    ]);

    const presencePercent = workersTotal > 0
      ? Math.round((workersPresentToday / workersTotal) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        workers: {
          total: workersTotal,
          presentToday: workersPresentToday,
          presencePercent
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
        attendance: {
          todayTotal: attendanceTodayTotal,
          todayGeoViolations: attendanceTodayGeoViolations,
          presencePercent
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
