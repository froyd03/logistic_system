import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

// Request interceptor: attach token
API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: handle auth errors
API.interceptors.response.use(
  res => res.data,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err.response?.data || err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (data) => API.post('/auth/login', data),
  me: () => API.get('/auth/me'),
  changePassword: (data) => API.put('/auth/password', data)
};

// ─── Vehicles ─────────────────────────────────────────────────────────────────
export const vehicleAPI = {
  getAll: (params) => API.get('/vehicles', { params }),
  getById: (id) => API.get(`/vehicles/${id}`),
  getStats: () => API.get('/vehicles/stats'),
  create: (data) => API.post('/vehicles', data),
  update: (id, data) => API.put(`/vehicles/${id}`, data),
  archive: (id) => API.delete(`/vehicles/${id}`),
  getStatusHistory: (id) => API.get(`/vehicles/${id}/status-history`),
  addMaintenance: (id, data) => API.post(`/vehicles/${id}/maintenance`, data),
  uploadDocument: (id, formData) => API.post(`/vehicles/${id}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  getAllMaintenance: (params) => API.get('/maintenance', { params }),
  completeMaintenance: (vehicleId, maintenanceId, data) =>
    API.patch(`/vehicles/${vehicleId}/maintenance/${maintenanceId}/complete`, data),
  updateMaintenanceStatus: (vehicleId, maintenanceId, data) =>
    API.patch(`/vehicles/${vehicleId}/maintenance/${maintenanceId}`, data),
  computeExpiry: (registrationStartDate) =>
    API.get('/vehicles/compute-expiry', { params: { registration_start_date: registrationStartDate } })
};

// ─── Drivers ──────────────────────────────────────────────────────────────────
export const driverAPI = {
  getAll: (params) => API.get('/drivers', { params }),
  getById: (id) => API.get(`/drivers/${id}`),
  create: (data) => API.post('/drivers', data),
  update: (id, data) => API.put(`/drivers/${id}`, data),
  getPerformance: (id, params) => API.get(`/drivers/${id}/performance`, { params }),
  getIncidents: (id) => API.get(`/drivers/${id}/incidents`),
  addIncident: (id, data) => API.post(`/drivers/${id}/incidents`, data),
  updateRating: (id, data) => API.patch(`/drivers/${id}/rating`, data)
};

// ─── Reservations ─────────────────────────────────────────────────────────────
export const reservationAPI = {
  getAll: (params) => API.get('/reservations', { params }),
  getById: (id) => API.get(`/reservations/${id}`),
  create: (data) => API.post('/reservations', data),
  approve: (id, data) => API.patch(`/reservations/${id}/approve`, data),
  reject: (id, data) => API.patch(`/reservations/${id}/reject`, data),
  dispatch: (id, data) => API.post(`/reservations/${id}/dispatch`, data),
  cancel: (id, data) => API.patch(`/reservations/${id}/cancel`, data),
  completeTrip: (data) => API.post('/trips/complete', data)
};

// ─── Analytics & Costs ────────────────────────────────────────────────────────
export const analyticsAPI = {
  getDashboard: () => API.get('/dashboard/stats'),
  getMonthly: (params) => API.get('/analytics/monthly', { params }),
  addExpense: (data) => API.post('/expenses', data),
  addFuelLog: (data) => API.post('/fuel-logs', data),
  exportPDF: (params) => API.get('/reports/export-pdf', { params, responseType: 'blob' }),
  exportCSV: (params) => API.get('/reports/export-csv', { params, responseType: 'blob' })
};
