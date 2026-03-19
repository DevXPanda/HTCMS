import { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { StaffAuthContext } from '../../../contexts/StaffAuthContext';
import { useAuth } from '../../../contexts/AuthContext';

export function useGaushalaPermissions() {
  const location = useLocation();
  const staffCtx = useContext(StaffAuthContext);
  const { user: authUser } = useAuth();

  const staffUser = staffCtx?.user || null;
  const storedRole = (typeof window !== 'undefined' ? localStorage.getItem('role') : '') || '';
  const isSbmPath = location.pathname.startsWith('/sbm/');
  const isSbmRole = String(staffUser?.role || storedRole || '').toLowerCase().includes('sbm');
  const isSbm = isSbmPath || isSbmRole;

  const canCrud = isSbm ? Boolean(staffUser?.full_crud_enabled) : Boolean(authUser);
  return { isSbm, canCrud };
}

