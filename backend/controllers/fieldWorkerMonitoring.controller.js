import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { AdminManagement, Ward, Worker, WorkerAttendance, WorkerTask, WorkerPayroll, ULB } from '../models/index.js';

/**
 * Get list of EOs with summary stats for Field Worker Monitoring Dashboard
 * GET /api/field-worker-monitoring/eos?ulb_id=<uuid>
 */
export const getEoList = async (req, res) => {
  try {
    const { ulb_id } = req.query;
    
    // Build where clause with optional ULB filter
    const whereClause = { role: 'EO', status: 'active' };
    if (ulb_id) {
      whereClause.ulb_id = ulb_id;
    }
    
    const eos = await AdminManagement.findAll({
      where: whereClause,
      attributes: ['id', 'full_name', 'employee_id', 'assigned_ulb', 'ward_ids', 'ulb_id'],
      include: [
        {
          model: ULB,
          as: 'ulb',
          attributes: ['id', 'name', 'state', 'district'],
          required: false
        }
      ]
    });

    const wardIds = [...new Set(eos.flatMap(e => e.ward_ids || []))];
    const wards = await Ward.findAll({
      where: { id: wardIds },
      attributes: ['id', 'wardNumber', 'wardName']
    });
    const wardMap = Object.fromEntries(wards.map(w => [w.id, `${w.wardNumber} - ${w.wardName}`]));

    const today = new Date().toISOString().slice(0, 10);

    const result = await Promise.all(eos.map(async (eo) => {
      const eoId = eo.id;
      const supervisorIds = (await AdminManagement.findAll({
        where: { eo_id: eoId, role: 'SUPERVISOR' },
        attributes: ['id']
      })).map(s => s.id);

      const workerWhere = {
        status: 'ACTIVE',
        [Op.or]: [
          { eo_id: eoId },
          ...(supervisorIds.length ? [{ supervisor_id: { [Op.in]: supervisorIds } }] : [])
        ]
      };
      const workers = await Worker.findAll({
        where: workerWhere,
        attributes: ['id', 'worker_type']
      });
      const workerIds = workers.map(w => w.id);
      const totalWorkers = workers.length;

      let presentToday = 0;
      let geoViolationsToday = 0;
      if (workerIds.length > 0) {
        const [presentRows, geoRows] = await Promise.all([
          sequelize.query(
            'SELECT COUNT(DISTINCT worker_id) AS present_rows FROM worker_attendance WHERE worker_id IN (:ids) AND attendance_date = :today',
            { replacements: { ids: workerIds, today }, type: sequelize.QueryTypes.SELECT }
          ),
          WorkerAttendance.count({
            where: {
              worker_id: { [Op.in]: workerIds },
              attendance_date: today,
              geo_status: 'OUTSIDE_WARD'
            }
          })
        ]);
        presentToday = Number(presentRows[0]?.present_rows) || 0;
        geoViolationsToday = geoRows;
      }

      const presentTodayPct = totalWorkers > 0 ? Math.round((presentToday / totalWorkers) * 100) : 0;
      const wardNames = (eo.ward_ids || []).map(wid => wardMap[wid] || `Ward ${wid}`);

      return {
        id: eo.id,
        eo_name: eo.full_name,
        employee_id: eo.employee_id,
        ulb_id: eo.ulb_id || null,
        ulb_name: eo.ulb?.name || eo.assigned_ulb || '-',
        assigned_wards: wardNames,
        total_workers: totalWorkers,
        present_today: presentToday,
        present_today_pct: presentTodayPct,
        geo_violations: geoViolationsToday
      };
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('getEoList error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch EO list', error: error.message });
  }
};

/**
 * Get EO-specific dashboard analytics (with date range)
 * GET /api/field-worker-monitoring/eos/:eoId/dashboard?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
export const getEoDashboard = async (req, res) => {
  try {
    const { eoId } = req.params;
    const { ulb_id } = req.query; // Get ulb_id from query params
    const startDate = req.query.startDate || new Date().toISOString().slice(0, 10);
    const endDate = req.query.endDate || new Date().toISOString().slice(0, 10);

    const eo = await AdminManagement.findOne({
      where: { 
        id: eoId,
        role: 'EO' // Use uppercase role
      },
      attributes: ['id', 'full_name', 'employee_id', 'assigned_ulb', 'ulb_id'],
      include: [
        {
          model: ULB,
          as: 'ulb',
          attributes: ['id', 'name', 'state', 'district'],
          required: false
        }
      ]
    });
    if (!eo) {
      return res.status(404).json({ success: false, message: 'EO not found' });
    }

    // Validate ULB filter: if ulb_id is provided, ensure EO belongs to that ULB
    if (ulb_id && eo.ulb_id !== ulb_id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. EO does not belong to the specified ULB.' 
      });
    }

    const supervisorIds = (await AdminManagement.findAll({
      where: { eo_id: eoId, role: 'SUPERVISOR' },
      attributes: ['id']
    })).map(s => s.id);

    const workerWhere = {
      status: 'ACTIVE',
      [Op.or]: [
        { eo_id: eoId },
        ...(supervisorIds.length ? [{ supervisor_id: { [Op.in]: supervisorIds } }] : [])
      ]
    };
    const workers = await Worker.findAll({
      where: workerWhere,
      attributes: ['id', 'worker_type']
    });
    const workerIds = workers.map(w => w.id);
    const totalWorkers = workers.length;

    const contractualWorkers = workers.filter(w => w.worker_type === 'CONTRACTUAL');
    const contractualIds = contractualWorkers.map(w => w.id);

    const dateFilter = {
      attendance_date: {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      }
    };

    let presentToday = 0;
    let absentToday = 0;
    const today = new Date().toISOString().slice(0, 10);
    if (workerIds.length > 0) {
      const [presentRow] = await sequelize.query(
        'SELECT COUNT(DISTINCT worker_id) AS c FROM worker_attendance WHERE worker_id IN (:ids) AND attendance_date = :today',
        { replacements: { ids: workerIds, today }, type: sequelize.QueryTypes.SELECT }
      );
      presentToday = Number(presentRow?.c) || 0;
      absentToday = Math.max(0, totalWorkers - presentToday);
    }

    let tasksCompleted = 0;
    let geoViolations = 0;
    let contractorCompliancePct = 100;
    if (workerIds.length > 0) {
      tasksCompleted = await WorkerAttendance.count({
        where: {
          worker_id: { [Op.in]: workerIds },
          ...dateFilter
        }
      });
      geoViolations = await WorkerAttendance.count({
        where: {
          worker_id: { [Op.in]: workerIds },
          ...dateFilter,
          geo_status: 'OUTSIDE_WARD'
        }
      });

      if (contractualIds.length > 0) {
        const [presentInRange] = await sequelize.query(
          'SELECT COUNT(DISTINCT worker_id) AS c FROM worker_attendance WHERE worker_id IN (:ids) AND attendance_date >= :start AND attendance_date <= :end',
          { replacements: { ids: contractualIds, start: startDate, end: endDate }, type: sequelize.QueryTypes.SELECT }
        );
        const [violationsInRange] = await sequelize.query(
          'SELECT COUNT(DISTINCT worker_id) AS c FROM worker_attendance WHERE worker_id IN (:ids) AND attendance_date >= :start AND attendance_date <= :end AND geo_status = \'OUTSIDE_WARD\'',
          { replacements: { ids: contractualIds, start: startDate, end: endDate }, type: sequelize.QueryTypes.SELECT }
        );
        const presentCount = Number(presentInRange?.c) || 0;
        const violationCount = Number(violationsInRange?.c) || 0;
        const compliantContractual = Math.max(0, presentCount - violationCount);
        contractorCompliancePct = Math.round(Math.max(0, (compliantContractual / contractualIds.length) * 100));
      }
    }

    res.json({
      success: true,
      data: {
        eo: { 
          id: eo.id, 
          full_name: eo.full_name, 
          employee_id: eo.employee_id, 
          assigned_ulb: eo.assigned_ulb,
          ulb_id: eo.ulb_id,
          ulb_name: eo.ulb?.name || eo.assigned_ulb || null
        },
        date_range: { startDate, endDate },
        total_workers: totalWorkers,
        present_today: presentToday,
        absent_today: absentToday,
        tasks_completed: tasksCompleted,
        geo_violations: geoViolations,
        contractor_compliance_pct: contractorCompliancePct
      }
    });
  } catch (error) {
    console.error('getEoDashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch EO dashboard', error: error.message });
  }
};

/**
 * Get EO's own dashboard (filtered strictly by eo_id from token). EO role only.
 * GET /api/field-worker-monitoring/eo-dashboard
 */
export const getEoDashboardForSelf = async (req, res) => {
  try {
    const eoId = req.user.id;
    const eo = await AdminManagement.findByPk(eoId, {
      attributes: ['id', 'full_name', 'employee_id', 'assigned_ulb', 'ward_ids', 'role', 'ulb_id']
    });
    // Normalize role to uppercase for comparison
    const normalizedRole = eo?.role ? eo.role.toUpperCase().replace(/-/g, '_') : null;
    if (!eo || normalizedRole !== 'EO') {
      return res.status(403).json({ success: false, message: 'Access denied. EO role required.' });
    }

    // Ensure EO has ulb_id
    if (!eo.ulb_id) {
      return res.status(400).json({ success: false, message: 'EO must be assigned to an ULB' });
    }

    const supervisorIds = (await AdminManagement.findAll({
      where: { 
        eo_id: eoId, 
        ulb_id: eo.ulb_id,
        role: 'SUPERVISOR' 
      },
      attributes: ['id', 'full_name', 'employee_id', 'ward_id']
    })).map(s => s.id);
    const supervisorList = await AdminManagement.findAll({
      where: { 
        eo_id: eoId, 
        ulb_id: eo.ulb_id,
        role: 'SUPERVISOR' 
      },
      attributes: ['id', 'full_name', 'employee_id', 'ward_id']
    });

    // All queries must filter by eo_id and ulb_id
    // Get all workers assigned to this EO (directly or through supervisors)
    const workerWhere = {
      status: 'ACTIVE',
      ulb_id: eo.ulb_id,
      [Op.or]: [
        { eo_id: eoId },
        ...(supervisorIds.length > 0 ? [{ supervisor_id: { [Op.in]: supervisorIds } }] : [])
      ]
    };
    
    const allWorkers = await Worker.findAll({
      where: workerWhere,
      attributes: ['id', 'full_name', 'mobile', 'ward_id', 'supervisor_id', 'contractor_id', 'eo_id', 'employee_code']
    });
    const workerIds = allWorkers.map(w => w.id);
    const today = new Date().toISOString().slice(0, 10);

    // Get all unique ward IDs from workers assigned to this EO (not just EO's assigned wards)
    const workerWardIds = [...new Set(allWorkers.map(w => w.ward_id).filter(Boolean))];
    
    // Also include EO's assigned wards to show all relevant wards
    const eoWardIds = eo.ward_ids || [];
    const allWardIds = [...new Set([...workerWardIds, ...eoWardIds])];
    
    // Fetch all wards that have workers OR are assigned to EO
    // If no specific ward IDs, fetch all wards in the ULB (to show all possible wards)
    let wards = [];
    if (allWardIds.length > 0) {
      wards = await Ward.findAll({
        where: { 
          id: { [Op.in]: allWardIds },
          ulb_id: eo.ulb_id  // Ensure wards belong to same ULB
        },
        attributes: ['id', 'wardNumber', 'wardName']
      });
    } else {
      // If no workers yet, fetch all wards assigned to EO
      if (eoWardIds.length > 0) {
        wards = await Ward.findAll({
          where: { 
            id: { [Op.in]: eoWardIds },
            ulb_id: eo.ulb_id
          },
          attributes: ['id', 'wardNumber', 'wardName']
        });
      }
    }
    const wardMap = Object.fromEntries(wards.map(w => [w.id, { name: `${w.wardNumber} - ${w.wardName}` }]));

    // Get today's attendance (filtered by ulb_id)
    const [presentTodayIds] = workerIds.length
      ? await sequelize.query(
          'SELECT worker_id FROM worker_attendance WHERE worker_id IN (:ids) AND attendance_date = :today AND ulb_id = :ulbId',
          { replacements: { ids: workerIds, today, ulbId: eo.ulb_id }, type: sequelize.QueryTypes.SELECT }
        )
      : [[]];
    // Convert worker IDs to strings for consistent comparison (UUIDs vs integers)
    const presentSet = new Set((presentTodayIds || []).map(r => r.worker_id?.toString()));
    
    // Calculate summary metrics
    const totalWorkers = allWorkers.length;
    // Count workers that are actually present (match by ID string)
    const presentToday = allWorkers.filter(w => presentSet.has(w.id?.toString())).length;
    const absentToday = totalWorkers - presentToday;
    const attendancePct = totalWorkers > 0 ? Math.round((presentToday / totalWorkers) * 100) : 0;

    // Get geo violations count for today (filtered by ulb_id)
    const geoViolationsToday = workerIds.length > 0
      ? await WorkerAttendance.count({
          where: {
            worker_id: { [Op.in]: workerIds },
            attendance_date: today,
            ulb_id: eo.ulb_id,
            geo_status: 'OUTSIDE_WARD'
          }
        })
      : 0;

    const wardWiseAttendance = [];
    // Process all wards (including those with 0 workers)
    for (const ward of wards) {
      const wid = ward.id;
      const workersInWard = allWorkers.filter(w => w.ward_id === wid);
      const total = workersInWard.length;
      const present = workersInWard.filter(w => presentSet.has(w.id.toString())).length;
      
      // Get geo violations for this ward today
      const wardWorkerIds = workersInWard.map(w => w.id);
      const wardGeoViolations = wardWorkerIds.length > 0
        ? await WorkerAttendance.count({
            where: {
              worker_id: { [Op.in]: wardWorkerIds },
              attendance_date: today,
              ulb_id: eo.ulb_id,
              geo_status: 'OUTSIDE_WARD'
            }
          })
        : 0;
      
      wardWiseAttendance.push({
        ward_id: wid,
        ward_name: wardMap[wid]?.name || `Ward ${wid}`,
        total_workers: total,
        present_today: present,
        attendance_pct: total > 0 ? Math.round((present / total) * 100) : 0,
        geo_violations: wardGeoViolations
      });
    }
    
    // Also include wards that have workers but might not be in the wards list
    const workerWardsNotInList = allWorkers
      .map(w => w.ward_id)
      .filter(wid => wid && !wards.find(w => w.id === wid));
    
    if (workerWardsNotInList.length > 0) {
      const additionalWards = await Ward.findAll({
        where: {
          id: { [Op.in]: [...new Set(workerWardsNotInList)] },
          ulb_id: eo.ulb_id
        },
        attributes: ['id', 'wardNumber', 'wardName']
      });
      
      for (const ward of additionalWards) {
        const wid = ward.id;
        const workersInWard = allWorkers.filter(w => w.ward_id === wid);
        const total = workersInWard.length;
        const present = workersInWard.filter(w => presentSet.has(w.id.toString())).length;
        
        const wardWorkerIds = workersInWard.map(w => w.id);
        const wardGeoViolations = wardWorkerIds.length > 0
          ? await WorkerAttendance.count({
              where: {
                worker_id: { [Op.in]: wardWorkerIds },
                attendance_date: today,
                ulb_id: eo.ulb_id,
                geo_status: 'OUTSIDE_WARD'
              }
            })
          : 0;
        
        wardWiseAttendance.push({
          ward_id: wid,
          ward_name: `${ward.wardNumber} - ${ward.wardName}`,
          total_workers: total,
          present_today: present,
          attendance_pct: total > 0 ? Math.round((present / total) * 100) : 0,
          geo_violations: wardGeoViolations
        });
      }
    }

    // Supervisor Performance Panel (with tasks completed today)
    const supervisorReportingStatus = await Promise.all(
      supervisorList.map(async (sup) => {
        const workersUnder = allWorkers.filter(w => w.supervisor_id === sup.id);
        const workersUnderIds = workersUnder.map(w => w.id);
        const totalWorkersUnder = workersUnder.length;
        
        // Get attendance marked today (filtered by ulb_id)
        const marked = await WorkerAttendance.count({
          where: { 
            supervisor_id: sup.id, 
            attendance_date: today,
            ulb_id: eo.ulb_id
          }
        });
        
        // Calculate attendance % for this supervisor
        const presentWorkersUnder = workersUnder.filter(w => presentSet.has(w.id?.toString())).length;
        const supervisorAttendancePct = totalWorkersUnder > 0 
          ? Math.round((presentWorkersUnder / totalWorkersUnder) * 100) 
          : 0;
        
        // Get tasks completed today by workers under this supervisor
        const tasksCompletedToday = workersUnderIds.length > 0
          ? await WorkerTask.count({
              where: {
                worker_id: { [Op.in]: workersUnderIds },
                supervisor_id: sup.id,
                ulb_id: eo.ulb_id,
                status: 'COMPLETED',
                assigned_date: today
              }
            })
          : 0;
        
        return {
          supervisor_id: sup.id,
          full_name: sup.full_name,
          employee_id: sup.employee_id,
          ward_id: sup.ward_id,
          ward_name: sup.ward_id ? (wardMap[sup.ward_id]?.name || `Ward ${sup.ward_id}`) : null,
          workers_count: totalWorkersUnder,
          attendance_pct: supervisorAttendancePct,
          tasks_completed_today: tasksCompletedToday,
          marked_today: marked > 0,
          marks_count_today: marked
        };
      })
    );
    
    // Calculate supervisor reporting %
    const supervisorsWhoMarked = supervisorReportingStatus.filter(s => s.marked_today).length;
    const supervisorReportingPct = supervisorList.length > 0
      ? Math.round((supervisorsWhoMarked / supervisorList.length) * 100)
      : 0;

    // Absent Workers with Consecutive Absent Days
    const workersAbsentToday = await Promise.all(
      allWorkers
        .filter(w => !presentSet.has(w.id?.toString()))
        .map(async (w) => {
          // Calculate consecutive absent days
          let consecutiveAbsentDays = 0;
          if (w.id) {
            const last7Days = Array.from({ length: 7 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - i);
              return d.toISOString().slice(0, 10);
            }).reverse();
            
            for (let i = last7Days.length - 1; i >= 0; i--) {
              const checkDate = last7Days[i];
              const [attendance] = await sequelize.query(
                'SELECT COUNT(*) as count FROM worker_attendance WHERE worker_id = :workerId AND attendance_date = :date AND ulb_id = :ulbId',
                { replacements: { workerId: w.id, date: checkDate, ulbId: eo.ulb_id }, type: sequelize.QueryTypes.SELECT }
              );
              if (Number(attendance?.count) === 0) {
                consecutiveAbsentDays++;
              } else {
                break;
              }
            }
          }
          
          return {
            worker_id: w.id,
            full_name: w.full_name,
            mobile: w.mobile,
            ward_id: w.ward_id,
            ward_name: w.ward_id ? (wardMap[w.ward_id]?.name || `Ward ${w.ward_id}`) : null,
            supervisor_id: w.supervisor_id,
            supervisor_name: w.supervisor_id ? (supervisorList.find(s => s.id === w.supervisor_id)?.full_name || '') : null,
            consecutive_absent_days: consecutiveAbsentDays
          };
        })
    );

    // Geo Violation Alerts with Photo URLs
    let geoViolationAlerts = [];
    if (workerIds.length > 0) {
      const alerts = await WorkerAttendance.findAll({
        where: {
          worker_id: { [Op.in]: workerIds },
          attendance_date: today,
          ulb_id: eo.ulb_id,
          geo_status: 'OUTSIDE_WARD'
        },
        attributes: ['id', 'worker_id', 'ward_id', 'checkin_time', 'latitude', 'longitude', 'photo_url']
      });
      const workerIdToName = Object.fromEntries(allWorkers.map(w => [w.id, w.full_name]));
      geoViolationAlerts = alerts.map(a => ({
        id: a.id,
        worker_id: a.worker_id,
        worker_name: workerIdToName[a.worker_id] || '',
        ward_name: a.ward_id ? (wardMap[a.ward_id]?.name || `Ward ${a.ward_id}`) : null,
        checkin_time: a.checkin_time,
        location: a.latitude && a.longitude ? `${a.latitude.toFixed(6)}, ${a.longitude.toFixed(6)}` : null,
        latitude: a.latitude,
        longitude: a.longitude,
        photo_url: a.photo_url
      }));
    }

    // Monthly Attendance Trend (filtered by ulb_id)
    const monthlyTrend = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth();
      const start = new Date(year, month, 1).toISOString().slice(0, 10);
      const end = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const totalWorkerDays = allWorkers.length * daysInMonth;
      let presentDays = 0;
      if (workerIds.length > 0 && totalWorkerDays > 0) {
        const [row] = await sequelize.query(
          'SELECT COUNT(*) AS c FROM (SELECT DISTINCT worker_id, attendance_date FROM worker_attendance WHERE worker_id IN (:ids) AND attendance_date >= :start AND attendance_date <= :end AND ulb_id = :ulbId) t',
          { replacements: { ids: workerIds, start, end, ulbId: eo.ulb_id }, type: sequelize.QueryTypes.SELECT }
        );
        presentDays = Number(row?.c) || 0;
      }
      const attendance_pct = totalWorkerDays > 0 ? Math.round((presentDays / totalWorkerDays) * 100) : 0;
      monthlyTrend.push({
        month: `${year}-${String(month + 1).padStart(2, '0')}`,
        label: new Date(year, month).toLocaleString('default', { month: 'short', year: 'numeric' }),
        total_worker_days: totalWorkerDays,
        present_days: presentDays,
        attendance_pct
      });
    }

    // Get ULB name
    const ulb = await ULB.findByPk(eo.ulb_id, {
      attributes: ['id', 'name', 'state', 'district']
    });

    res.json({
      success: true,
      data: {
        eo: { 
          id: eo.id, 
          full_name: eo.full_name, 
          employee_id: eo.employee_id, 
          assigned_ulb: eo.assigned_ulb,
          ulb_id: eo.ulb_id,
          ulb_name: ulb?.name || eo.assigned_ulb || null
        },
        summary: {
          total_workers: totalWorkers,
          present_today: presentToday,
          absent_today: absentToday,
          attendance_pct: attendancePct,
          geo_violations_today: geoViolationsToday,
          supervisor_reporting_pct: supervisorReportingPct
        },
        ward_wise_attendance: wardWiseAttendance,
        supervisor_performance: supervisorReportingStatus,
        workers_absent_today: workersAbsentToday,
        geo_violation_alerts: geoViolationAlerts,
        monthly_attendance_trend: monthlyTrend
      }
    });
  } catch (error) {
    console.error('getEoDashboardForSelf error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch EO dashboard', error: error.message });
  }
};

/**
 * Get Payroll Preview for EO (filtered by eo_id and ulb_id)
 * GET /api/field-worker-monitoring/payroll-preview?month=1&year=2025
 */
export const getPayrollPreview = async (req, res) => {
  try {
    const eoId = req.user.id;
    const eo = await AdminManagement.findByPk(eoId, {
      attributes: ['id', 'ulb_id', 'role']
    });

    const normalizedRole = eo?.role ? eo.role.toUpperCase().replace(/-/g, '_') : null;
    if (!eo || normalizedRole !== 'EO' || !eo.ulb_id) {
      return res.status(403).json({ success: false, message: 'Access denied. EO role required with ULB assignment.' });
    }

    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    // Get all workers under this EO (filtered by ulb_id)
    const supervisorIds = (await AdminManagement.findAll({
      where: { eo_id: eoId, ulb_id: eo.ulb_id, role: 'SUPERVISOR' },
      attributes: ['id']
    })).map(s => s.id);

    const workers = await Worker.findAll({
      where: {
        ulb_id: eo.ulb_id,
        status: 'ACTIVE',
        [Op.or]: [
          { eo_id: eoId },
          ...(supervisorIds.length ? [{ supervisor_id: { [Op.in]: supervisorIds } }] : [])
        ]
      },
      attributes: ['id', 'full_name', 'contractor_id', 'ward_id']
    });
    
    // Get contractor names separately
    const contractorIds = [...new Set(workers.map(w => w.contractor_id).filter(Boolean))];
    const contractors = contractorIds.length > 0
      ? await AdminManagement.findAll({
          where: { id: { [Op.in]: contractorIds } },
          attributes: ['id', 'full_name']
        })
      : [];
    const contractorMap = Object.fromEntries(contractors.map(c => [c.id, c.full_name]));

    const workerIds = workers.map(w => w.id);

    // Get payroll records for this month/year
    const payrollRecords = await WorkerPayroll.findAll({
      where: {
        worker_id: { [Op.in]: workerIds },
        period_month: month,
        period_year: year
      }
    });
    
    // Create worker map for quick lookup
    const workerMap = Object.fromEntries(workers.map(w => [w.id, w]));

    // Group by contractor
    const contractorSummary = {};
    workers.forEach(worker => {
      const contractorId = worker.contractor_id || 'direct';
      const contractorName = worker.contractor_id ? (contractorMap[worker.contractor_id] || 'Unknown Contractor') : 'Direct ULB Workers';
      
      if (!contractorSummary[contractorId]) {
        contractorSummary[contractorId] = {
          contractor_id: contractorId,
          contractor_name: contractorName,
          workers: [],
          total_present_days: 0,
          total_payable: 0
        };
      }
      
      const payroll = payrollRecords.find(p => p.worker_id === worker.id);
      contractorSummary[contractorId].workers.push({
        worker_id: worker.id,
        worker_name: worker.full_name,
        present_days: payroll?.present_days || 0,
        payable_amount: payroll?.payable_amount || 0,
        eo_verification_status: payroll?.eo_verification_status || 'pending',
        admin_approval_status: payroll?.admin_approval_status || 'pending'
      });
      
      contractorSummary[contractorId].total_present_days += payroll?.present_days || 0;
      contractorSummary[contractorId].total_payable += Number(payroll?.payable_amount) || 0;
    });

    res.json({
      success: true,
      data: {
        period: { month, year },
        worker_wise: payrollRecords.map(p => ({
          worker_id: p.worker_id,
          worker_name: workerMap[p.worker_id]?.full_name || 'Unknown',
          present_days: p.present_days,
          payable_amount: p.payable_amount,
          eo_verification_status: p.eo_verification_status,
          admin_approval_status: p.admin_approval_status
        })),
        contractor_summary: Object.values(contractorSummary)
      }
    });
  } catch (error) {
    console.error('getPayrollPreview error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payroll preview', error: error.message });
  }
};

/**
 * Get Supervisor's own dashboard (filtered strictly by supervisor_id from token). SUPERVISOR role only.
 * GET /api/field-worker-monitoring/supervisor-dashboard
 */
export const getSupervisorDashboardForSelf = async (req, res) => {
  try {
    const supervisorId = req.user.id;
    const supervisor = await AdminManagement.findByPk(supervisorId, {
      attributes: ['id', 'full_name', 'employee_id', 'ward_id', 'ulb_id', 'role']
    });
    
    // Normalize role to uppercase for comparison
    const normalizedRole = supervisor?.role ? supervisor.role.toUpperCase().replace(/-/g, '_') : null;
    if (!supervisor || normalizedRole !== 'SUPERVISOR') {
      return res.status(403).json({ success: false, message: 'Access denied. SUPERVISOR role required.' });
    }

    // Ensure supervisor has ulb_id
    if (!supervisor.ulb_id) {
      return res.status(400).json({ success: false, message: 'Supervisor must be assigned to an ULB' });
    }

    // Get workers assigned to this supervisor (filtered by supervisor_id and ulb_id)
    const workers = await Worker.findAll({
      where: {
        supervisor_id: supervisorId,
        ulb_id: supervisor.ulb_id,
        status: 'ACTIVE'
      },
      attributes: ['id', 'full_name', 'mobile', 'ward_id', 'worker_type']
    });
    
    const workerIds = workers.map(w => w.id);
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const currentHour = now.getHours();

    // Get detailed today's attendance with all fields
    const attendanceRecords = workerIds.length > 0
      ? await WorkerAttendance.findAll({
          where: {
            worker_id: { [Op.in]: workerIds },
            attendance_date: today,
            supervisor_id: supervisorId,
            ulb_id: supervisor.ulb_id
          },
          attributes: ['id', 'worker_id', 'checkin_time', 'photo_url', 'geo_status', 'latitude', 'longitude'],
          order: [['checkin_time', 'DESC']]
        })
      : [];

    const attendanceMap = {};
    attendanceRecords.forEach(att => {
      const workerIdStr = att.worker_id?.toString();
      if (workerIdStr && !attendanceMap[workerIdStr]) {
        attendanceMap[workerIdStr] = att;
      }
    });

    const presentSet = new Set(Object.keys(attendanceMap));
    
    const presentWorkers = workers.filter(w => presentSet.has(w.id?.toString()));
    const absentWorkers = workers.filter(w => !presentSet.has(w.id?.toString()));

    // Get tasks completed today
    const tasksCompletedToday = workerIds.length > 0
      ? await WorkerTask.count({
          where: {
            worker_id: { [Op.in]: workerIds },
            supervisor_id: supervisorId,
            ulb_id: supervisor.ulb_id,
            status: 'COMPLETED',
            assigned_date: today
          }
        })
      : 0;

    // Get ward info if available
    let wardName = null;
    if (supervisor.ward_id) {
      const ward = await Ward.findByPk(supervisor.ward_id, {
        attributes: ['wardNumber', 'wardName']
      });
      if (ward) {
        wardName = `${ward.wardNumber} - ${ward.wardName}`;
      }
    }

    const attendancePct = workers.length > 0 
      ? Math.round((presentWorkers.length / workers.length) * 100) 
      : 0;

    // Build detailed worker attendance list
    const detailedWorkers = workers.map(w => {
      const workerIdStr = w.id?.toString();
      const attendance = attendanceMap[workerIdStr];
      let status = 'NOT_MARKED';
      if (attendance) {
        status = 'PRESENT';
      } else if (currentHour >= 9) {
        status = 'ABSENT';
      }

      return {
        id: w.id,
        full_name: w.full_name,
        mobile: w.mobile,
        ward_id: w.ward_id,
        worker_type: w.worker_type,
        is_present: !!attendance,
        status: status,
        checkin_time: attendance?.checkin_time || null,
        geo_status: attendance?.geo_status || null,
        photo_url: attendance?.photo_url || null
      };
    });

    // Alerts: Workers not marked by 9 AM
    const workersNotMarkedBy9AM = currentHour >= 9 
      ? workers.filter(w => !presentSet.has(w.id?.toString())).map(w => ({
          worker_id: w.id,
          worker_name: w.full_name,
          mobile: w.mobile
        }))
      : [];

    // Alerts: Repeat absentees (absent for 3+ consecutive days)
    const repeatAbsentees = [];
    if (workerIds.length > 0) {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().slice(0, 10);
      }).reverse();

      for (const worker of workers) {
        const [attendanceCount] = await sequelize.query(
          'SELECT COUNT(DISTINCT attendance_date) as count FROM worker_attendance WHERE worker_id = :workerId AND attendance_date IN (:dates)',
          { replacements: { workerId: worker.id, dates: last7Days }, type: sequelize.QueryTypes.SELECT }
        );
        const presentDays = Number(attendanceCount?.count) || 0;
        if (presentDays === 0 && last7Days.length >= 3) {
          repeatAbsentees.push({
            worker_id: worker.id,
            worker_name: worker.full_name,
            mobile: worker.mobile,
            absent_days: last7Days.length
          });
        }
      }
    }

    // Alerts: Geo violations today
    const geoViolations = attendanceRecords
      .filter(att => att.geo_status === 'OUTSIDE_WARD')
      .map(att => {
        const workerIdStr = att.worker_id?.toString();
        const worker = workers.find(w => w.id?.toString() === workerIdStr);
        return {
          worker_id: att.worker_id,
          worker_name: worker?.full_name || 'Unknown',
          checkin_time: att.checkin_time,
          geo_status: att.geo_status
        };
      });

    res.json({
      success: true,
      data: {
        supervisor: {
          id: supervisor.id,
          full_name: supervisor.full_name,
          employee_id: supervisor.employee_id,
          ward_id: supervisor.ward_id,
          ulb_id: supervisor.ulb_id,
          ward_name: wardName
        },
        total_workers: workers.length,
        present_today: presentWorkers.length,
        absent_today: absentWorkers.length,
        attendance_pct: attendancePct,
        tasks_completed_today: tasksCompletedToday,
        workers: detailedWorkers,
        alerts: {
          workers_not_marked_by_9am: workersNotMarkedBy9AM,
          repeat_absentees: repeatAbsentees,
          geo_violations: geoViolations
        }
      }
    });
  } catch (error) {
    console.error('getSupervisorDashboardForSelf error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch supervisor dashboard', error: error.message });
  }
};

/**
 * Admin Field Worker Monitoring Dashboard (full ULB level data with filters)
 * GET /api/field-worker-monitoring/admin-dashboard?ulb=&wardId=&eoId=&startDate=&endDate=
 */
export const getAdminFieldWorkerDashboard = async (req, res) => {
  try {
    const { ulb, ulb_id, wardId, eoId, startDate, endDate } = req.query;
    const today = new Date().toISOString().slice(0, 10);
    const dateStart = startDate || today;
    const dateEnd = endDate || today;

    const eoWhere = { role: 'EO', status: 'active' };
    // Support both ulb (name string) and ulb_id (UUID) filtering
    if (ulb_id) {
      eoWhere.ulb_id = ulb_id;
    } else if (ulb) {
      eoWhere.assigned_ulb = { [Op.iLike]: `%${ulb}%` };
    }
    if (eoId) eoWhere.id = parseInt(eoId, 10);

    const eos = await AdminManagement.findAll({
      where: eoWhere,
      attributes: ['id', 'full_name', 'employee_id', 'assigned_ulb', 'ward_ids']
    });
    const eoIds = eos.map(e => e.id);

    const allSupervisorIds = eoIds.length
      ? (await AdminManagement.findAll({
          where: { eo_id: { [Op.in]: eoIds }, role: 'SUPERVISOR' },
          attributes: ['id']
        })).map(s => s.id)
      : [];

    const workerWhere = {
      status: 'ACTIVE',
      [Op.or]: [
        ...(eoIds.length ? [{ eo_id: { [Op.in]: eoIds } }] : []),
        ...(allSupervisorIds.length ? [{ supervisor_id: { [Op.in]: allSupervisorIds } }] : [])
      ]
    };
    // Apply ULB filter to workers if ulb_id is provided
    if (ulb_id) {
      workerWhere.ulb_id = ulb_id;
    }
    if (wardId) workerWhere.ward_id = parseInt(wardId, 10);

    const allWorkers = await Worker.findAll({
      where: workerWhere,
      attributes: ['id', 'full_name', 'mobile', 'ward_id', 'supervisor_id', 'eo_id', 'worker_type', 'contractor_id']
    });
    const allWorkerIds = allWorkers.map(w => w.id);

    const dateFilter = {
      attendance_date: {
        [Op.gte]: dateStart,
        [Op.lte]: dateEnd
      }
    };

    const wards = await Ward.findAll({
      attributes: ['id', 'wardNumber', 'wardName']
    });
    const wardMap = Object.fromEntries(wards.map(w => [w.id, `${w.wardNumber} - ${w.wardName}`]));

    const ulbList = [...new Set(eos.map(e => e.assigned_ulb).filter(Boolean))];

    const attendanceWhere = {
      ...dateFilter,
      ...(allWorkerIds.length ? { worker_id: { [Op.in]: allWorkerIds } } : {})
    };

    const [presentTodayRows] = allWorkerIds.length
      ? await sequelize.query(
          'SELECT worker_id FROM worker_attendance WHERE worker_id IN (:ids) AND attendance_date = :today',
          { replacements: { ids: allWorkerIds, today }, type: sequelize.QueryTypes.SELECT }
        )
      : [[]];
    const presentTodaySet = new Set((presentTodayRows || []).map(r => r.worker_id));

    const attendanceRecords = allWorkerIds.length
      ? await WorkerAttendance.findAll({
          where: attendanceWhere,
          attributes: ['id', 'worker_id', 'ward_id', 'eo_id', 'supervisor_id', 'attendance_date', 'checkin_time', 'geo_status', 'latitude', 'longitude']
        })
      : [];

    const workerIdToName = Object.fromEntries(allWorkers.map(w => [w.id, w.full_name]));
    const eoIdToName = Object.fromEntries(eos.map(e => [e.id, e.full_name]));

    const ulbWiseData = await Promise.all(ulbList.map(async (ulbName) => {
      const eosInUlb = eos.filter(e => e.assigned_ulb === ulbName);
      const eoIdsInUlb = eosInUlb.map(e => e.id);
      const supervisorsInUlb = eoIdsInUlb.length
        ? await AdminManagement.findAll({
            where: { eo_id: { [Op.in]: eoIdsInUlb }, role: 'SUPERVISOR' },
            attributes: ['id']
          })
        : [];
      const supIdsInUlb = supervisorsInUlb.map(s => s.id);
      const workersInUlb = allWorkers.filter(w => 
        eoIdsInUlb.includes(w.eo_id) || supIdsInUlb.includes(w.supervisor_id)
      );
      const presentInUlb = workersInUlb.filter(w => presentTodaySet.has(w.id)).length;
      return {
        ulb: ulbName,
        total_workers: workersInUlb.length,
        present_today: presentInUlb,
        attendance_pct: workersInUlb.length > 0 ? Math.round((presentInUlb / workersInUlb.length) * 100) : 0
      };
    }));

    const attendanceSummary = {
      total_workers: allWorkers.length,
      present_today: presentTodaySet.size,
      absent_today: Math.max(0, allWorkers.length - presentTodaySet.size),
      total_attendance_records: attendanceRecords.length,
      ulb_wise: ulbWiseData,
      ward_wise: wards.map(ward => {
        const workersInWard = allWorkers.filter(w => w.ward_id === ward.id);
        const presentInWard = workersInWard.filter(w => presentTodaySet.has(w.id)).length;
        return {
          ward_id: ward.id,
          ward_name: wardMap[ward.id],
          total_workers: workersInWard.length,
          present_today: presentInWard,
          attendance_pct: workersInWard.length > 0 ? Math.round((presentInWard / workersInWard.length) * 100) : 0
        };
      }).filter(w => w.total_workers > 0)
    };

    const payrollPreview = allWorkers.map(w => {
      const records = attendanceRecords.filter(a => a.worker_id === w.id);
      const daysWorked = new Set(records.map(r => r.attendance_date)).size;
      return {
        worker_id: w.id,
        worker_name: w.full_name,
        mobile: w.mobile,
        worker_type: w.worker_type,
        ward_id: w.ward_id,
        ward_name: wardMap[w.ward_id] || null,
        eo_id: w.eo_id,
        eo_name: w.eo_id ? (eoIdToName[w.eo_id] || '') : null,
        days_worked: daysWorked,
        total_records: records.length
      };
    });

    const contractors = await AdminManagement.findAll({
      where: { role: 'CONTRACTOR', status: 'active' },
      attributes: ['id', 'full_name', 'employee_id', 'company_name', 'contact_details']
    });
    const contractorIdToName = Object.fromEntries(contractors.map(c => [c.id, c.full_name || c.company_name]));
    const contractorPerformance = contractors.map(contractor => {
      const workersUnderContractor = allWorkers.filter(w => w.contractor_id === contractor.id);
      const workerIdsUnderContractor = workersUnderContractor.map(w => w.id);
      const records = attendanceRecords.filter(a => workerIdsUnderContractor.includes(a.worker_id));
      const geoViolations = records.filter(r => r.geo_status === 'OUTSIDE_WARD').length;
      const daysWorked = new Set(records.map(r => r.attendance_date)).size;
      const totalDays = workerIdsUnderContractor.length * (new Date(dateEnd) - new Date(dateStart)) / (1000 * 60 * 60 * 24) + 1;
      return {
        contractor_id: contractor.id,
        contractor_name: contractor.full_name || contractor.company_name,
        company_name: contractor.company_name,
        workers_count: workersUnderContractor.length,
        days_worked: daysWorked,
        attendance_pct: totalDays > 0 ? Math.round((daysWorked / totalDays) * 100) : 0,
        geo_violations: geoViolations,
        compliance_pct: records.length > 0 ? Math.round(((records.length - geoViolations) / records.length) * 100) : 100
      };
    });

    const geoViolations = attendanceRecords
      .filter(a => a.geo_status === 'OUTSIDE_WARD')
      .map(a => ({
        id: a.id,
        worker_id: a.worker_id,
        worker_name: workerIdToName[a.worker_id] || '',
        ward_id: a.ward_id,
        ward_name: wardMap[a.ward_id] || null,
        eo_id: a.eo_id,
        eo_name: a.eo_id ? (eoIdToName[a.eo_id] || '') : null,
        attendance_date: a.attendance_date,
        checkin_time: a.checkin_time,
        latitude: a.latitude,
        longitude: a.longitude
      }));

    const auditLogs = attendanceRecords.map(a => ({
      id: a.id,
      worker_id: a.worker_id,
      worker_name: workerIdToName[a.worker_id] || '',
      ward_id: a.ward_id,
      ward_name: wardMap[a.ward_id] || null,
      supervisor_id: a.supervisor_id,
      eo_id: a.eo_id,
      eo_name: a.eo_id ? (eoIdToName[a.eo_id] || '') : null,
      attendance_date: a.attendance_date,
      checkin_time: a.checkin_time,
      geo_status: a.geo_status,
      latitude: a.latitude,
      longitude: a.longitude
    }));

    res.json({
      success: true,
      data: {
        filters: { ulb, wardId, eoId, startDate: dateStart, endDate: dateEnd },
        attendance_summary: attendanceSummary,
        payroll_preview: payrollPreview,
        contractor_performance: contractorPerformance,
        geo_violations: geoViolations,
        audit_logs: auditLogs
      }
    });
  } catch (error) {
    console.error('getAdminFieldWorkerDashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admin dashboard', error: error.message });
  }
};
