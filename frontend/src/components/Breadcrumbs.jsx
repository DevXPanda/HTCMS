import { Link, useLocation } from 'react-router-dom';
import { getBreadcrumbs } from '../config/breadcrumbs';
import { ChevronRight } from 'lucide-react';

/**
 * Renders breadcrumb navigation below the header.
 * Works for all roles: admin, citizen, collector, clerk, inspector, officer, supervisor, eo.
 */
export default function Breadcrumbs() {
  const location = useLocation();
  const pathname = location.pathname;

  const items = getBreadcrumbs(pathname);

  if (items.length <= 1) return null;

  return (
    <nav className="no-print flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-gray-500 mb-4 min-w-0" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const href = item.path.startsWith('/') ? item.path : `/${item.path}`;
        return (
          <span key={`${href}-${index}`} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
            {isLast ? (
              <span className="font-medium text-gray-900">{item.label}</span>
            ) : (
              <Link to={href} className="hover:text-primary-600 transition-colors">
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
