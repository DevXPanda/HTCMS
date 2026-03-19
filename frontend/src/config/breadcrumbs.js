/**
 * Breadcrumb config: path pattern (no leading slash) -> { label, parentPath }
 * parentPath is the path to use for the parent breadcrumb (without leading slash for comparison).
 * Order: more specific paths should be matched first (longer paths first).
 */
const adminRoutes = [
  { path: 'dashboard', label: 'Dashboard', parentPath: null },
  { path: 'tax-management', label: 'Tax Management', parentPath: 'dashboard' },
  { path: 'tax-management/d2dc', label: 'D2DC Module', parentPath: 'tax-management' },
  { path: 'demands/unified', label: 'Unified Tax Demand', parentPath: 'demands' },
  { path: 'demands/generate/property', label: 'Property Tax Demands', parentPath: 'demands/generate' },
  { path: 'demands/generate/water', label: 'Water Tax Demands', parentPath: 'demands/generate' },
  { path: 'demands/generate/shop', label: 'Shop Tax Demands', parentPath: 'demands/generate' },
  { path: 'demands/generate/d2dc', label: 'D2DC Demands', parentPath: 'demands/generate' },
  { path: 'demands/generate', label: 'Generate Demands', parentPath: 'demands' },
  { path: 'demands', label: 'Tax Demands', parentPath: 'tax-management' },
  { path: 'properties/new', label: 'Add Property', parentPath: 'properties' },
  { path: 'properties', label: 'Properties', parentPath: 'property-tax' },
  { path: 'assessments/new', label: 'New Assessment', parentPath: 'assessments' },
  { path: 'assessments', label: 'Assessments', parentPath: 'property-tax' },
  { path: 'property-tax', label: 'Property Tax', parentPath: 'tax-management' },
  { path: 'water-tax', label: 'Water Tax', parentPath: 'tax-management' },
  { path: 'notifications', label: 'All Notifications', parentPath: 'dashboard' },
  { path: 'notices', label: 'Notices', parentPath: 'dashboard' },
  { path: 'payments', label: 'Payments', parentPath: 'dashboard' },
  { path: 'wards', label: 'Wards', parentPath: 'dashboard' },
  { path: 'ulb-management', label: 'ULB Management', parentPath: 'dashboard' },
  { path: 'users', label: 'Citizen Management', parentPath: 'dashboard' },
  { path: 'admin-accounts', label: 'Admin Management', parentPath: 'dashboard' },
  { path: 'reports', label: 'Reports', parentPath: 'dashboard' },
  { path: 'audit-logs', label: 'Audit Logs', parentPath: 'dashboard' },
  { path: 'attendance', label: 'Attendance', parentPath: 'dashboard' },
  { path: 'water/connections', label: 'Water Connections', parentPath: 'water-tax' },
  { path: 'water/assessments', label: 'Water Tax Assessments', parentPath: 'water-tax' },
  { path: 'water/connection-requests', label: 'Connection Requests', parentPath: 'water-tax' },
  { path: 'water/connection-requests/new', label: 'New Request', parentPath: 'water/connection-requests' },
  { path: 'water/connection-requests/:id', label: 'Request Details', parentPath: 'water/connection-requests' },
  { path: 'water/connection-requests/:id/edit', label: 'Edit Request', parentPath: 'water/connection-requests' },
  { path: 'water/bills', label: 'Water Bills', parentPath: 'water-tax' },
  { path: 'water/payments', label: 'Water Payments', parentPath: 'water-tax' },
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
  { path: 'admin-management', label: 'Staff Management', parentPath: 'dashboard' },
  { path: 'tax/discount-management', label: 'Discount Management', parentPath: 'tax-management' },
  { path: 'tax/penalty-waiver', label: 'Penalty Waiver', parentPath: 'tax-management' },
  { path: 'shop-tax', label: 'Shop Tax', parentPath: 'tax-management' },
  { path: 'shop-tax/shops', label: 'Shops', parentPath: 'shop-tax' },
  { path: 'shop-tax/shops/new', label: 'Add Shop', parentPath: 'shop-tax/shops' },
  { path: 'shop-tax/assessments', label: 'Assessments', parentPath: 'shop-tax' },
  { path: 'shop-tax/registration-requests', label: 'Registration Requests', parentPath: 'shop-tax' },
  { path: 'shop-registration-requests', label: 'Shop Registration Requests', parentPath: 'dashboard' },
  { path: 'gaushala/management', label: 'Gaushala', parentPath: 'dashboard' },
  { path: 'field-worker-monitoring', label: 'Field Worker Monitoring', parentPath: 'dashboard' },
  { path: 'field-worker-monitoring/eos/:eoId/dashboard', label: 'EO Dashboard', parentPath: 'field-worker-monitoring' },
  { path: 'admin-field-worker-monitoring', label: 'Admin Field Monitoring', parentPath: 'dashboard' },
  { path: 'approval-requests', label: 'Approval Requests', parentPath: 'dashboard' },
];

// Helper: match route path to pathname when route may contain :param segments
function adminRouteMatches(routePath, pathname) {
  const routeSegs = routePath.split('/');
  const pathSegs = pathname.split('/');
  if (routeSegs.length !== pathSegs.length) return false;
  return routeSegs.every((s, i) => s.startsWith(':') || s === pathSegs[i]);
}

// Detail pages: match /segment/:id or /segment/sub/:id — use parent segment for parentPath. Supports :param in routes.
function matchPath(pathname) {
  const clean = pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!clean) return { path: 'dashboard', label: 'Dashboard', parentPath: null };

  // Try exact match first
  let exact = adminRoutes.find((r) => r.path === clean);
  if (exact) return exact;

  // Try match with :param (e.g. field-worker-monitoring/eos/5/dashboard -> field-worker-monitoring/eos/:eoId/dashboard)
  exact = adminRoutes.find((r) => adminRouteMatches(r.path, clean));
  if (exact) return exact;

  // Try matching with :id (e.g. demands/123 -> demands)
  const segments = clean.split('/');
  for (let len = segments.length; len >= 1; len--) {
    const sub = segments.slice(0, len).join('/');
    const rest = segments.slice(len);
    let route = adminRoutes.find((r) => r.path === sub);
    if (!route) route = adminRoutes.find((r) => adminRouteMatches(r.path, sub));
    if (route && rest.length > 0) {
      // This is a detail page under 'sub'
      const lastSegment = rest[rest.length - 1];
      const isId = /^\d+$/.test(lastSegment);
      const listPath = route.path.includes(':') ? (route.parentPath != null ? route.parentPath : sub) : sub;
      return {
        path: clean,
        label: isId ? getDetailLabel(listPath) : (route.label || rest.join(' / ')),
        parentPath: (route.path !== sub && route.parentPath != null) ? route.parentPath : sub,
      };
    }
    if (route) return route;
  }

  return { path: clean, label: clean.split('/').pop() || 'Dashboard', parentPath: segments.slice(0, -1).join('/') || 'dashboard' };
}

// Role-specific routes (path relative to role prefix, e.g. citizen/dashboard -> dashboard)
// Detail routes (e.g. properties/:id) must be listed so breadcrumbs show correct label and parent.
const citizenRoutes = [
  { path: 'dashboard', label: 'Citizen Dashboard', parentPath: null },
  { path: 'properties', label: 'My Properties', parentPath: 'dashboard' },
  { path: 'properties/:id', label: 'Property Details', parentPath: 'properties' },
  { path: 'properties/new', label: 'Add Property', parentPath: 'properties' },
  { path: 'demands', label: 'My Demands', parentPath: 'dashboard' },
  { path: 'demands/:id', label: 'Demand Details', parentPath: 'demands' },
  { path: 'water-connections', label: 'Water Connections', parentPath: 'dashboard' },
  { path: 'water-connections/:id', label: 'Connection Details', parentPath: 'water-connections' },
  { path: 'water-connection-request', label: 'Request Water Connection', parentPath: 'dashboard' },
  { path: 'shops', label: 'My Shops', parentPath: 'dashboard' },
  { path: 'shops/:id', label: 'Shop Details', parentPath: 'shops' },
  { path: 'shop-registration-requests', label: 'Shop Registration', parentPath: 'dashboard' },
  { path: 'shop-registration-requests/:id', label: 'Request Details', parentPath: 'shop-registration-requests' },
  { path: 'notices', label: 'My Notices', parentPath: 'dashboard' },
  { path: 'notices/:id', label: 'Notice Details', parentPath: 'notices' },
  { path: 'payments', label: 'Payments', parentPath: 'dashboard' },
  { path: 'payments/online/:demandId', label: 'Online Payment', parentPath: 'payments' },
  { path: 'payments/:id', label: 'Payment Details', parentPath: 'payments' },
  { path: 'activity-history', label: 'Activity History', parentPath: 'dashboard' },
  { path: 'toilet/file-complaint', label: 'File Toilet Complaint', parentPath: 'dashboard' },
  { path: 'toilet/complaint-history', label: 'Toilet Complaint History', parentPath: 'dashboard' },
];

const collectorRoutes = [
  { path: 'dashboard', label: 'Dashboard', parentPath: null },
  { path: 'wards', label: 'Assigned Wards', parentPath: 'dashboard' },
  { path: 'properties', label: 'Property List', parentPath: 'dashboard' },
  { path: 'properties/:id', label: 'Property Details', parentPath: 'properties' },
  { path: 'tax-summary', label: 'Tax Summary', parentPath: 'dashboard' },
  { path: 'collections', label: 'Collections', parentPath: 'dashboard' },
  { path: 'collections/:id', label: 'Collection Details', parentPath: 'collections' },
  { path: 'tasks', label: "Today's Tasks", parentPath: 'dashboard' },
  { path: 'field-visit/new', label: 'Record Field Visit', parentPath: 'tasks' },
  { path: 'attendance', label: 'My Attendance', parentPath: 'dashboard' },
  { path: 'activity-logs', label: 'Activity Logs', parentPath: 'dashboard' },
  { path: 'demands', label: 'Demands', parentPath: 'dashboard' },
  { path: 'demands/:id', label: 'Demand Details', parentPath: 'demands' },
];

const clerkRoutes = [
  { path: 'dashboard', label: 'Dashboard', parentPath: null },
  { path: 'property-applications', label: 'Property Applications', parentPath: 'dashboard' },
  { path: 'property-applications/:id', label: 'Application Details', parentPath: 'property-applications' },
  { path: 'property-applications/new', label: 'New Application', parentPath: 'property-applications' },
  // Tax Management → Property Tax workflow (SBM)
  { path: 'properties', label: 'Properties', parentPath: 'property-tax' },
  { path: 'properties/:id', label: 'Property Details', parentPath: 'properties' },
  { path: 'property-connections', label: 'Property Connections', parentPath: 'dashboard' },
  { path: 'water-applications', label: 'Water Applications', parentPath: 'dashboard' },
  { path: 'water-applications/:id', label: 'Application Details', parentPath: 'water-applications' },
  { path: 'water-applications/new', label: 'New Water Application', parentPath: 'water-applications' },
  { path: 'water-connections', label: 'Water Connections', parentPath: 'dashboard' },
  { path: 'water-connections/:id', label: 'Connection Details', parentPath: 'water-connections' },
  { path: 'existing-water-connections', label: 'Existing Water Connections', parentPath: 'dashboard' },
  { path: 'existing-water-connections/:id', label: 'Connection Details', parentPath: 'existing-water-connections' },
  { path: 'shop-tax', label: 'Shop Tax', parentPath: 'dashboard' },
  { path: 'shop-tax/shops', label: 'Shops', parentPath: 'shop-tax' },
  { path: 'shop-tax/shops/:id', label: 'Shop Details', parentPath: 'shop-tax/shops' },
  { path: 'shop-tax/shops/new', label: 'Add Shop', parentPath: 'shop-tax/shops' },
  { path: 'shop-tax/assessments', label: 'Assessments', parentPath: 'shop-tax' },
  { path: 'shop-tax/assessments/:id', label: 'Assessment Details', parentPath: 'shop-tax/assessments' },
  { path: 'shop-tax/assessments/new', label: 'New Assessment', parentPath: 'shop-tax/assessments' },
  { path: 'demands', label: 'Demands', parentPath: 'dashboard' },
  { path: 'demands/:id', label: 'Demand Details', parentPath: 'demands' },
  { path: 'demands/generate', label: 'Generate Demands', parentPath: 'demands' },
  { path: 'demands/generate/property', label: 'Property Demands', parentPath: 'demands/generate' },
  { path: 'demands/generate/water', label: 'Water Demands', parentPath: 'demands/generate' },
  { path: 'demands/generate/shop', label: 'Shop Demands', parentPath: 'demands/generate' },
  { path: 'demands/generate/d2dc', label: 'D2DC Demands', parentPath: 'demands/generate' },
  { path: 'shop-registration-requests', label: 'Shop Registration Requests', parentPath: 'dashboard' },
  { path: 'shop-registration-requests/:id', label: 'Request Details', parentPath: 'shop-registration-requests' },
  { path: 'returned-applications', label: 'Returned Applications', parentPath: 'dashboard' },
  { path: 'attendance', label: 'Attendance', parentPath: 'dashboard' },
  { path: 'activity-history', label: 'Activity History', parentPath: 'dashboard' },
];

const inspectorRoutes = [
  { path: 'dashboard', label: 'Dashboard', parentPath: null },
  { path: 'property-applications', label: 'Property Applications', parentPath: 'dashboard' },
  { path: 'property-applications/:id/inspect', label: 'Inspect Application', parentPath: 'property-applications' },
  { path: 'water-connections', label: 'Water Connections', parentPath: 'dashboard' },
  { path: 'water-connections/:id/inspect', label: 'Inspect Connection', parentPath: 'water-connections' },
  { path: 'recent-inspections', label: 'Recent Inspections', parentPath: 'dashboard' },
  // Tax Management → Property Tax workflow (SBM)
  { path: 'properties', label: 'Properties', parentPath: 'property-tax' },
  { path: 'properties/:id', label: 'Property Details', parentPath: 'properties' },
  { path: 'attendance', label: 'Attendance', parentPath: 'dashboard' },
];

const officerRoutes = [
  { path: 'dashboard', label: 'Dashboard', parentPath: null },
  { path: 'property-applications', label: 'Property Applications', parentPath: 'dashboard' },
  { path: 'water-requests', label: 'Water Requests', parentPath: 'dashboard' },
  { path: 'water-requests/:id', label: 'Request Details', parentPath: 'water-requests' },
  { path: 'decision-history', label: 'Decision History', parentPath: 'dashboard' },
  { path: 'attendance', label: 'Attendance', parentPath: 'dashboard' },
];

const accountOfficerRoutes = [
  { path: 'dashboard', label: 'Account Officer Dashboard', parentPath: null },
  { path: 'payments', label: 'Payments', parentPath: 'dashboard' },
  { path: 'payments/:id', label: 'Payment Details', parentPath: 'payments' },
  { path: 'discounts', label: 'Discount Requests', parentPath: 'dashboard' },
  { path: 'penalty-waivers', label: 'Penalty Waiver Requests', parentPath: 'dashboard' },
  { path: 'approval-requests', label: 'Approval Requests', parentPath: 'dashboard' },
  { path: 'notifications', label: 'Notifications', parentPath: 'dashboard' },
];

const supervisorRoutes = [
  { path: 'dashboard', label: 'Dashboard', parentPath: null },
  { path: 'workers', label: 'Worker Management', parentPath: 'dashboard' },
  { path: 'toilet-complaints', label: 'Toilet Complaints', parentPath: 'dashboard' },
  { path: 'mrf', label: 'MRF', parentPath: 'dashboard' },
  { path: 'mrf/facilities/:id', label: 'MRF Details', parentPath: 'mrf' },
];

const eoRoutes = [
  { path: 'dashboard', label: 'Dashboard', parentPath: null },
  { path: 'workers', label: 'Workers', parentPath: 'dashboard' },
];

const sfiRoutes = [
  { path: 'dashboard', label: 'SFI Dashboard', parentPath: null },
  { path: 'toilet-management', label: 'Toilet Management', parentPath: 'dashboard' },
  { path: 'toilet-management/facilities', label: 'Facilities', parentPath: 'toilet-management' },
  { path: 'toilet-management/facilities/new', label: 'Add Facility', parentPath: 'toilet-management/facilities' },
  { path: 'toilet-management/facilities/:id', label: 'Facility Details', parentPath: 'toilet-management/facilities' },
  { path: 'toilet-management/inspections', label: 'Inspections', parentPath: 'toilet-management' },
  { path: 'toilet-management/inspections/new', label: 'New Inspection', parentPath: 'toilet-management/inspections' },
  { path: 'toilet-management/inspections/:id', label: 'Inspection Details', parentPath: 'toilet-management/inspections' },
  { path: 'toilet-management/complaints', label: 'Complaints', parentPath: 'toilet-management' },
  { path: 'toilet-management/complaints/:id', label: 'Complaint Details', parentPath: 'toilet-management/complaints' },
  { path: 'toilet-management/maintenance', label: 'Maintenance', parentPath: 'toilet-management' },
  { path: 'toilet-management/maintenance/new', label: 'New Maintenance', parentPath: 'toilet-management/maintenance' },
  { path: 'toilet-management/maintenance/:id', label: 'Maintenance Details', parentPath: 'toilet-management/maintenance' },
  { path: 'toilet-management/staff', label: 'Staff Assignment', parentPath: 'toilet-management' },
  { path: 'toilet-management/facilities/:id/staff', label: 'Staff', parentPath: 'toilet-management/facilities' },
  { path: 'toilet-management/reports', label: 'Reports', parentPath: 'toilet-management' },
  { path: 'mrf', label: 'MRF', parentPath: 'dashboard' },
  { path: 'mrf/management', label: 'MRF Management', parentPath: 'mrf' },
  { path: 'mrf/worker-assignment', label: 'Worker Assignment', parentPath: 'mrf' },
  { path: 'mrf/facilities/new', label: 'Add MRF', parentPath: 'mrf/management' },
  { path: 'mrf/facilities/:id', label: 'MRF Details', parentPath: 'mrf/management' },
  { path: 'mrf/reports', label: 'MRF Reports', parentPath: 'mrf' },
  { path: 'gaushala/management', label: 'Gaushala', parentPath: 'dashboard' },
  { path: 'gaushala/facilities', label: 'Facilities', parentPath: 'gaushala/management' },
  { path: 'gaushala/facilities/new', label: 'Add Facility', parentPath: 'gaushala/facilities' },
  { path: 'gaushala/facilities/:id', label: 'Facility Details', parentPath: 'gaushala/facilities' },
  { path: 'gaushala/facilities/:id/cattle', label: 'Cattle', parentPath: 'gaushala/facilities' },
  { path: 'gaushala/all-cattle', label: 'All Cattle', parentPath: 'gaushala/management' },
  { path: 'gaushala/all-cattle/new', label: 'Add Cattle', parentPath: 'gaushala/all-cattle' },
  { path: 'gaushala/inspections', label: 'Inspections', parentPath: 'gaushala/management' },
  { path: 'gaushala/inspections/new', label: 'New Inspection', parentPath: 'gaushala/inspections' },
  { path: 'gaushala/inspections/:id', label: 'Inspection Details', parentPath: 'gaushala/inspections' },
  { path: 'gaushala/feeding', label: 'Feeding', parentPath: 'gaushala/management' },
  { path: 'gaushala/complaints', label: 'Complaints', parentPath: 'gaushala/management' },
  { path: 'gaushala/reports', label: 'Reports', parentPath: 'gaushala/management' },
  { path: 'workers', label: 'Staff Assignment', parentPath: 'dashboard' },
  { path: 'staff-management', label: 'Staff Assignment', parentPath: 'dashboard' },
  { path: 'notifications', label: 'Notifications', parentPath: 'dashboard' },
];

// Generic match for a route list (pathWithoutPrefix, routesArray)
function matchPathForRole(clean, routes, detailLabels) {
  if (!clean) return { path: 'dashboard', label: 'Dashboard', parentPath: null };
  const trimmed = (clean || '').replace(/\/+$/, '');
  const exact = routes.find((r) => r.path === trimmed);
  if (exact) return exact;
  const segments = trimmed.split('/').filter(Boolean);
  for (let len = segments.length; len >= 1; len--) {
    const sub = segments.slice(0, len).join('/');
    const rest = segments.slice(len);
    const route = routes.find((r) => {
      const rSegs = r.path.split('/');
      const subSegs = sub.split('/');
      if (rSegs.length !== subSegs.length) return false;
      return rSegs.every((s, i) => s.startsWith(':') || s === subSegs[i]);
    });
    if (route && rest.length > 0) {
      const lastSegment = rest[rest.length - 1];
      const isId = /^\d+$/.test(lastSegment);
      const basePath = route.path.replace(/\/:id.*$/, '').replace(/\/:.*$/, '') || route.path;
      const labelKey = basePath || route.path;
      const parentPath = route.parentPath != null ? route.parentPath : (route.path.replace(/\/:id.*$/, '').replace(/\/:[^/]+.*$/, '') || 'dashboard');
      return {
        path: trimmed,
        label: isId ? (detailLabels && detailLabels[labelKey]) || 'Details' : rest.join(' / '),
        parentPath: parentPath || 'dashboard',
      };
    }
    if (route) return route;
  }
  return { path: trimmed, label: trimmed.split('/').pop() || 'Dashboard', parentPath: segments.slice(0, -1).join('/') || 'dashboard' };
}

function buildBreadcrumbsForRole(pathWithoutPrefix, prefix, routes, detailLabels) {
  const items = [];
  let current = pathWithoutPrefix.replace(/^\/+/, '').replace(/\/+$/, '') || 'dashboard';
  const seen = new Set();
  for (let i = 0; i < 10; i++) {
    if (seen.has(current)) break;
    seen.add(current);
    const matched = matchPathForRole(current, routes, detailLabels);
    const fullPath = prefix + (matched.path.startsWith('/') ? matched.path : '/' + matched.path);
    items.unshift({ path: fullPath, label: matched.label });
    if (!matched.parentPath) break;
    current = matched.parentPath;
  }
  return items;
}

const citizenDetailLabels = { properties: 'Property Details', demands: 'Demand Details', 'shop-registration-requests': 'Request Details', notices: 'Notice Details', payments: 'Payment Details', shops: 'Shop Details' };
const collectorDetailLabels = { properties: 'Property Details', demands: 'Demand Details', collections: 'Collection Details' };
const clerkDetailLabels = { properties: 'Property Details', 'property-applications': 'Application Details', 'water-applications': 'Application Details', 'water-connections': 'Connection Details', 'existing-water-connections': 'Connection Details', 'shop-tax/shops': 'Shop Details', 'shop-tax/assessments': 'Assessment Details', demands: 'Demand Details', 'shop-registration-requests': 'Request Details' };
const inspectorDetailLabels = { 'property-applications': 'Inspection', 'water-connections': 'Inspection', properties: 'Property Details' };
const officerDetailLabels = { 'water-requests': 'Request Details' };

export function getCitizenBreadcrumbs(pathname) {
  const prefix = '/citizen';
  const rest = pathname.replace(/^\/citizen\/?/, '') || 'dashboard';
  return buildBreadcrumbsForRole(rest, prefix, citizenRoutes, citizenDetailLabels);
}

export function getCollectorBreadcrumbs(pathname) {
  const prefix = '/collector';
  const rest = (pathname || '').replace(/^\/collector\/?/, '').replace(/\/+$/, '') || 'dashboard';
  return buildBreadcrumbsForRole(rest, prefix, collectorRoutes, collectorDetailLabels);
}

export function getClerkBreadcrumbs(pathname) {
  const prefix = '/clerk';
  const rest = pathname.replace(/^\/clerk\/?/, '') || 'dashboard';
  return buildBreadcrumbsForRole(rest, prefix, clerkRoutes, clerkDetailLabels);
}

export function getInspectorBreadcrumbs(pathname) {
  const prefix = '/inspector';
  const rest = pathname.replace(/^\/inspector\/?/, '') || 'dashboard';
  return buildBreadcrumbsForRole(rest, prefix, inspectorRoutes, inspectorDetailLabels);
}

export function getOfficerBreadcrumbs(pathname) {
  const prefix = '/officer';
  const rest = pathname.replace(/^\/officer\/?/, '') || 'dashboard';
  return buildBreadcrumbsForRole(rest, prefix, officerRoutes, officerDetailLabels);
}

export function getAccountOfficerBreadcrumbs(pathname) {
  const prefix = '/account-officer';
  const rest = pathname.replace(/^\/account-officer\/?/, '') || 'dashboard';
  return buildBreadcrumbsForRole(rest, prefix, accountOfficerRoutes, {});
}

export function getSupervisorBreadcrumbs(pathname) {
  const prefix = '/supervisor';
  const rest = pathname.replace(/^\/supervisor\/?/, '') || 'dashboard';
  return buildBreadcrumbsForRole(rest, prefix, supervisorRoutes, {});
}

export function getEoBreadcrumbs(pathname) {
  const prefix = '/eo';
  const rest = pathname.replace(/^\/eo\/?/, '') || 'dashboard';
  return buildBreadcrumbsForRole(rest, prefix, eoRoutes, {});
}

export function getSfiBreadcrumbs(pathname) {
  const prefix = '/sfi';
  const rest = pathname.replace(/^\/sfi\/?/, '') || 'dashboard';
  return buildBreadcrumbsForRole(rest, prefix, sfiRoutes, {});
}

const sbmRoutes = [
  { path: 'dashboard', label: 'SBM Dashboard', parentPath: null },
  { path: 'tax-management', label: 'Tax Management', parentPath: 'dashboard' },
  { path: 'property-tax', label: 'Property Tax', parentPath: 'tax-management' },
  { path: 'water-tax', label: 'Water Tax', parentPath: 'tax-management' },
  { path: 'shop-tax', label: 'Shop Tax', parentPath: 'tax-management' },
  { path: 'tax-management/d2dc', label: 'D2DC', parentPath: 'tax-management' },
  { path: 'demands/unified', label: 'Unified Tax Demand', parentPath: 'tax-management' },
  { path: 'ulbs', label: 'ULB Management', parentPath: 'dashboard' },
  { path: 'ulbs/:id', label: 'ULB Details', parentPath: 'ulbs' },
  { path: 'properties', label: 'Properties', parentPath: 'property-tax' },
  { path: 'properties/:id', label: 'Property Details', parentPath: 'properties' },
  { path: 'assessments', label: 'Assessments', parentPath: 'property-tax' },
  { path: 'assessments/:id', label: 'Assessment Details', parentPath: 'assessments' },
  { path: 'demands', label: 'House Tax / Demands', parentPath: 'tax-management' },
  { path: 'demands/:id', label: 'Demand Details', parentPath: 'demands' },
  { path: 'payments', label: 'Payments', parentPath: 'tax-management' },
  { path: 'payments/:id', label: 'Payment Details', parentPath: 'payments' },
  { path: 'notices', label: 'Notices', parentPath: 'tax-management' },
  { path: 'notices/:id', label: 'Notice Details', parentPath: 'notices' },
  { path: 'workers', label: 'Field Workers', parentPath: 'dashboard' },
  { path: 'workers/:id', label: 'Worker Details', parentPath: 'workers' },
  { path: 'staff', label: 'Staff', parentPath: 'dashboard' },
  { path: 'staff/:id', label: 'Staff Details', parentPath: 'staff' },
  { path: 'citizen', label: 'Citizen Management', parentPath: 'dashboard' },
  { path: 'citizen/:id', label: 'Citizen Details', parentPath: 'citizen' },
  { path: 'admin-accounts', label: 'Admin Management', parentPath: 'dashboard' },
  { path: 'admin-accounts/:id', label: 'Admin Account Details', parentPath: 'admin-accounts' },
  { path: 'wards', label: 'Wards', parentPath: 'dashboard' },
  { path: 'wards/:id', label: 'Ward Details', parentPath: 'wards' },
  { path: 'field-monitoring', label: 'Field Monitoring', parentPath: 'dashboard' },
  { path: 'field-worker-monitoring', label: 'Field Worker Monitoring', parentPath: 'dashboard' },
  { path: 'field-worker-monitoring/eos/:eoId/dashboard', label: 'EO Dashboard', parentPath: 'field-worker-monitoring' },
  { path: 'attendance', label: 'Attendance', parentPath: 'dashboard' },
  { path: 'reports', label: 'Reports', parentPath: 'dashboard' },
  { path: 'audit-logs', label: 'Audit Logs', parentPath: 'dashboard' },
  { path: 'toilet', label: 'Toilet Management', parentPath: 'dashboard' },
  { path: 'toilet-management', label: 'Toilet Management', parentPath: 'dashboard' },
  { path: 'toilet-management/facilities', label: 'Facilities', parentPath: 'toilet-management' },
  { path: 'toilet-management/facilities/new', label: 'Add Facility', parentPath: 'toilet-management/facilities' },
  { path: 'toilet-management/facilities/:id', label: 'Facility Details', parentPath: 'toilet-management/facilities' },
  { path: 'toilet-management/inspections', label: 'Inspections', parentPath: 'toilet-management' },
  { path: 'toilet-management/inspections/new', label: 'New Inspection', parentPath: 'toilet-management/inspections' },
  { path: 'toilet-management/inspections/:id', label: 'Inspection Details', parentPath: 'toilet-management/inspections' },
  { path: 'toilet-management/complaints', label: 'Complaints', parentPath: 'toilet-management' },
  { path: 'toilet-management/complaints/:id', label: 'Complaint Details', parentPath: 'toilet-management/complaints' },
  { path: 'toilet-management/maintenance', label: 'Maintenance', parentPath: 'toilet-management' },
  { path: 'toilet-management/maintenance/new', label: 'New Maintenance', parentPath: 'toilet-management/maintenance' },
  { path: 'toilet-management/maintenance/:id', label: 'Maintenance Details', parentPath: 'toilet-management/maintenance' },
  { path: 'toilet-management/staff', label: 'Staff Assignment', parentPath: 'toilet-management' },
  { path: 'toilet-management/facilities/:id/staff', label: 'Staff', parentPath: 'toilet-management/facilities' },
  { path: 'toilet-management/reports', label: 'Reports', parentPath: 'toilet-management' },
  { path: 'mrf', label: 'MRF Management', parentPath: 'dashboard' },
  { path: 'mrf/management', label: 'MRF Centers', parentPath: 'mrf' },
  { path: 'mrf/worker-assignment', label: 'Worker Assignment', parentPath: 'mrf' },
  { path: 'mrf/facilities/new', label: 'Add MRF Center', parentPath: 'mrf/management' },
  { path: 'mrf/facilities/:id', label: 'MRF Details', parentPath: 'mrf/management' },
  { path: 'mrf/reports', label: 'MRF Reports', parentPath: 'mrf' },
  { path: 'gaushala', label: 'Gaushala Management', parentPath: 'dashboard' },
  { path: 'gaushala/management', label: 'Gaushala Dashboard', parentPath: 'gaushala' },
  { path: 'gaushala/facilities', label: 'Gaushala Facilities', parentPath: 'gaushala' },
  { path: 'gaushala/facilities/new', label: 'Add Gaushala', parentPath: 'gaushala/facilities' },
  { path: 'gaushala/facilities/:id', label: 'Gaushala Details', parentPath: 'gaushala/facilities' },
  { path: 'gaushala/facilities/:id/cattle', label: 'Cattle Management', parentPath: 'gaushala/facilities' },
  { path: 'gaushala/all-cattle', label: 'All Cattle', parentPath: 'gaushala' },
  { path: 'gaushala/all-cattle/new', label: 'Add Cattle', parentPath: 'gaushala/all-cattle' },
  { path: 'gaushala/inspections', label: 'Inspections', parentPath: 'gaushala' },
  { path: 'gaushala/inspections/new', label: 'New Inspection', parentPath: 'gaushala/inspections' },
  { path: 'gaushala/inspections/:id', label: 'Inspection Details', parentPath: 'gaushala/inspections' },
  { path: 'gaushala/feeding', label: 'Feeding', parentPath: 'gaushala' },
  { path: 'gaushala/complaints', label: 'Complaints', parentPath: 'gaushala' },
  { path: 'gaushala/reports', label: 'Reports', parentPath: 'gaushala' },
  { path: 'notifications', label: 'Notifications', parentPath: 'dashboard' }
];

export function getSbmBreadcrumbs(pathname) {
  const prefix = '/sbm';
  const clean = (pathname || '').replace(/\/+$/, '');
  const [pathOnly, search = ''] = clean.split('?');
  const rest = pathOnly.replace(/^\/sbm\/?/, '') || 'dashboard';

  // Special: Demands breadcrumb flow depends on module filter
  // Example: /sbm/demands?module=PROPERTY -> Tax Management → Property Tax → Demands
  if (rest === 'demands' || rest.startsWith('demands/')) {
    const sp = new URLSearchParams(search);
    const mod = (sp.get('module') || '').toUpperCase();
    const parent =
      mod === 'PROPERTY' ? 'property-tax' :
      mod === 'WATER' ? 'water-tax' :
      mod === 'SHOP' ? 'shop-tax' :
      mod === 'D2DC' ? 'tax-management/d2dc' :
      'tax-management';
    const routes = sbmRoutes.map((r) => {
      if (r.path === 'demands') return { ...r, parentPath: parent };
      return r;
    });
    return buildBreadcrumbsForRole(rest, prefix, routes, {});
  }

  // Special: Payments breadcrumb flow depends on module filter
  if (rest === 'payments' || rest.startsWith('payments/')) {
    const sp = new URLSearchParams(search);
    const mod = (sp.get('module') || '').toUpperCase();
    const parent =
      mod === 'PROPERTY' ? 'property-tax' :
      mod === 'WATER' ? 'water-tax' :
      mod === 'SHOP' ? 'shop-tax' :
      mod === 'D2DC' ? 'tax-management/d2dc' :
      'tax-management';
    const routes = sbmRoutes.map((r) => {
      if (r.path === 'payments') return { ...r, parentPath: parent };
      return r;
    });
    return buildBreadcrumbsForRole(rest, prefix, routes, {});
  }

  // Special: Notices breadcrumb flow depends on module filter
  if (rest === 'notices' || rest.startsWith('notices/')) {
    const sp = new URLSearchParams(search);
    const mod = (sp.get('module') || '').toUpperCase();
    const parent =
      mod === 'PROPERTY' ? 'property-tax' :
      mod === 'WATER' ? 'water-tax' :
      mod === 'SHOP' ? 'shop-tax' :
      mod === 'D2DC' ? 'tax-management/d2dc' :
      'tax-management';
    const routes = sbmRoutes.map((r) => {
      if (r.path === 'notices') return { ...r, parentPath: parent };
      return r;
    });
    return buildBreadcrumbsForRole(rest, prefix, routes, {});
  }

  return buildBreadcrumbsForRole(rest, prefix, sbmRoutes, {});
}

/**
 * Returns breadcrumb items for current pathname (all roles).
 * Normalizes pathname (trim trailing slash) so links and matching work correctly.
 */
export function getBreadcrumbs(pathname) {
  const normalized = (pathname || '').replace(/\/+$/, '');
  const normalizedPathOnly = normalized.split('?')[0];
  const p = normalized.replace(/^\/+/, '');
  if (p.startsWith('citizen/') || p === 'citizen') return getCitizenBreadcrumbs(normalizedPathOnly);
  if (p.startsWith('collector/') || p === 'collector') return getCollectorBreadcrumbs(normalizedPathOnly);
  if (p.startsWith('clerk/') || p === 'clerk') return getClerkBreadcrumbs(normalizedPathOnly);
  if (p.startsWith('inspector/') || p === 'inspector') return getInspectorBreadcrumbs(normalizedPathOnly);
  if (p.startsWith('officer/') || p === 'officer') return getOfficerBreadcrumbs(normalizedPathOnly);
  if (p.startsWith('account-officer/') || p === 'account-officer') return getAccountOfficerBreadcrumbs(normalizedPathOnly);
  if (p.startsWith('supervisor/') || p === 'supervisor') return getSupervisorBreadcrumbs(normalizedPathOnly);
  if (p.startsWith('eo/') || p === 'eo') return getEoBreadcrumbs(normalizedPathOnly);
  if (p.startsWith('sfi/') || p === 'sfi') return getSfiBreadcrumbs(normalizedPathOnly);
  // SBM needs query params for module-based breadcrumb flow, so pass full string
  if (p.startsWith('sbm/') || p === 'sbm') return getSbmBreadcrumbs(normalized);
  return getAdminBreadcrumbs(normalizedPathOnly);
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
    'water/bills': 'Water Bill Details',
    'water/payments': 'Water Payment Receipt',
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
