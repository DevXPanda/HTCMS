import { useLocation } from 'react-router-dom';

/** When under SFI portal (/sfi/...) returns '/sfi/mrf', otherwise '/mrf'. */
export function useMrfBasePath() {
  const location = useLocation();
  return location.pathname.startsWith('/sfi') ? '/sfi/mrf' : '/mrf';
}
