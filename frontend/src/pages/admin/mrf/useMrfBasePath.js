import { useLocation } from 'react-router-dom';

/** Supports SFI (/sfi/mrf), SBM (/sbm/mrf), otherwise admin (/mrf). */
export function useMrfBasePath() {
  const location = useLocation();
  if (location.pathname.startsWith('/sfi')) return '/sfi/mrf';
  if (location.pathname.startsWith('/sbm')) return '/sbm/mrf';
  return '/mrf';
}
