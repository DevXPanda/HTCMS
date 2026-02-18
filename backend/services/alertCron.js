import cron from 'node-cron';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Alert, Worker, WorkerAttendance, AdminManagement, Ward } from '../models/index.js';

const GEO_VIOLATIONS_THRESHOLD = Number(process.env.ALERT_GEO_VIOLATIONS_THRESHOLD) || 3;
const ALERT_CHECK_AFTER_HOUR = 9; // Only run "not present by 9 AM" and "supervisor inactive" after this hour (server time)

let cronJob = null;
let lastRunAt = null;

/**
 * Optional SMS integration placeholder.
 * Integrate with your SMS provider (Twilio, MSG91, etc.) and return true when sent.
 */
export const sendAlertSms = async (alert) => {
  // TODO: Integrate SMS provider
  // Example: await smsClient.send({ to: alert.metadata?.mobile, body: alert.message });
  return Promise.resolve(false);
};

/**
 * Avoid creating duplicate alert for same type + entity on the same day.
 */
const hasExistingAlertToday = async (alertType, entityType, entityId) => {
  const today = new Date().toISOString().slice(0, 10);
  const count = await Alert.count({
    where: {
      alert_type: alertType,
      entity_type: entityType,
      entity_id: String(entityId),
      created_at: { [Op.gte]: `${today}T00:00:00.000Z` }
    }
  });
  return count > 0;
};

/**
 * 1. Workers not marked present by 9 AM (run only after 9 AM)
 */
const checkWorkersNotPresentBy9AM = async () => {
  const now = new Date();
  if (now.getHours() < ALERT_CHECK_AFTER_HOUR) return [];

  const today = now.toISOString().slice(0, 10);
  const workers = await Worker.findAll({
    where: { status: 'ACTIVE' },
    attributes: ['id', 'full_name', 'eo_id', 'ward_id', 'mobile']
  });
  if (workers.length === 0) return [];

  const [presentTodayRows] = await sequelize.query(
    'SELECT worker_id FROM worker_attendance WHERE attendance_date = :today',
    { replacements: { today }, type: sequelize.QueryTypes.SELECT }
  );
  const presentSet = new Set((presentTodayRows || []).map(r => r.worker_id));

  const created = [];
  for (const w of workers) {
    if (presentSet.has(w.id)) continue;
    if (await hasExistingAlertToday('worker_not_present_by_9am', 'worker', w.id)) continue;

    const alert = await Alert.create({
      alert_type: 'worker_not_present_by_9am',
      severity: 'warning',
      entity_type: 'worker',
      entity_id: w.id,
      eo_id: w.eo_id,
      ward_id: w.ward_id,
      title: 'Worker not marked present by 9 AM',
      message: `${w.full_name} has not been marked present today by 9 AM.`,
      metadata: { worker_id: w.id, worker_name: w.full_name, mobile: w.mobile, date: today }
    });
    const sent = await sendAlertSms(alert);
    if (sent) {
      await alert.update({ sms_sent: true, sms_sent_at: new Date() });
    }
    created.push(alert);
  }
  return created;
};

/**
 * 2. Supervisors inactive (no attendance marked today by 9 AM)
 */
const checkSupervisorsInactive = async () => {
  const now = new Date();
  if (now.getHours() < ALERT_CHECK_AFTER_HOUR) return [];

  const today = now.toISOString().slice(0, 10);
  const supervisors = await AdminManagement.findAll({
    where: { role: 'SUPERVISOR', status: 'active' },
    attributes: ['id', 'full_name', 'eo_id', 'ward_id']
  });
  if (supervisors.length === 0) return [];

  const [markedToday] = await sequelize.query(
    'SELECT supervisor_id FROM worker_attendance WHERE attendance_date = :today',
    { replacements: { today }, type: sequelize.QueryTypes.SELECT }
  );
  const markedSet = new Set((markedToday || []).map(r => r.supervisor_id).filter(Boolean));

  const created = [];
  for (const sup of supervisors) {
    if (markedSet.has(sup.id)) continue;
    const workerCount = await Worker.count({ where: { supervisor_id: sup.id, status: 'ACTIVE' } });
    if (workerCount === 0) continue;
    if (await hasExistingAlertToday('supervisor_inactive', 'supervisor', sup.id)) continue;

    const alert = await Alert.create({
      alert_type: 'supervisor_inactive',
      severity: 'warning',
      entity_type: 'supervisor',
      entity_id: String(sup.id),
      eo_id: sup.eo_id,
      ward_id: sup.ward_id,
      title: 'Supervisor inactive today',
      message: `Supervisor ${sup.full_name} has not marked any worker attendance today by 9 AM (${workerCount} worker(s) under supervision).`,
      metadata: { supervisor_id: sup.id, supervisor_name: sup.full_name, workers_count: workerCount, date: today }
    });
    const sent = await sendAlertSms(alert);
    if (sent) await alert.update({ sms_sent: true, sms_sent_at: new Date() });
    created.push(alert);
  }
  return created;
};

/**
 * 3. Geo violations above threshold (per worker, last 7 days)
 */
const checkGeoViolationsThreshold = async () => {
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const start = sevenDaysAgo.toISOString().slice(0, 10);

  const [rows] = await sequelize.query(
    `SELECT worker_id, COUNT(*) AS cnt FROM worker_attendance
     WHERE attendance_date >= :start AND attendance_date <= :today AND geo_status = 'OUTSIDE_WARD'
     GROUP BY worker_id HAVING COUNT(*) > :threshold`,
    {
      replacements: { start, today, threshold: GEO_VIOLATIONS_THRESHOLD },
      type: sequelize.QueryTypes.SELECT
    }
  );
  if (!rows || rows.length === 0) return [];

  const workers = await Worker.findAll({
    where: { id: rows.map(r => r.worker_id) },
    attributes: ['id', 'full_name', 'eo_id', 'ward_id']
  });
  const workerMap = Object.fromEntries(workers.map(w => [w.id, w]));

  const created = [];
  for (const row of rows) {
    const workerId = row.worker_id;
    const count = Number(row.cnt);
    if (await hasExistingAlertToday('geo_violations_threshold', 'worker', workerId)) continue;

    const w = workerMap[workerId];
    const alert = await Alert.create({
      alert_type: 'geo_violations_threshold',
      severity: 'critical',
      entity_type: 'worker',
      entity_id: workerId,
      eo_id: w?.eo_id,
      ward_id: w?.ward_id,
      title: 'Geo violations above threshold',
      message: `${w?.full_name || workerId} has ${count} geo violations in the last 7 days (threshold: ${GEO_VIOLATIONS_THRESHOLD}).`,
      metadata: { worker_id: workerId, count, threshold: GEO_VIOLATIONS_THRESHOLD, start, end: today }
    });
    const sent = await sendAlertSms(alert);
    if (sent) await alert.update({ sms_sent: true, sms_sent_at: new Date() });
    created.push(alert);
  }
  return created;
};

/**
 * 4. Three consecutive absences (no attendance on last 3 calendar days)
 */
const checkThreeConsecutiveAbsences = async () => {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const day2 = new Date(today);
  day2.setDate(day2.getDate() - 1);
  const day2Str = day2.toISOString().slice(0, 10);
  const day3 = new Date(today);
  day3.setDate(day3.getDate() - 2);
  const day3Str = day3.toISOString().slice(0, 10);

  const workers = await Worker.findAll({
    where: { status: 'ACTIVE' },
    attributes: ['id', 'full_name', 'eo_id', 'ward_id']
  });
  if (workers.length === 0) return [];

  const workerIds = workers.map(w => w.id);
  const [presentIn3Days] = await sequelize.query(
    `SELECT DISTINCT worker_id FROM worker_attendance
     WHERE worker_id IN (:workerIds) AND attendance_date IN (:d1, :d2, :d3)`,
    {
      replacements: { workerIds, d1: todayStr, d2: day2Str, d3: day3Str },
      type: sequelize.QueryTypes.SELECT
    }
  );
  const presentSet = new Set((presentIn3Days || []).map(r => r.worker_id));
  const absent3 = workers.filter(w => !presentSet.has(w.id));

  const created = [];
  for (const w of absent3) {
    if (await hasExistingAlertToday('three_consecutive_absences', 'worker', w.id)) continue;

    const alert = await Alert.create({
      alert_type: 'three_consecutive_absences',
      severity: 'critical',
      entity_type: 'worker',
      entity_id: w.id,
      eo_id: w.eo_id,
      ward_id: w.ward_id,
      title: '3 consecutive days absent',
      message: `${w.full_name} has no attendance recorded for the last 3 consecutive days (${day3Str} to ${todayStr}).`,
      metadata: { worker_id: w.id, worker_name: w.full_name, absent_dates: [day3Str, day2Str, todayStr] }
    });
    const sent = await sendAlertSms(alert);
    if (sent) await alert.update({ sms_sent: true, sms_sent_at: new Date() });
    created.push(alert);
  }
  return created;
};

/**
 * Run all alert checks and store in alerts table.
 */
export const runAlertChecks = async () => {
  const start = new Date();
  lastRunAt = start;
  const results = {
    worker_not_present: 0,
    supervisor_inactive: 0,
    geo_violations: 0,
    three_consecutive_absences: 0,
    errors: []
  };

  try {
    const [a, b, c, d] = await Promise.all([
      checkWorkersNotPresentBy9AM(),
      checkSupervisorsInactive(),
      checkGeoViolationsThreshold(),
      checkThreeConsecutiveAbsences()
    ]);
    results.worker_not_present = a.length;
    results.supervisor_inactive = b.length;
    results.geo_violations = c.length;
    results.three_consecutive_absences = d.length;
  } catch (err) {
    results.errors.push(err.message);
    console.error('[ALERT_CRON] Error:', err);
  }

  return results;
};

/**
 * Start cron: every 30 minutes.
 */
export const startAlertCronJob = () => {
  if (cronJob) {
    console.log('[ALERT_CRON] Already running');
    return;
  }
  cronJob = cron.schedule('*/30 * * * *', async () => {
    console.log('[ALERT_CRON] Running alert checks...');
    const results = await runAlertChecks();
    console.log('[ALERT_CRON] Done:', results);
  }, { scheduled: true, timezone: 'Asia/Kolkata' });
  console.log('[ALERT_CRON] Scheduled every 30 minutes (Asia/Kolkata)');
};

export const stopAlertCronJob = () => {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log('[ALERT_CRON] Stopped');
  }
};

export const getLastRunAt = () => lastRunAt;
