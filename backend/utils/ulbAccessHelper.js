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
  const isSuperAdmin = userType === 'user' && (role === 'super_admin' || (role === 'admin' && !hasUlbAssigned));
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

/**
 * Get effective ward IDs for the current request. Used for SFI: only wards assigned to the SFI (and belonging to their ULB) are returned.
 * For non-SFI callers, returns null (caller should use getWardIdsByUlbId(effectiveUlbId) for admin/EO etc.).
 * @param {Object} req - Express request (must have req.user with role, ulb_id, ward_ids)
 * @returns {Promise<number[]|null>} - For SFI: array of assigned ward ids (validated against ULB); empty array if none assigned. For others: null.
 */
export async function getEffectiveWardIdsForRequest(req) {
  const userType = req.userType || '';
  const role = (req.user?.role ?? req.user?.dataValues?.role ?? '').toString().toUpperCase();
  if (userType !== 'admin_management' || role !== 'SFI') return null;
  const ulbId = req.user?.ulb_id ?? req.user?.dataValues?.ulb_id ?? null;
  const wardIds = req.user?.ward_ids ?? req.user?.dataValues?.ward_ids;
  const ids = Array.isArray(wardIds) ? wardIds.map(id => parseInt(id, 10)).filter(n => !isNaN(n)) : [];
  if (!ulbId || ids.length === 0) return [];
  const wards = await Ward.findAll({ where: { id: ids, ulb_id: ulbId }, attributes: ['id'] });
  return wards.map(w => w.id);
}

/**
 * Get ward IDs to use for filtering in list/stats. For SFI returns only assigned wards; for admin/EO returns all wards in effective ULB.
 * @param {Object} req - Express request
 * @returns {Promise<number[]|null>} - Ward IDs to filter by, or null for no filter (e.g. super admin without ULB). Empty array = no access (SFI with no wards).
 */
export async function getWardIdsForRequest(req) {
  const sfiWardIds = await getEffectiveWardIdsForRequest(req);
  if (sfiWardIds !== null) return sfiWardIds;
  const { effectiveUlbId } = getEffectiveUlbForRequest(req);
  return getWardIdsByUlbId(effectiveUlbId);
}
