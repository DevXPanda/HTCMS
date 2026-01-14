import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: '/api',
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
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
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
  verifyOnlinePayment: (data) => api.post('/payments/online/verify', data)
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
  getPayments: (params) => api.get('/citizen/payments', { params })
};

export default api;
