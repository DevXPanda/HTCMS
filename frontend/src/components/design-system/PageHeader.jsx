/**
 * Design system: Page title section with optional subtitle and actions.
 */
export default function PageHeader({ title, subtitle, children, className = '' }) {
  return (
    <div className={`ds-page-header ${className}`.trim()}>
      <div>
        {title && <h1 className="ds-page-title">{title}</h1>}
        {subtitle && <p className="ds-page-subtitle">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2 shrink-0">{children}</div>}
    </div>
  );
}
