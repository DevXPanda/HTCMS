import { Op } from 'sequelize';
import { Alert, Ward, AdminManagement } from '../models/index.js';
import { runAlertChecks, getLastRunAt } from '../services/alertCron.js';

/**
 * Get alerts for EO (filtered by eo_id from token) or Admin (all).
 * GET /api/alerts?limit=&offset=&acknowledged=&alert_type=&severity=
 */
export const getAlerts = async (req, res) => {
  try {
    const { limit = 50, offset = 0, acknowledged, alert_type, severity } = req.query;
    const user = req.user;
    const isEo = req.userType === 'admin_management' && user?.role === 'eo';

    const where = {};
    if (isEo) {
      where.eo_id = user.id;
    }
    if (acknowledged !== undefined) {
      where.acknowledged = acknowledged === 'true' || acknowledged === '1';
    }
    if (alert_type) where.alert_type = alert_type;
    if (severity) where.severity = severity;

    const { rows, count } = await Alert.findAndCountAll({
      where,
      include: [
        { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'], required: false }
      ],
      order: [['created_at', 'DESC']],
      limit: Math.min(parseInt(limit, 10) || 50, 100),
      offset: Math.max(0, parseInt(offset, 10))
    });

    const data = rows.map(a => ({
      id: a.id,
      alert_type: a.alert_type,
      severity: a.severity,
      entity_type: a.entity_type,
      entity_id: a.entity_id,
      eo_id: a.eo_id,
      ward_id: a.ward_id,
      ward: a.ward ? { id: a.ward.id, wardNumber: a.ward.wardNumber, wardName: a.ward.wardName } : null,
      title: a.title,
      message: a.message,
      metadata: a.metadata,
      sms_sent: a.sms_sent,
      sms_sent_at: a.sms_sent_at,
      acknowledged: a.acknowledged,
      acknowledged_at: a.acknowledged_at,
      acknowledged_by: a.acknowledged_by,
      created_at: a.created_at
    }));

    return res.json({
      success: true,
      data: {
        alerts: data,
        total: count,
        limit: parseInt(limit, 10) || 50,
        offset: parseInt(offset, 10) || 0
      }
    });
  } catch (error) {
    console.error('getAlerts error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch alerts', error: error.message });
  }
};

/**
 * Get alert summary/counts for EO or Admin.
 * GET /api/alerts/stats
 */
export const getAlertStats = async (req, res) => {
  try {
    const user = req.user;
    const isEo = req.userType === 'admin_management' && user?.role === 'eo';

    const where = isEo ? { eo_id: user.id } : {};

    const [total, unacknowledged, byType, bySeverity] = await Promise.all([
      Alert.count({ where }),
      Alert.count({ where: { ...where, acknowledged: false } }),
      Alert.findAll({
        attributes: ['alert_type'],
        where,
        raw: true
      }).then(rows => {
        const map = {};
        rows.forEach(r => { map[r.alert_type] = (map[r.alert_type] || 0) + 1; });
        return map;
      }),
      Alert.findAll({
        attributes: ['severity'],
        where,
        raw: true
      }).then(rows => {
        const map = {};
        rows.forEach(r => { map[r.severity] = (map[r.severity] || 0) + 1; });
        return map;
      })
    ]);

    return res.json({
      success: true,
      data: {
        total,
        unacknowledged,
        by_alert_type: byType,
        by_severity: bySeverity
      }
    });
  } catch (error) {
    console.error('getAlertStats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch alert stats', error: error.message });
  }
};

/**
 * Acknowledge an alert (EO for their alerts, Admin for any).
 * PATCH /api/alerts/:id/acknowledge
 */
export const acknowledgeAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const isEo = req.userType === 'admin_management' && user?.role === 'eo';

    const alert = await Alert.findByPk(id);
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });

    if (isEo && alert.eo_id !== user.id) {
      return res.status(403).json({ success: false, message: 'You can only acknowledge alerts under your EO' });
    }

    alert.acknowledged = true;
    alert.acknowledged_at = new Date();
    alert.acknowledged_by = user.id;
    await alert.save();

    return res.json({
      success: true,
      data: {
        id: alert.id,
        acknowledged: alert.acknowledged,
        acknowledged_at: alert.acknowledged_at,
        acknowledged_by: alert.acknowledged_by
      }
    });
  } catch (error) {
    console.error('acknowledgeAlert error:', error);
    return res.status(500).json({ success: false, message: 'Failed to acknowledge alert', error: error.message });
  }
};

/**
 * Manually trigger alert checks (Admin only). Optional for testing.
 * POST /api/alerts/trigger-check
 */
export const triggerAlertCheck = async (req, res) => {
  try {
    const results = await runAlertChecks();
    const lastRunAt = getLastRunAt();
    return res.json({
      success: true,
      data: { results, last_run_at: lastRunAt }
    });
  } catch (error) {
    console.error('triggerAlertCheck error:', error);
    return res.status(500).json({ success: false, message: 'Failed to run alert checks', error: error.message });
  }
};
