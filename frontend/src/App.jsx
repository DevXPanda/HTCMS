import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import AdminLayout from './components/AdminLayout';
import CitizenLayout from './components/CitizenLayout';
import CollectorLayout from './components/CollectorLayout';
import RoleBasedRedirect from './components/RoleBasedRedirect';

// Auth Pages
import AdminLogin from './pages/auth/AdminLogin';
import CollectorLogin from './pages/auth/CollectorLogin';
import CitizenLogin from './pages/auth/CitizenLogin';
import Register from './pages/auth/Register';

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
import Reports from './pages/admin/reports/Reports';
import AuditLogs from './pages/admin/auditLogs/AuditLogs';
import Attendance from './pages/admin/attendance/Attendance';
import FieldMonitoring from './pages/admin/fieldMonitoring/FieldMonitoring';
import WaterConnections from './pages/admin/water/WaterConnections';
import WaterConnectionDetails from './pages/admin/water/WaterConnectionDetails';
import WaterBills from './pages/admin/water/WaterBills';
import WaterTaxAssessments from './pages/admin/water/WaterTaxAssessments';
import AddWaterTaxAssessment from './pages/admin/water/AddWaterTaxAssessment';
import WaterTaxAssessmentDetails from './pages/admin/water/WaterTaxAssessmentDetails';
import WaterConnectionRequests from './pages/admin/water/WaterConnectionRequests';

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

// Error Pages
import Unauthorized from './pages/Unauthorized';

// Shared Pages (used by both admin and citizen)
// Note: DemandDetails, OnlinePayment, and PaymentDetails are shared

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          {/* Public Routes - Separate Login Pages */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/register" element={<Register />} />
          <Route path="/collector/login" element={<CollectorLogin />} />
          <Route path="/collector/register" element={<Register />} />
          <Route path="/citizen/login" element={<CitizenLogin />} />
          <Route path="/citizen/register" element={<Register />} />
          <Route path="/register" element={<Register />} />
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

            {/* Reports */}
            <Route path="reports" element={<Reports />} />

            {/* Audit Logs */}
            <Route path="audit-logs" element={<AuditLogs />} />

            {/* Attendance */}
            <Route path="attendance" element={<Attendance />} />

            {/* Field Monitoring */}
            <Route path="field-monitoring" element={<FieldMonitoring />} />

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
              <PrivateRoute allowedRoles={['collector', 'tax_collector']}>
                <CollectorLayout />
              </PrivateRoute>
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
          </Route>

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
            <Route path="notices" element={<CitizenNotices />} />
            <Route path="notices/:id" element={<CitizenNoticeDetails />} />
            <Route path="payments" element={<CitizenPayments />} />
            <Route path="activity-history" element={<ActivityHistory />} />
            <Route path="payments/online/:demandId" element={<OnlinePayment />} />
            <Route path="payments/:id" element={<PaymentDetails />} />
          </Route>

          {/* 404 - Redirect based on role */}
          <Route path="*" element={<RoleBasedRedirect />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
