import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'htcms_selected_ulb_id';

const SelectedUlbContext = createContext(null);

export const useSelectedUlb = () => {
  const context = useContext(SelectedUlbContext);
  if (!context) {
    throw new Error('useSelectedUlb must be used within SelectedUlbProvider');
  }
  return context;
};

export const SelectedUlbProvider = ({ children }) => {
  const { user } = useAuth();
  const hasUlbAssigned = user?.ulb_id != null && String(user.ulb_id).trim() !== '';
  const isSuperAdmin = user?.role === 'admin' && !hasUlbAssigned;

  const [selectedUlbId, setSelectedUlbIdState] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      return sessionStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    if (!isSuperAdmin && user?.ulb_id) {
      setSelectedUlbIdState(user.ulb_id);
    }
  }, [isSuperAdmin, user?.ulb_id]);

  const setSelectedUlbId = (value) => {
    const id = value || '';
    setSelectedUlbIdState(id);
    try {
      if (id) sessionStorage.setItem(STORAGE_KEY, id);
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  };

  const effectiveUlbId = useMemo(() => {
    if (isSuperAdmin) return selectedUlbId || null;
    return user?.ulb_id || null;
  }, [isSuperAdmin, selectedUlbId, user?.ulb_id]);

  const value = useMemo(
    () => ({
      selectedUlbId,
      setSelectedUlbId,
      isSuperAdmin,
      effectiveUlbId
    }),
    [selectedUlbId, isSuperAdmin, effectiveUlbId]
  );

  return (
    <SelectedUlbContext.Provider value={value}>
      {children}
    </SelectedUlbContext.Provider>
  );
};
