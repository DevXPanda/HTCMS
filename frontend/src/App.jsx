import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { StaffAuthProvider } from './contexts/StaffAuthContext';
import { NavigationProvider } from './contexts/NavigationContext';
import PrivateRoute from './components/PrivateRoute';
import { ShopTaxBasePathProvider } from './contexts/ShopTaxBasePathContext';
import AdminLayout from './components/AdminLayout';
import CitizenLayout from './components/CitizenLayout';
import CollectorLayout from './components/CollectorLayout';
import ClerkLayout from './components/ClerkLayout';
import InspectorLayout from './components/InspectorLayout';
import OfficerLayout from './components/OfficerLayout';
import EoLayout from './components/EoLayout';
import SupervisorLayout from './components/SupervisorLayout';
import RoleBasedRedirect from './components/RoleBasedRedirect';
import D2DCModule from './pages/admin/d2dc/D2DCModule';
import DiscountManagement from './pages/admin/discount/DiscountManagement';
import PenaltyWaiverManagement from './pages/admin/penaltyWaiver/PenaltyWaiverManagement';

// Auth Pages
import AdminLogin from './pages/auth/AdminLogin';
import StaffLogin from './pages/auth/StaffLogin';
import CitizenLogin from './pages/auth/CitizenLogin';
import EmployeeLogin from './pages/auth/EmployeeLogin';
import EmployeeChangePassword from './pages/auth/EmployeeChangePassword';
import Register from './pages/auth/Register';
import FileToiletComplaint from './pages/citizen/FileToiletComplaint';
import ToiletComplaintHistory from './pages/citizen/ToiletComplaintHistory';

// Admin/Staff Pages
import Dashboard from './pages/admin/Dashboard';
import Properties from './pages/admin/properties/Properties';
import PropertyDetails from './pages/admin/properties/PropertyDetails';
import AddProperty from './pages/admin/properties/AddProperty';
import EditProperty from './pages/admin/properties/EditProperty';
import Assessments from './pages/admin/assessments/Assessments';
import AssessmentDetails from './pages/admin/assessments/AssessmentDetails';
import AddAssessment from './pages/admin/assessments/AddAssessment';
import EditAssessment from './pages/admin/assessments/EditAssessment';
import Demands from './pages/admin/demands/Demands';
import DemandDetails from './pages/admin/demands/DemandDetails';
import GenerateDemands from './pages/admin/demands/GenerateDemands';
import UnifiedTaxDemand from './pages/admin/demands/UnifiedTaxDemand';
import Notices from './pages/admin/notices/Notices';
import NoticeDetails from './pages/admin/notices/NoticeDetails';
import Payments from './pages/admin/payments/Payments';
import PaymentDetails from './pages/admin/payments/PaymentDetails';
import AddPayment from './pages/admin/payments/AddPayment';
import OnlinePayment from './pages/admin/payments/OnlinePayment';
import Wards from './pages/admin/wards/Wards';
import WardDetails from './pages/admin/wards/WardDetails';
import AddWard from './pages/admin/wards/AddWard';
import Users from './pages/admin/users/Users';
import AdminManagement from './pages/admin/AdminManagement';
import Reports from './pages/admin/reports/Reports';
import AuditLogs from './pages/admin/auditLogs/AuditLogs';
import Attendance from './pages/admin/attendance/Attendance';
import FieldMonitoring from './pages/admin/fieldMonitoring/FieldMonitoring';
import FieldWorkerMonitoring from './pages/admin/FieldWorkerMonitoring';
import FieldWorkerEoDashboard from './pages/admin/FieldWorkerEoDashboard';
import AdminFieldWorkerMonitoring from './pages/admin/AdminFieldWorkerMonitoring';
import EOManagement from './pages/admin/EOManagement';
import WaterConnections from './pages/admin/water/WaterConnections';
import WaterConnectionDetails from './pages/admin/water/WaterConnectionDetails';
import WaterBills from './pages/admin/water/WaterBills';
import WaterTaxAssessments from './pages/admin/water/WaterTaxAssessments';
import AddWaterTaxAssessment from './pages/admin/water/AddWaterTaxAssessment';
import WaterTaxAssessmentDetails from './pages/admin/water/WaterTaxAssessmentDetails';
import WaterConnectionRequests from './pages/admin/water/WaterConnectionRequests';
import PropertyTaxModule from './pages/admin/PropertyTaxModule';
import WaterTaxModule from './pages/admin/WaterTaxModule';
import ShopTaxModule from './pages/admin/shop/ShopTaxModule';
import ShopsList from './pages/admin/shop/ShopsList';
import ShopDetails from './pages/admin/shop/ShopDetails';
import AddShop from './pages/admin/shop/AddShop';
import EditShop from './pages/admin/shop/EditShop';
import ShopAssessments from './pages/admin/shop/ShopAssessments';
import ShopAssessmentDetails from './pages/admin/shop/ShopAssessmentDetails';
import AddShopAssessment from './pages/admin/shop/AddShopAssessment';
import EditShopAssessment from './pages/admin/shop/EditShopAssessment';
import ShopRegistrationRequests from './pages/admin/shop/ShopRegistrationRequests';
import ShopRegistrationRequestDetails from './pages/admin/shop/ShopRegistrationRequestDetails';
import TaxManagement from './pages/admin/TaxManagement';
import ToiletManagementModule from './pages/admin/toilet/ToiletManagementModule';
import ToiletFacilities from './pages/admin/toilet/ToiletFacilities';
import ToiletDetails from './pages/admin/toilet/ToiletDetails';
import AddToilet from './pages/admin/toilet/AddToilet';
import ToiletInspections from './pages/admin/toilet/ToiletInspections';
import ToiletComplaints from './pages/admin/toilet/ToiletComplaints';
import ToiletMaintenance from './pages/admin/toilet/ToiletMaintenance';
import ToiletReports from './pages/admin/toilet/ToiletReports';
import MRFManagement from './pages/admin/mrf/MRFManagement';
import AddMRF from './pages/admin/mrf/AddMRF';
import MRFDetails from './pages/admin/mrf/MRFDetails';
import MRFReports from './pages/admin/mrf/MRFReports';
import GauShalaManagement from './pages/admin/gaushala/GauShalaManagement';
import GauShalaDashboard from './pages/admin/gaushala/GauShalaDashboard';
import GauShalaInspections from './pages/admin/gaushala/GauShalaInspections';
import GauShalaFeeding from './pages/admin/gaushala/GauShalaFeeding';
import GauShalaComplaints from './pages/admin/gaushala/GauShalaComplaints';
import GauShalaCattleTotal from './pages/admin/gaushala/GauShalaCattleTotal';
import AddGauShala from './pages/admin/gaushala/AddGauShala';
import GauShalaDetails from './pages/admin/gaushala/GauShalaDetails';
import GauShalaReports from './pages/admin/gaushala/GauShalaReports';
import CattleManagement from './pages/admin/gaushala/CattleManagement';
import AddCattle from './pages/admin/gaushala/AddCattle';
import AddGauShalaInspection from './pages/admin/gaushala/AddGauShalaInspection';
import InspectionDetail from './pages/admin/gaushala/InspectionDetail';
import AddInspection from './pages/admin/toilet/AddInspection';
import InspectionDetails from './pages/admin/toilet/InspectionDetails';
import AddMaintenance from './pages/admin/toilet/AddMaintenance';
import MaintenanceDetails from './pages/admin/toilet/MaintenanceDetails';
import ComplaintDetails from './pages/admin/toilet/ComplaintDetails';
import StaffAssignment from './pages/admin/toilet/StaffAssignment';
// import InventoryManagement from './pages/admin/inventory/InventoryManagement';
// import UtilityTracking from './pages/admin/utility/UtilityTracking';
// import FeedbackList from './pages/admin/feedback/FeedbackList';

import ToiletComplaintsSupervisor from './pages/supervisor/ToiletComplaintsSupervisor';

// Citizen Pages
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import CitizenProperties from './pages/citizen/CitizenProperties';
import CitizenPropertyDetails from './pages/citizen/CitizenPropertyDetails';
import CitizenDemands from './pages/citizen/CitizenDemands';
import CitizenNotices from './pages/citizen/CitizenNotices';
import CitizenNoticeDetails from './pages/citizen/CitizenNoticeDetails';
import CitizenPayments from './pages/citizen/CitizenPayments';
import ActivityHistory from './pages/citizen/ActivityHistory';
import CitizenWaterConnections from './pages/citizen/CitizenWaterConnections';
import WaterConnectionRequest from './pages/citizen/WaterConnectionRequest';
import CitizenShops from './pages/citizen/CitizenShops';
import CitizenShopDetails from './pages/citizen/CitizenShopDetails';
import CitizenShopRegistrationRequests from './pages/citizen/CitizenShopRegistrationRequests';
import ShopRegistrationRequest from './pages/citizen/ShopRegistrationRequest';

// Collector Pages
import CollectorDashboard from './pages/collector/CollectorDashboard';
import AssignedWards from './pages/collector/AssignedWards';
import PropertyList from './pages/collector/PropertyList';
import CollectorPropertyDetails from './pages/collector/CollectorPropertyDetails';
import Collections from './pages/collector/Collections';
import ActivityLogs from './pages/collector/ActivityLogs';
import CollectorAttendance from './pages/collector/Attendance';
import DailyTasks from './pages/collector/DailyTasks';
import RecordFieldVisit from './pages/collector/RecordFieldVisit';
import TaxSummarySimple from './pages/collector/TaxSummarySimple';
import CollectorDemandDetails from './pages/collector/CollectorDemandDetails';

// Clerk Pages
import ClerkDashboard from './pages/clerk/ClerkDashboard';
import PropertyApplications from './pages/clerk/PropertyApplications';
import NewPropertyApplication from './pages/clerk/NewPropertyApplication';
import WaterApplications from './pages/clerk/WaterApplications';
import NewWaterApplication from './pages/clerk/NewWaterApplication';
import ReturnedApplications from './pages/clerk/ReturnedApplications';
import ClerkActivityHistory from './pages/clerk/ActivityHistory';
import PropertyApplicationDetails from './pages/clerk/PropertyApplicationDetails';
import EditPropertyApplication from './pages/clerk/EditPropertyApplication';
import WaterApplicationDetails from './pages/clerk/WaterApplicationDetails';
import EditWaterApplication from './pages/clerk/EditWaterApplication';
import ClerkProperties from './pages/clerk/Properties';
import ClerkPropertyDetails from './pages/clerk/PropertyDetails';
import ClerkWaterConnections from './pages/clerk/WaterConnections';
import ClerkWaterConnectionDetails from './pages/clerk/WaterConnectionDetails';
import ClerkExistingWaterConnections from './pages/clerk/ExistingWaterConnections';
import ClerkAttendance from './pages/clerk/Attendance';

// Inspector Pages
import InspectorDashboard from './pages/inspector/Dashboard';
import PropertyApplicationsInspection from './pages/inspector/PropertyApplications';
import PropertyApplicationInspection from './pages/inspector/PropertyApplicationInspection';
import WaterConnectionsInspection from './pages/inspector/WaterConnections';
import WaterConnectionInspection from './pages/inspector/WaterConnectionInspection';
import RecentInspections from './pages/inspector/RecentInspections';
import InspectorProperties from './pages/inspector/Properties';
import InspectorPropertyDetails from './pages/inspector/PropertyDetails';
import InspectorAttendance from './pages/inspector/Attendance';

// Officer Pages
import EoDashboard from './pages/eo/EoDashboard';
import WorkerManagement from './pages/eo/WorkerManagement';
import SupervisorDashboard from './pages/supervisor/SupervisorDashboard';
import OfficerDashboard from './pages/officer/OfficerDashboard';
import OfficerPropertyApplications from './pages/officer/PropertyApplications';
import OfficerWaterRequests from './pages/officer/WaterRequests';
import WaterRequestDetails from './pages/officer/WaterRequestDetails';
import OfficerDecisionHistory from './pages/officer/DecisionHistory';
import OfficerAttendance from './pages/officer/Attendance';

// Error Pages
import Unauthorized from './pages/Unauthorized';

// Shared Pages (used by both admin and citizen)
// Note: DemandDetails, OnlinePayment, and PaymentDetails are shared

function App() {
  return (
    <NavigationProvider>
      <AuthProvider>
        <Router>
          <Toaster position="top-right" />
          <Routes>
            {/* Public Routes - Separate Login Pages */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/register" element={<Register />} />
            <Route
              path="/staff/login"
              element={
                <StaffAuthProvider>
                  <StaffLogin />
                </StaffAuthProvider>
              }
            />
            < Route path="/citizen/login" element={< CitizenLogin />} />
            < Route path="/employee/login" element={< EmployeeLogin />} />
            < Route path="/employee/change-password" element={< EmployeeChangePassword />} />
            < Route path="/register" element={< Register />} />
            {/* Redirect old login pages to new unified staff login */}
            <Route path="/collector/login" element={<Navigate to="/staff/login" replace />} />
            <Route path="/collector/register" element={<Navigate to="/register" replace />} />
            <Route path="/clerk/login" element={<Navigate to="/staff/login" replace />} />
            <Route path="/inspector/login" element={<Navigate to="/staff/login" replace />} />
            <Route path="/officer/login" element={<Navigate to="/staff/login" replace />} />
            {/* Redirect old /login to citizen login for backward compatibility */}
            <Route path="/login" element={<Navigate to="/citizen/login" replace />} />

            {/* Unauthorized Page */}
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protected Routes - Admin/Staff (admin, assessor, cashier) */}
            <Route
              path="/"
              element={
                <PrivateRoute allowedRoles={['admin', 'assessor', 'cashier']}>
                  <AdminLayout />
                </PrivateRoute>
              }
            >
              <Route index element={<RoleBasedRedirect />} />
              <Route path="dashboard" element={<Dashboard />} />
              {/* New Modules */}
              <Route path="tax-management" element={<TaxManagement />} />
              <Route path="tax/discount-management" element={<DiscountManagement />} />
              <Route path="tax/penalty-waiver" element={<PenaltyWaiverManagement />} />
              <Route path="property-tax" element={<PropertyTaxModule />} />
              <Route path="water-tax" element={<WaterTaxModule />} />
              <Route path="shop-tax" element={<ShopTaxModule />} />
              <Route path="shop-tax/shops" element={<ShopsList />} />
              <Route path="shop-tax/shops/new" element={<AddShop />} />
              <Route path="shop-tax/shops/:id" element={<ShopDetails />} />
              <Route path="shop-tax/shops/:id/edit" element={<EditShop />} />
              <Route path="shop-tax/assessments" element={<ShopAssessments />} />
              <Route path="shop-tax/assessments/new" element={<AddShopAssessment />} />
              <Route path="shop-tax/assessments/:id" element={<ShopAssessmentDetails />} />
              <Route path="shop-tax/assessments/:id/edit" element={<EditShopAssessment />} />
              <Route path="shop-tax/registration-requests" element={<ShopRegistrationRequests />} />
              <Route path="shop-registration-requests" element={<ShopRegistrationRequests />} />
              <Route path="shop-registration-requests/:id" element={<ShopRegistrationRequestDetails />} />

              {/* Toilet Management Module */}
              <Route path="toilet-management" element={<ToiletManagementModule />} />
              <Route path="toilet-management/facilities" element={<ToiletFacilities />} />
              <Route path="toilet-management/facilities/new" element={<AddToilet />} />
              <Route path="toilet-management/facilities/:id" element={<ToiletDetails />} />
              <Route path="toilet-management/facilities/:id/edit" element={<AddToilet />} />
              <Route path="toilet-management/inspections" element={<ToiletInspections />} />
              <Route path="toilet-management/inspections/new" element={<AddInspection />} />
              <Route path="toilet-management/inspections/:id" element={<InspectionDetails />} />
              <Route path="toilet-management/inspections/:id/edit" element={<AddInspection />} />
              <Route path="toilet-management/complaints" element={<ToiletComplaints />} />
              <Route path="toilet-management/complaints/:id" element={<ComplaintDetails />} />
              <Route path="toilet-management/maintenance" element={<ToiletMaintenance />} />
              <Route path="toilet-management/maintenance/new" element={<AddMaintenance />} />
              <Route path="toilet-management/maintenance/:id" element={<MaintenanceDetails />} />
              <Route path="toilet-management/maintenance/:id/edit" element={<AddMaintenance />} />
              <Route path="toilet-management/staff" element={<StaffAssignment />} />
              <Route path="toilet-management/reports" element={<ToiletReports />} />

              {/* MRF Management */}
              <Route path="mrf/management" element={<MRFManagement />} />
              <Route path="mrf/facilities/new" element={<AddMRF />} />
              <Route path="mrf/facilities/:id" element={<MRFDetails />} />
              <Route path="mrf/facilities/:id/edit" element={<AddMRF />} />
              <Route path="mrf/reports" element={<MRFReports />} />

              {/* Gaushala Management */}
              <Route path="gaushala/management" element={<GauShalaDashboard />} />
              <Route path="gaushala/facilities" element={<GauShalaManagement />} />
              <Route path="gaushala/facilities/new" element={<AddGauShala />} />
              <Route path="gaushala/facilities/:id" element={<GauShalaDetails />} />
              <Route path="gaushala/facilities/:id/edit" element={<AddGauShala />} />
              <Route path="gaushala/facilities/:id/cattle" element={<CattleManagement />} />
              <Route path="gaushala/all-cattle" element={<GauShalaCattleTotal />} />
              <Route path="gaushala/all-cattle/new" element={<AddCattle />} />
              <Route path="gaushala/inspections" element={<GauShalaInspections />} />
              <Route path="gaushala/inspections/new" element={<AddGauShalaInspection />} />
              <Route path="gaushala/inspections/:id" element={<InspectionDetail />} />
              <Route path="gaushala/inspections/:id/edit" element={<AddGauShalaInspection />} />
              <Route path="gaushala/feeding" element={<GauShalaFeeding />} />
              <Route path="gaushala/complaints" element={<GauShalaComplaints />} />
              <Route path="gaushala/reports" element={<GauShalaReports />} />

              {/* Properties */}
              <Route path="properties" element={<Properties />} />
              <Route path="properties/new" element={<AddProperty />} />
              <Route path="properties/:id" element={<PropertyDetails />} />
              <Route path="properties/:id/edit" element={<EditProperty />} />

              {/* Assessments */}
              <Route path="assessments" element={<Assessments />} />
              <Route path="assessments/new" element={<AddAssessment />} />
              <Route path="assessments/:id" element={<AssessmentDetails />} />
              <Route path="assessments/:id/edit" element={<EditAssessment />} />

              {/* Demands */}
              <Route path="demands" element={<Demands />} />
              <Route path="demands/generate" element={<GenerateDemands />} />
              <Route path="demands/unified" element={<UnifiedTaxDemand />} />
              <Route path="demands/:id" element={<DemandDetails />} />

              {/* Notices */}
              <Route path="notices" element={<Notices />} />
              <Route path="notices/:id" element={<NoticeDetails />} />

              {/* Payments */}
              <Route path="payments" element={<Payments />} />
              <Route path="payments/new" element={<AddPayment />} />
              <Route path="payments/online/:demandId" element={<OnlinePayment />} />
              <Route path="payments/:id" element={<PaymentDetails />} />

              {/* Wards */}
              <Route path="wards" element={<Wards />} />
              <Route path="wards/new" element={<AddWard />} />
              <Route path="wards/:id" element={<WardDetails />} />

              {/* Users (Collector Management) */}
              <Route path="users" element={<Users />} />

              {/* Admin Management */}
              <Route path="admin-management" element={<AdminManagement />} />

              {/* Reports */}
              <Route path="reports" element={<Reports />} />

              {/* Audit Logs */}
              <Route path="audit-logs" element={<AuditLogs />} />

              {/* Attendance */}
              <Route path="attendance" element={<Attendance />} />

              {/* Field Monitoring */}
              <Route path="field-monitoring" element={<FieldMonitoring />} />

              {/* Field Worker Monitoring (EO list + EO dashboard) */}
              <Route path="field-worker-monitoring" element={<FieldWorkerMonitoring />} />
              <Route path="field-worker-monitoring/eos/:eoId/dashboard" element={<FieldWorkerEoDashboard />} />
              {/* EO Management (EO list with ULB filter) */}
              <Route path="eo-management" element={<EOManagement />} />
              {/* Admin Field Worker Monitoring (Full ULB level monitoring) */}
              <Route path="admin-field-worker-monitoring" element={<AdminFieldWorkerMonitoring />} />

              {/* Water Tax Module */}
              <Route path="water/connections" element={<WaterConnections />} />
              <Route path="water/connections/:id" element={<WaterConnectionDetails />} />
              <Route path="water/connection-requests" element={<WaterConnectionRequests />} />
              <Route path="water/assessments" element={<WaterTaxAssessments />} />
              <Route path="water/assessments/new" element={<AddWaterTaxAssessment />} />
              <Route path="water/assessments/:id" element={<WaterTaxAssessmentDetails />} />
              <Route path="water/bills" element={<WaterBills />} />
              <Route path="water/payments" element={<div className="p-6"><h1 className="text-2xl font-bold">Water Payments</h1><p className="text-gray-600 mt-2">Water payments management page - Coming soon</p></div>} />
              <Route path="water/reports" element={<div className="p-6"><h1 className="text-2xl font-bold">Water Reports</h1><p className="text-gray-600 mt-2">Water reports page - Coming soon</p></div>} />
            </Route>

            {/* Protected Routes - Collector Portal */}
            <Route
              path="/collector"
              element={
                <StaffAuthProvider>
                  <PrivateRoute allowedRoles={['collector', 'tax_collector']}>
                    <CollectorLayout />
                  </PrivateRoute>
                </StaffAuthProvider>
              }
            >
              <Route index element={<Navigate to="/collector/dashboard" replace />} />
              <Route path="dashboard" element={<CollectorDashboard />} />
              <Route path="wards" element={<AssignedWards />} />
              <Route path="properties" element={<PropertyList />} />
              <Route path="properties/:id" element={<CollectorPropertyDetails />} />
              <Route path="tax-summary" element={<TaxSummarySimple />} />
              <Route path="collections" element={<Collections />} />
              <Route path="tasks" element={<DailyTasks />} />
              <Route path="field-visit/new" element={<RecordFieldVisit />} />
              <Route path="attendance" element={<CollectorAttendance />} />
              <Route path="activity-logs" element={<ActivityLogs />} />
              <Route path="demands/:id" element={<CollectorDemandDetails />} />
            </Route>

            {/* Protected Routes - Clerk Portal */}
            <Route
              path="/clerk"
              element={
                <StaffAuthProvider>
                  <PrivateRoute allowedRoles={['clerk']}>
                    <ClerkLayout />
                  </PrivateRoute>
                </StaffAuthProvider>
              }
            >
              <Route index element={<Navigate to="/clerk/dashboard" replace />} />
              <Route path="dashboard" element={<ClerkDashboard />} />
              <Route path="property-applications" element={<PropertyApplications />} />
              <Route path="property-applications/new" element={<NewPropertyApplication />} />
              <Route path="property-applications/:id" element={<PropertyApplicationDetails />} />
              <Route path="property-applications/:id/edit" element={<EditPropertyApplication />} />
              <Route path="property-connections" element={<ClerkProperties />} />
              <Route path="properties" element={<ClerkProperties />} />
              <Route path="properties/:id" element={<ClerkPropertyDetails />} />
              <Route path="water-applications" element={<WaterApplications />} />
              <Route path="water-applications/new" element={<NewWaterApplication />} />
              <Route path="water-applications/:id" element={<WaterApplicationDetails />} />
              <Route path="water-applications/:id/edit" element={<EditWaterApplication />} />
              <Route path="water-connections" element={<ClerkWaterConnections />} />
              <Route path="water-connections/:id" element={<ClerkWaterConnectionDetails />} />
              <Route path="existing-water-connections" element={<ClerkExistingWaterConnections />} />
              <Route path="existing-water-connections/:id" element={<ClerkWaterConnectionDetails />} />
              <Route path="shop-tax" element={<ShopTaxBasePathProvider basePath="/clerk"><Outlet /></ShopTaxBasePathProvider>}>
                <Route index element={<ShopTaxModule />} />
                <Route path="shops" element={<ShopsList />} />
                <Route path="shops/new" element={<AddShop />} />
                <Route path="shops/:id" element={<ShopDetails />} />
                <Route path="shops/:id/edit" element={<EditShop />} />
                <Route path="assessments" element={<ShopAssessments />} />
                <Route path="assessments/new" element={<AddShopAssessment />} />
                <Route path="assessments/:id" element={<ShopAssessmentDetails />} />
                <Route path="assessments/:id/edit" element={<EditShopAssessment />} />
              </Route>
              <Route path="demands" element={<ShopTaxBasePathProvider basePath="/clerk"><Demands /></ShopTaxBasePathProvider>} />
              <Route path="demands/generate" element={<ShopTaxBasePathProvider basePath="/clerk"><GenerateDemands /></ShopTaxBasePathProvider>} />
              <Route path="demands/:id" element={<ShopTaxBasePathProvider basePath="/clerk"><DemandDetails /></ShopTaxBasePathProvider>} />
              <Route path="shop-registration-requests" element={<ShopRegistrationRequests />} />
              <Route path="shop-registration-requests/:id" element={<ShopRegistrationRequestDetails />} />
              <Route path="returned-applications" element={<ReturnedApplications />} />
              <Route path="attendance" element={<ClerkAttendance />} />
              <Route path="activity-history" element={<ClerkActivityHistory />} />
            </Route>

            {/* Protected Routes - Inspector Portal */}
            <Route
              path="/inspector"
              element={
                <StaffAuthProvider>
                  <PrivateRoute allowedRoles={['inspector']}>
                    <InspectorLayout />
                  </PrivateRoute>
                </StaffAuthProvider>
              }
            >
              <Route index element={<Navigate to="/inspector/dashboard" replace />} />
              <Route path="dashboard" element={<InspectorDashboard />} />
              <Route path="property-applications" element={<PropertyApplicationsInspection />} />
              <Route path="property-applications/:id/inspect" element={<PropertyApplicationInspection />} />
              <Route path="water-connections" element={<WaterConnectionsInspection />} />
              <Route path="water-connections/:id/inspect" element={<WaterConnectionInspection />} />
              <Route path="recent-inspections" element={<RecentInspections />} />
              <Route path="properties" element={<InspectorProperties />} />
              <Route path="properties/:id" element={<InspectorPropertyDetails />} />
              <Route path="attendance" element={<InspectorAttendance />} />
            </Route>

            {/* Protected Routes - EO Portal */}
            <Route
              path="/eo"
              element={
                <StaffAuthProvider>
                  <PrivateRoute allowedRoles={['eo', 'EO']}>
                    <EoLayout />
                  </PrivateRoute>
                </StaffAuthProvider>
              }
            >
              <Route index element={<Navigate to="/eo/dashboard" replace />} />
              <Route path="dashboard" element={<EoDashboard />} />
              <Route path="workers" element={<WorkerManagement />} />
            </Route>

            {/* Protected Routes - Supervisor Portal */}
            <Route
              path="/supervisor"
              element={
                <StaffAuthProvider>
                  <PrivateRoute allowedRoles={['supervisor', 'SUPERVISOR']}>
                    <SupervisorLayout />
                  </PrivateRoute>
                </StaffAuthProvider>
              }
            >
              <Route index element={<Navigate to="/supervisor/dashboard" replace />} />
              <Route path="dashboard" element={<SupervisorDashboard />} />
              <Route path="toilet-complaints" element={<ToiletComplaintsSupervisor />} />
            </Route>

            {/* Protected Routes - Officer Portal */}
            <Route
              path="/officer"
              element={
                <StaffAuthProvider>
                  <PrivateRoute allowedRoles={['officer']}>
                    <OfficerLayout />
                  </PrivateRoute>
                </StaffAuthProvider>
              }
            >
              <Route index element={<Navigate to="/officer/dashboard" replace />} />
              <Route path="dashboard" element={<OfficerDashboard />} />
              <Route path="property-applications" element={<OfficerPropertyApplications />} />
              <Route path="water-requests" element={<OfficerWaterRequests />} />
              <Route path="water-requests/:id" element={<WaterRequestDetails />} />
              <Route path="decision-history" element={<OfficerDecisionHistory />} />
              <Route path="attendance" element={<OfficerAttendance />} />
            </Route>

            {/* Protected Routes - D2DC Module */}
            <Route
              path="/tax-management/d2dc"
              element={
                <StaffAuthProvider>
                  <PrivateRoute allowedRoles={['admin', 'collector', 'tax_collector', 'inspector', 'officer']}>
                    <D2DCModule />
                  </PrivateRoute>
                </StaffAuthProvider>
              }
            />

            {/* Protected Routes - Citizen Portal */}
            <Route
              path="/citizen"
              element={
                <PrivateRoute allowedRoles={['citizen']}>
                  <CitizenLayout />
                </PrivateRoute>
              }
            >
              <Route index element={<Navigate to="/citizen/dashboard" replace />} />
              <Route path="dashboard" element={<CitizenDashboard />} />
              <Route path="properties" element={<CitizenProperties />} />
              <Route path="properties/:id" element={<CitizenPropertyDetails />} />
              <Route path="demands" element={<CitizenDemands />} />
              <Route path="demands/:id" element={<DemandDetails />} />
              <Route path="water-connections" element={<CitizenWaterConnections />} />
              <Route path="water-connection-request" element={<WaterConnectionRequest />} />
              <Route path="shops" element={<CitizenShops />} />
              <Route path="shops/:id" element={<CitizenShopDetails />} />
              <Route path="shop-registration-requests" element={<CitizenShopRegistrationRequests />} />
              <Route path="shop-registration-requests/new" element={<ShopRegistrationRequest />} />
              <Route path="shop-registration-requests/:id" element={<ShopRegistrationRequest />} />
              <Route path="notices" element={<CitizenNotices />} />
              <Route path="notices/:id" element={<CitizenNoticeDetails />} />
              <Route path="payments" element={<CitizenPayments />} />
              <Route path="activity-history" element={<ActivityHistory />} />
              <Route path="payments/online/:demandId" element={<OnlinePayment />} />
              <Route path="payments/:id" element={<PaymentDetails />} />
              <Route path="toilet/file-complaint" element={<FileToiletComplaint />} />
              <Route path="toilet/complaint-history" element={<ToiletComplaintHistory />} />
            </Route>

            {/* 404 - Redirect based on role */}
            <Route path="*" element={<RoleBasedRedirect />} />
          </Routes>
        </Router>
      </AuthProvider>
    </NavigationProvider>
  );
}

export default App;
