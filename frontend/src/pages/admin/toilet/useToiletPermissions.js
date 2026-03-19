import { useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { StaffAuthContext } from '../../../contexts/StaffAuthContext';
import { useAuth } from '../../../contexts/AuthContext';

export function useToiletPermissions() {
  const location = useLocation();
  const staffCtx = useContext(StaffAuthContext);
  const staffUser = staffCtx?.user || null;
  const { user: authUser } = useAuth();

  const isSbmPath = location.pathname.startsWith('/sbm/');
  const storedRole = (typeof window !== 'undefined' ? localStorage.getItem('role') : '') || '';
  const isSbmRole = String(staffUser?.role || storedRole || '').toLowerCase().includes('sbm');
  const isSbm = isSbmPath || isSbmRole;

  const canCrud = isSbm ? Boolean(staffUser?.full_crud_enabled) : Boolean(authUser);

  return { isSbm, canCrud };
}

