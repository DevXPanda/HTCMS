/**
 * Breadcrumb config: path pattern (no leading slash) -> { label, parentPath }
 * parentPath is the path to use for the parent breadcrumb (without leading slash for comparison).
 * Order: more specific paths should be matched first (longer paths first).
 */
const adminRoutes = [
  { path: 'dashboard', label: 'Dashboard', parentPath: null },
  { path: 'tax-management', label: 'Tax Management', parentPath: 'dashboard' },
  { path: 'demands/unified', label: 'Unified Tax Demand', parentPath: 'demands' },
  { path: 'demands/generate', label: 'Generate Demands', parentPath: 'demands' },
  { path: 'demands', label: 'Tax Demands', parentPath: 'tax-management' },
  { path: 'properties/new', label: 'Add Property', parentPath: 'properties' },
  { path: 'properties', label: 'Properties', parentPath: 'dashboard' },
  { path: 'assessments/new', label: 'New Assessment', parentPath: 'assessments' },
  { path: 'assessments', label: 'Assessments', parentPath: 'property-tax' },
  { path: 'property-tax', label: 'Property Tax', parentPath: 'tax-management' },
  { path: 'water-tax', label: 'Water Tax', parentPath: 'tax-management' },
  { path: 'notices', label: 'Notices', parentPath: 'dashboard' },
  { path: 'payments', label: 'Payments', parentPath: 'dashboard' },
  { path: 'wards', label: 'Wards', parentPath: 'dashboard' },
  { path: 'users', label: 'Users', parentPath: 'dashboard' },
  { path: 'reports', label: 'Reports', parentPath: 'dashboard' },
  { path: 'audit-logs', label: 'Audit Logs', parentPath: 'dashboard' },
  { path: 'attendance', label: 'Attendance', parentPath: 'dashboard' },
  { path: 'water/connections', label: 'Water Connections', parentPath: 'water-tax' },
  { path: 'water/assessments', label: 'Water Tax Assessments', parentPath: 'water-tax' },
  { path: 'water/connection-requests', label: 'Connection Requests', parentPath: 'water-tax' },
  { path: 'water/bills', label: 'Water Bills', parentPath: 'water-tax' },
  { path: 'toilet-management', label: 'Toilet Management', parentPath: 'dashboard' },
  { path: 'toilet-management/facilities', label: 'Facilities', parentPath: 'toilet-management' },
  { path: 'toilet-management/inspections', label: 'Inspections', parentPath: 'toilet-management' },
  { path: 'toilet-management/complaints', label: 'Complaints', parentPath: 'toilet-management' },
  { path: 'toilet-management/maintenance', label: 'Maintenance', parentPath: 'toilet-management' },
  { path: 'toilet-management/reports', label: 'Toilet Reports', parentPath: 'toilet-management' },
  { path: 'mrf', label: 'MRF', parentPath: 'dashboard' },
  { path: 'mrf/management', label: 'MRF Management', parentPath: 'mrf' },
  { path: 'field-monitoring', label: 'Field Monitoring', parentPath: 'dashboard' },
  { path: 'eo-management', label: 'EO Management', parentPath: 'dashboard' },
  { path: 'admin-management', label: 'Admin Management', parentPath: 'dashboard' },
  { path: 'tax/discount-management', label: 'Discount Management', parentPath: 'tax-management' },
  { path: 'tax/penalty-waiver', label: 'Penalty Waiver', parentPath: 'tax-management' },
  { path: 'shop-tax', label: 'Shop Tax', parentPath: 'tax-management' },
  { path: 'gaushala/management', label: 'Gaushala', parentPath: 'dashboard' },
];

// Detail pages: match /segment/:id or /segment/sub/:id — use parent segment for parentPath
function matchPath(pathname) {
  const clean = pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!clean) return { path: 'dashboard', label: 'Dashboard', parentPath: null };

  // Try exact match first
  let exact = adminRoutes.find((r) => r.path === clean);
  if (exact) return exact;

  // Try matching with :id (e.g. demands/123 -> demands)
  const segments = clean.split('/');
  for (let len = segments.length; len >= 1; len--) {
    const sub = segments.slice(0, len).join('/');
    const rest = segments.slice(len);
    const route = adminRoutes.find((r) => r.path === sub);
    if (route && rest.length > 0) {
      // This is a detail page under 'sub'
      const lastSegment = rest[rest.length - 1];
      const isId = /^\d+$/.test(lastSegment);
      return {
        path: clean,
        label: isId ? getDetailLabel(sub) : rest.join(' / '),
        parentPath: sub,
      };
    }
    if (route) return route;
  }

  return { path: clean, label: clean.split('/').pop() || 'Dashboard', parentPath: segments.slice(0, -1).join('/') || 'dashboard' };
}

function getDetailLabel(parentPath) {
  const labels = {
    demands: 'Demand Details',
    properties: 'Property Details',
    assessments: 'Assessment Details',
    payments: 'Payment Details',
    notices: 'Notice Details',
    wards: 'Ward Details',
    'water/connections': 'Connection Details',
    'water/assessments': 'Assessment Details',
    'toilet-management/facilities': 'Facility Details',
    'toilet-management/inspections': 'Inspection Details',
    'toilet-management/complaints': 'Complaint Details',
    'toilet-management/maintenance': 'Maintenance Details',
    'mrf/facilities': 'MRF Details',
    'gaushala/facilities': 'Facility Details',
    'shop-tax/shops': 'Shop Details',
    'shop-tax/assessments': 'Shop Assessment Details',
  };
  return labels[parentPath] || 'Details';
}

export function getAdminBreadcrumbs(pathname) {
  const items = [];
  let current = pathname.replace(/^\/+/, '').replace(/\/+$/, '') || 'dashboard';
  const seen = new Set();
  for (let i = 0; i < 10; i++) {
    if (seen.has(current)) break;
    seen.add(current);
    const matched = matchPath('/' + current);
    items.unshift({
      path: '/' + (matched.path.startsWith('/') ? matched.path.slice(1) : matched.path),
      label: matched.label,
    });
    if (!matched.parentPath) break;
    current = matched.parentPath;
  }
  return items;
}
