import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * Shared layout for View Details pages across the app.
 * Use: optional back link (when showBackLink), page header (title + actions), optional summary section, then content cards.
 * When breadcrumbs are used app-wide, set showBackLink={false} (default).
 */
export default function DetailPageLayout({
  backTo,
  backLabel = 'Back',
  showBackLink = false,
  title,
  subtitle,
  actionButtons,
  summarySection,
  children,
}) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {showBackLink && backTo && (
        <Link
          to={backTo}
          className="inline-flex items-center text-primary-600 hover:text-primary-700 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2 shrink-0" />
          {backLabel}
        </Link>
      )}

      <div className="ds-page-header flex-wrap gap-4">
        <div>
          <h1 className="ds-page-title">{title}</h1>
          {subtitle && <p className="ds-page-subtitle">{subtitle}</p>}
        </div>
        {actionButtons && <div className="flex items-center gap-2 flex-wrap">{actionButtons}</div>}
      </div>

      {summarySection && <section>{summarySection}</section>}

      {children}
    </div>
  );
}

/** Consistent row for key-value pairs inside detail cards */
export function DetailRow({ label, value, valueClass = '' }) {
  if (value == null || value === '') return null;
  return (
    <div className="py-3 flex justify-between items-baseline gap-4 border-b border-gray-100 last:border-b-0">
      <dt className="text-sm font-medium text-gray-500 shrink-0">{label}</dt>
      <dd className={`text-right font-medium text-gray-900 break-words ${valueClass}`}>{value}</dd>
    </div>
  );
}
