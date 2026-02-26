/**
 * Design system: Standard page wrapper.
 * Use for every module page for consistent padding and max-width.
 */
export default function PageContainer({ children, className = '' }) {
  return (
    <div className={`ds-page ${className}`.trim()}>
      {children}
    </div>
  );
}
