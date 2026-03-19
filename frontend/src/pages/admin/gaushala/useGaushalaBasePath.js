import { useLocation } from 'react-router-dom';

/** Supports SBM (/sbm/gaushala), otherwise admin (/gaushala). */
export function useGaushalaBasePath() {
  const location = useLocation();
  if (location.pathname.startsWith('/sbm')) return '/sbm/gaushala';
  return '/gaushala';
}

