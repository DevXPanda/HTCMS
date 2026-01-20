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
    const token = localStorage.getItem('token');
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
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';

      // Only clear token for authentication endpoint failures
      // This means the token itself is invalid/expired
      if (url.includes('/auth/me')) {
        console.warn('Token invalid, clearing authentication');
        localStorage.removeItem('token');
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
  login: (email, password, location) => api.post('/auth/login', { email, password, ...location }),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { currentPassword, newPassword })
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
  getByProperty: (propertyId) => api.get(`/assessments/property/${propertyId}`)
};

// Demand API
export const demandAPI = {
  getAll: (params) => api.get('/demands', { params }),
  getById: (id) => api.get(`/demands/${id}`),
  create: (data) => api.post('/demands', data),
  createD2DC: (data) => api.post('/demands/d2dc', data),
  generateBulk: (data) => api.post('/demands/generate-bulk', data),
  calculatePenalty: (id, data) => api.put(`/demands/${id}/calculate-penalty`, data),
  getByProperty: (propertyId) => api.get(`/demands/property/${propertyId}`),
  getStatistics: (params) => api.get('/demands/statistics/summary', { params })
};

// Payment API
export const paymentAPI = {
  getAll: (params) => api.get('/payments', { params }),
  getById: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post('/payments', data),
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
  getCollectorDashboard: (collectorId) => api.get(`/wards/collector/${collectorId}/dashboard`)
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
  getNoticeById: (id) => api.get(`/citizen/notices/${id}`)
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
  getFollowUps: (params) => api.get('/field-monitoring/follow-ups', { params })
};

export default api;
