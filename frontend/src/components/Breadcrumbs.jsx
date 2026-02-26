import { Link, useLocation } from 'react-router-dom';
import { getAdminBreadcrumbs } from '../config/breadcrumbs';
import { ChevronRight } from 'lucide-react';

/**
 * Renders breadcrumb navigation below the header.
 * Uses pathname to resolve breadcrumb items (admin routes only for now).
 */
export default function Breadcrumbs() {
  const location = useLocation();
  const pathname = location.pathname;

  // Only show breadcrumbs for admin app (root routes, not /collector, /clerk, etc.)
  const isAdmin = !pathname.startsWith('/collector') && !pathname.startsWith('/clerk') && !pathname.startsWith('/inspector') && !pathname.startsWith('/officer') && !pathname.startsWith('/supervisor') && !pathname.startsWith('/citizen') && !pathname.startsWith('/eo');
  const items = isAdmin ? getAdminBreadcrumbs(pathname) : [];

  if (items.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1 text-sm text-gray-500 mb-4" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={item.path} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
            {isLast ? (
              <span className="font-medium text-gray-900">{item.label}</span>
            ) : (
              <Link to={item.path} className="hover:text-primary-600 transition-colors">
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
