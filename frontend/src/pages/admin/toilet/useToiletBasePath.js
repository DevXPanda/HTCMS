import { useLocation } from 'react-router-dom';

/** When under SFI portal (/sfi/...) returns '/sfi/toilet-management', otherwise '/toilet-management'. */
export function useToiletBasePath() {
  const location = useLocation();
  return location.pathname.startsWith('/sfi') ? '/sfi/toilet-management' : '/toilet-management';
}
