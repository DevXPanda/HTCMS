/**
 * Shared layout for View Details pages across the app.
 * Uses app-wide breadcrumbs for navigation; back arrow is not shown.
 */
export default function DetailPageLayout({
  title,
  subtitle,
  actionButtons,
  summarySection,
  children,
}) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="no-print ds-page-header flex-wrap gap-4">
        <div>
          <h1 className="ds-page-title">{title}</h1>
          {subtitle && <p className="ds-page-subtitle">{subtitle}</p>}
        </div>
        {actionButtons && <div className="flex items-center gap-2 flex-wrap">{actionButtons}</div>}
      </div>

      {summarySection && <section className="no-print">{summarySection}</section>}

      {children}
    </div>
  );
}

/** Consistent row for key-value pairs inside detail cards */
export function DetailRow({ label, value, valueClass = '' }) {
  if (value == null || value === '') return null;
  return (
    <div className="py-3 flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1 sm:gap-x-4 border-b border-gray-100 last:border-b-0">
      <dt className="text-sm font-medium text-gray-500 shrink-0">{label}</dt>
      <dd className={`text-right font-medium text-gray-900 break-words min-w-0 ${valueClass}`}>{value}</dd>
    </div>
  );
}
