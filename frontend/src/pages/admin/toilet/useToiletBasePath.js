import { useLocation } from 'react-router-dom';

/** When under SFI portal (/sfi/...) returns '/sfi/toilet-management', under SBM returns '/sbm/toilet-management', otherwise '/toilet-management'. */
export function useToiletBasePath() {
  const location = useLocation();
  if (location.pathname.startsWith('/sfi')) return '/sfi/toilet-management';
  if (location.pathname.startsWith('/sbm')) return '/sbm/toilet-management';
  return '/toilet-management';
}
