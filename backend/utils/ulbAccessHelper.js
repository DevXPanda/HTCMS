import { Ward } from '../models/index.js';

/**
 * Role-based ULB access for list/stats APIs.
 * SUPER_ADMIN = users table, role 'admin', and no ulb_id assigned (sees all ULBs / can pass ulb_id query).
 * Admins created from Citizen Management have ulb_id set and are restricted to that ULB only.
 * @param {Object} req - Express request
 * @returns {{ isSuperAdmin: boolean, effectiveUlbId: string|null }}
 */
export function getEffectiveUlbForRequest(req) {
  const userType = req.userType || '';
  const role = (req.user?.role ?? req.user?.dataValues?.role ?? '').toString().toLowerCase();
  const userUlbId = req.user?.ulb_id ?? req.user?.dataValues?.ulb_id ?? null;
  const hasUlbAssigned = userUlbId != null && String(userUlbId).trim() !== '';
  const isSuperAdmin = userType === 'user' && role === 'admin' && !hasUlbAssigned;
  const effectiveUlbId = isSuperAdmin ? (req.query.ulb_id || null) : (userUlbId || null);
  return { isSuperAdmin, effectiveUlbId };
}

/**
 * Get ward IDs for a given ULB (for filtering list/stats by ULB).
 * @param {string|null|undefined} ulbId - ULB UUID or null/undefined for no filter
 * @returns {Promise<number[]|null>} - Array of ward ids or null when ulbId is falsy
 */
export async function getWardIdsByUlbId(ulbId) {
  if (!ulbId) return null;
  const wards = await Ward.findAll({ where: { ulb_id: ulbId }, attributes: ['id'] });
  return wards.map(w => w.id);
}
