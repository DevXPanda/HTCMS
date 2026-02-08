import axios from 'axios';

// Get API URL from environment variable
// In development: VITE_API_URL=http://localhost:5000
// In production: VITE_API_URL=https://htcms-2.onrender.com
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Create axios instance with environment-based base URL
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    // Try staff token first (for staff routes)
    let token = localStorage.getItem('staffToken') || localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';

      // Only clear token for authentication endpoint failures
      // This means token itself is invalid/expired
      if (url.includes('/auth/me') || url.includes('/employee-auth/profile')) {
        console.warn('Token invalid, clearing authentication');
        localStorage.removeItem('token');
        localStorage.removeItem('staffToken');
        localStorage.removeItem('role');
        localStorage.removeItem('user');
        localStorage.removeItem('userType');
        // Don't redirect here - let AuthContext handle it through PrivateRoute
      }
      // For other 401 errors (like permission denied on data endpoints),
      // don't clear token - it's still valid, just insufficient permissions
      // The component should handle these errors gracefully
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (emailOrPhone, password, location) => {
    // Determine if input is email or phone number
    const isEmail = emailOrPhone.includes('@');
    const loginData = isEmail
      ? { email: emailOrPhone, password, ...location }
      : { phone: emailOrPhone, password, ...location };
    return api.post('/auth/login', loginData);
  },
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { currentPassword, newPassword })
};

// Staff Authentication API (for clerk, inspector, officer, collector)
export const staffAuthAPI = {
  login: (login_identifier, password) => {
    return api.post('/employee-auth/login', { identifier: login_identifier, password });
  },
  logout: () => api.post('/employee-auth/logout'),
  getProfile: () => api.get('/employee-auth/profile'),
  changePassword: (currentPassword, newPassword) =>
    api.post('/employee-auth/change-password', { currentPassword, newPassword }),
  updateProfile: (data) => api.put('/employee-auth/profile', data)
};

// User API
export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getCollectors: () => api.get('/users/collectors')
};

// Property API
export const propertyAPI = {
  getAll: (params) => api.get('/properties', { params }),
  getById: (id) => api.get(`/properties/${id}`),
  create: (data) => api.post('/properties', data),
  update: (id, data) => api.put(`/properties/${id}`, data),
  delete: (id) => api.delete(`/properties/${id}`),
  search: (params) => api.get('/properties/search', { params }),
  getByWard: (wardId, params) => api.get(`/properties/ward/${wardId}`, { params })
};

// Assessment API
export const assessmentAPI = {
  getAll: (params) => api.get('/assessments', { params }),
  getById: (id) => api.get(`/assessments/${id}`),
  create: (data) => api.post('/assessments', data),
  update: (id, data) => api.put(`/assessments/${id}`, data),
  submit: (id) => api.post(`/assessments/${id}/submit`),
  approve: (id, data) => api.post(`/assessments/${id}/approve`, data),
  reject: (id, data) => api.post(`/assessments/${id}/reject`, data),
  getByProperty: (propertyId) => api.get(`/assessments/property/${propertyId}`),
  generateUnified: (data) => api.post('/assessments/generate-unified', data)
};

// Demand API
export const demandAPI = {
  getAll: (params) => api.get('/demands', { params }),
  getById: (id) => api.get(`/demands/${id}`),
  create: (data) => api.post('/demands', data),
  createD2DC: (data) => api.post('/demands/d2dc', data),
  generateBulk: (data) => api.post('/demands/generate-bulk', data),
  generateCombined: (data) => api.post('/demands/generate-combined', data),
  generateUnified: (data) => api.post('/demands/generate-unified', data),
  calculatePenalty: (id, data) => api.put(`/demands/${id}/calculate-penalty`, data),
  getByProperty: (propertyId) => api.get(`/demands/property/${propertyId}`),
  getStatistics: (params) => api.get('/demands/statistics/summary', { params }),
  getBreakdown: (id) => api.get(`/demands/${id}/breakdown`)
};

// Tax API (Unified Tax Summary)
export const taxAPI = {
  getUnifiedSummary: (params) => api.get('/tax/unified-summary', { params })
};

// Payment API
export const paymentAPI = {
  getAll: (params) => api.get('/payments', { params }),
  getById: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post('/payments', data),
  createFieldCollection: (data) => api.post('/payments/field-collection', data),
  getReceipt: (receiptNumber) => api.get(`/payments/receipt/${receiptNumber}`),
  getStatistics: (params) => api.get('/payments/statistics/summary', { params }),
  getByDemand: (demandId) => api.get(`/payments/demand/${demandId}`),
  createOnlineOrder: (data) => api.post('/payments/online/create-order', data),
  verifyOnlinePayment: (data) => api.post('/payments/online/verify', data),
  generateReceiptPdf: (id) => api.post(`/payments/${id}/generate-receipt`),
  downloadReceiptPdf: (filename) => api.get(`/payments/receipts/${filename}`, { responseType: 'blob' })
};

// Ward API
export const wardAPI = {
  getAll: (params) => api.get('/wards', { params }),
  getById: (id) => api.get(`/wards/${id}`),
  create: (data) => api.post('/wards', data),
  update: (id, data) => api.put(`/wards/${id}`, data),
  assignCollector: (id, data) => api.put(`/wards/${id}/assign-collector`, data),
  delete: (id) => api.delete(`/wards/${id}`),
  getStatistics: (id) => api.get(`/wards/${id}/statistics`),
  getByCollector: (collectorId) => api.get(`/wards/collector/${collectorId}`),
  getCollectorDashboard: () => api.get('/wards/collector/dashboard')
};

// Report API
export const reportAPI = {
  getDashboard: (params) => api.get('/reports/dashboard', { params }),
  getRevenue: (params) => api.get('/reports/revenue', { params }),
  getOutstanding: (params) => api.get('/reports/outstanding', { params }),
  getWardWise: (params) => api.get('/reports/ward-wise', { params })
};

// Citizen API
export const citizenAPI = {
  getDashboard: () => api.get('/citizen/dashboard'),
  getProperties: () => api.get('/citizen/properties'),
  getDemands: (params) => api.get('/citizen/demands', { params }),
  getPayments: (params) => api.get('/citizen/payments', { params }),
  getNotices: (params) => api.get('/citizen/notices', { params }),
  getNoticeById: (id) => api.get(`/citizen/notices/${id}`),
  getWaterConnections: () => api.get('/citizen/water-connections'),
  createWaterConnectionRequest: (data) => api.post('/citizen/water-connection-requests', data),
  getWaterConnectionRequests: () => api.get('/citizen/water-connection-requests')
};

// Notice API
export const noticeAPI = {
  generate: (data) => api.post('/notices/generate', data),
  getAll: (params) => api.get('/notices', { params }),
  getById: (id) => api.get(`/notices/${id}`),
  send: (id, data) => api.post(`/notices/${id}/send`, data),
  escalate: (id, data) => api.post(`/notices/${id}/escalate`, data),
  generatePdf: (id) => api.post(`/notices/${id}/generate-pdf`),
  downloadPdf: (filename) => api.get(`/notices/pdfs/${filename}`, { responseType: 'blob' })
};

// Audit Log API
export const auditLogAPI = {
  getAll: (params) => api.get('/audit-logs', { params }),
  getById: (id) => api.get(`/audit-logs/${id}`),
  getStats: (params) => api.get('/audit-logs/stats/summary', { params })
};

// Attendance API
export const attendanceAPI = {
  getAll: (params) => api.get('/attendance', { params }),
  getById: (id) => api.get(`/attendance/${id}`),
  getStats: (params) => api.get('/attendance/stats/summary', { params })
};

// Field Visit API
export const fieldVisitAPI = {
  create: (data) => api.post('/field-visits', data),
  getAll: (params) => api.get('/field-visits', { params }),
  getById: (id) => api.get(`/field-visits/${id}`),
  getContext: (taskId) => api.get(`/field-visits/context/${taskId}`),
  getAdminDetails: (visitId) => api.get(`/field-visits/admin/${visitId}`)
};

// Upload API
export const uploadAPI = {
  uploadPropertyPhoto: (formData) => api.post('/upload/property-photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadFieldVisitPhoto: (formData) => api.post('/upload/field-visit-photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadPaymentProof: (formData) => api.post('/upload/payment-proof', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

// Task Engine API
export const taskAPI = {
  getDaily: () => api.get('/tasks/daily'),
  generate: () => api.post('/tasks/generate'),
  complete: (id, data) => api.patch(`/tasks/${id}/complete`, data)
};

// Field Monitoring API (Admin)
export const fieldMonitoringAPI = {
  getDashboard: (params) => api.get('/field-monitoring/dashboard', { params }),
  getCollectorDetails: (collectorId, params) => api.get(`/field-monitoring/collector/${collectorId}`, { params }),
  getFollowUps: (params) => api.get('/field-monitoring/follow-ups', { params }),
  getWards: () => api.get('/wards')
};

// Water Connection API
export const waterConnectionAPI = {
  getAll: (params) => api.get('/water-connections', { params }),
  getById: (id) => api.get(`/water-connections/${id}`),
  create: (data) => api.post('/water-connections', data),
  update: (id, data) => api.put(`/water-connections/${id}`, data),
  getByProperty: (propertyId) => api.get(`/water-connections/property/${propertyId}`)
};

// Water Bill API
export const waterBillAPI = {
  getAll: (params) => api.get('/water-bills', { params }),
  getById: (id) => api.get(`/water-bills/${id}`),
  generate: (data) => api.post('/water-bills/generate', data),
  getByConnection: (connectionId) => api.get(`/water-bills/connection/${connectionId}`)
};

// Water Payment API
export const waterPaymentAPI = {
  getAll: (params) => api.get('/water-payments', { params }),
  getById: (id) => api.get(`/water-payments/${id}`),
  create: (data) => api.post('/water-payments', data),
  getByBill: (billId) => api.get(`/water-payments/bill/${billId}`),
  getByConnection: (connectionId) => api.get(`/water-payments/connection/${connectionId}`)
};

// Water Tax Assessment API
export const waterTaxAssessmentAPI = {
  getAll: (params) => api.get('/water-tax-assessments', { params }),
  getById: (id) => api.get(`/water-tax-assessments/${id}`),
  create: (data) => api.post('/water-tax-assessments', data)
};

// Water Connection Document API
export const waterConnectionDocumentAPI = {
  getAll: (params) => api.get('/water-connection-documents', { params }),
  getById: (id) => api.get(`/water-connection-documents/${id}`),
  upload: (formData) => api.post('/water-connection-documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/water-connection-documents/${id}`),
  checkMandatory: (waterConnectionId) => api.get('/water-connection-documents/mandatory/check', {
    params: { waterConnectionId }
  })
};

// Water Connection Request API (Admin)
export const waterConnectionRequestAPI = {
  getAll: (params) => api.get('/water-connection-requests', { params }),
  getById: (id) => api.get(`/water-connection-requests/${id}`),
  create: (data) => api.post('/water-connection-requests', data),
  update: (id, data) => api.put(`/water-connection-requests/${id}`, data),
  submit: (id) => api.post(`/water-connection-requests/${id}/submit`),
  review: (id, data) => api.post(`/water-connection-requests/${id}/review`, data),
  delete: (id) => api.delete(`/water-connection-requests/${id}`),
  // Legacy endpoints for backward compatibility
  approve: (id, data) => api.post(`/water-connection-requests/${id}/approve`, data),
  reject: (id, data) => api.post(`/water-connection-requests/${id}/reject`, data)
};

// Clerk API
export const clerkAPI = {
  // Dashboard
  getDashboard: () => api.get('/clerk/dashboard'),

  // Wards
  getWards: () => api.get('/wards'),

  // Property Applications
  getPropertyApplications: (params) => api.get('/property-applications', { params }),
  getPropertyApplicationById: (id) => api.get(`/property-applications/${id}`),
  createPropertyApplication: (data) => api.post('/property-applications', data),
  updatePropertyApplication: (id, data) => api.put(`/property-applications/${id}`, data),
  submitPropertyApplication: (id) => api.post(`/property-applications/${id}/submit`),
  deletePropertyApplication: (id) => api.delete(`/property-applications/${id}`),

  // Water Connection Requests
  getWaterApplications: (params) => api.get('/water-connection-requests', { params }),
  getWaterApplicationById: (id) => api.get(`/water-connection-requests/${id}`),
  createWaterApplication: (data) => api.post('/water-connection-requests', data),
  updateWaterApplication: (id, data) => api.put(`/water-connection-requests/${id}`, data),
  submitWaterApplication: (id) => api.post(`/water-connection-requests/${id}/submit`),
  processWaterApplication: (id, data) => api.post(`/water-connection-requests/${id}/process`, data),
  deleteWaterApplication: (id) => api.delete(`/water-connection-requests/${id}`),

  // Water Connection Requests (new workflow)
  waterConnectionRequests: {
    getAll: (params) => api.get('/water-connection-requests', { params }),
    getById: (id) => api.get(`/water-connection-requests/${id}`),
    create: (data) => api.post('/water-connection-requests', data),
    createAndSubmit: (data) => api.post('/water-connection-requests/create-and-submit', data),
    update: (id, data) => api.put(`/water-connection-requests/${id}`, data),
    submit: (id) => api.post(`/water-connection-requests/${id}/submit`),
    delete: (id) => api.delete(`/water-connection-requests/${id}`)
  },

  // Staff Water Connections (dedicated endpoints for staff users)
  waterConnections: {
    getAll: (params) => api.get('/clerk/water-connections', { params }),
    getById: (id) => api.get(`/water-connections/${id}`),
    getDocuments: (id) => api.get('/water-connection-documents', { params: { waterConnectionId: id } }),
    create: (data) => api.post('/water-connections', data),
    update: (id, data) => api.put(`/water-connections/${id}`, data),
    getByProperty: (propertyId) => api.get(`/water-connections/property/${propertyId}`)
  },

  // Document Upload
  uploadDocument: (formData) => api.post('/water-connection-documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

// Inspector API
export const inspectorAPI = {
  // Dashboard
  getDashboardStats: () => api.get('/inspector/dashboard/stats'),
  getRecentInspections: () => api.get('/inspector/dashboard/recent-inspections'),

  // Property Applications
  getPendingPropertyApplications: () => api.get('/inspector/property-applications/pending'),
  getPropertyApplicationForInspection: (id) => api.get(`/inspector/property-applications/${id}/inspection`),
  processPropertyInspection: (id, data) => api.post(`/inspector/property-applications/${id}/inspect`, data),

  // Water Connection Requests
  getPendingWaterConnectionRequests: () => api.get('/inspector/water-connections/pending'),
  getWaterConnectionRequestForInspection: (id) => api.get(`/inspector/water-connections/${id}/inspection`),
  processWaterInspection: (id, data) => api.post(`/inspector/water-connections/${id}/inspect`, data),

  // Properties (read-only for inspection context)
  getWardProperties: () => api.get('/inspector/properties'),
  getPropertyDetails: (id) => api.get(`/inspector/properties/${id}`),
  getPropertyWaterConnections: (id) => api.get(`/inspector/properties/${id}/water-connections`)
};

export default api;
