import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: attach access token ─────────────────────────────
api.interceptors.request.use((config) => {
  config.withCredentials = true;
  return config;
});

// ─── Response interceptor: auto-refresh on 401 ───────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve();
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post(`${BASE_URL}/auth/refresh/`, {}, { withCredentials: true });
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────
export const authApi = {
  login: (credentials) => api.post('/auth/login/', credentials),
  refresh: (refresh) => api.post('/auth/refresh/', { refresh }),
  me: () => api.get('/auth/me/'),
  logout: (refresh) => api.post('/auth/logout/', { refresh }),
  requestPasswordReset: (email) => api.post('/auth/password-reset/', { email }),
  confirmPasswordReset: (data) => api.post('/auth/password-reset/confirm/', data),
  auditLogs: () => api.get('/auth/audit-logs/'),
};

// ─── Clinic Signup ────────────────────────────────────────────────────────
export const clinicApi = {
  signup: (data) => api.post('/clinics/signup/', data),
  me: () => api.get('/clinics/me/'),
  update: (data) => api.patch('/clinics/me/', data),
};

// ─── Staff ────────────────────────────────────────────────────────────────
export const staffApi = {
  list: (params) => api.get('/staff/', { params }),
  invite: (data) => api.post('/staff/invite/', data),
  get: (id) => api.get(`/staff/${id}/`),
  update: (id, data) => api.patch(`/staff/${id}/`, data),
  remove: (id) => api.delete(`/staff/${id}/`),
};

// ─── Patients ─────────────────────────────────────────────────────────────
export const patientApi = {
  list: (params) => api.get('/patients/', { params }),
  search: (q) => api.get('/patients/', { params: { search: q } }),
  create: (data) => api.post('/patients/', data),
  get: (id) => api.get(`/patients/${id}/`),
  update: (id, data) => api.patch(`/patients/${id}/`, data),
  export: (id) => api.get(`/patients/${id}/export/`, { responseType: 'blob' }),
  anonymise: (id) => api.post(`/patients/${id}/anonymise/`),
};

// ─── Appointments ─────────────────────────────────────────────────────────
export const appointmentApi = {
  list: (params) => api.get('/appointments/', { params }),
  create: (data) => api.post('/appointments/', data),
  get: (id) => api.get(`/appointments/${id}/`),
  update: (id, data) => api.patch(`/appointments/${id}/`, data),
  checkIn: (id) => api.post(`/appointments/${id}/check_in/`),
  startTriage: (id) => api.post(`/appointments/${id}/start_triage/`),
  sendToDoctor: (id) => api.post(`/appointments/${id}/send_to_doctor/`),
  markNoShow: (id) => api.post(`/appointments/${id}/mark_no_show/`),
  cancel: (id) => api.post(`/appointments/${id}/cancel/`),
};

// ─── Visit Records ────────────────────────────────────────────────────────
export const visitApi = {
  create: (data) => api.post('/visit-records/', data),
  get: (id) => api.get(`/visit-records/${id}/`),
  update: (id, data) => api.patch(`/visit-records/${id}/`, data),
  history: (patientId) =>
    api.get(`/visit-records/patient/${patientId}/history/`),
  list: (params) => api.get('/visit-records/', { params }),
};

// ─── Payments ─────────────────────────────────────────────────────────────
export const paymentApi = {
  create: (data) => api.post('/payments/', data),
  list: (params) => api.get('/payments/', { params }),
};

// ─── Diagnosis Access ─────────────────────────────────────────────────────
export const diagnosisAccessApi = {
  request: (data) => api.post('/diagnosis-access-requests/', data),
  approve: (id, data) =>
    api.post(`/diagnosis-access-requests/${id}/approve/`, data),
  revoke: (id) => api.post(`/diagnosis-access-requests/${id}/revoke/`),
  list: (params) => api.get('/diagnosis-access-requests/', { params }),
};

// ─── Dashboard ────────────────────────────────────────────────────────────
export const dashboardApi = {
  today: () => api.get('/dashboard/today/'),
};

// ─── Staffing ─────────────────────────────────────────────────────────────
export const shiftApi = {
  list: (params) => api.get('/shifts/', { params }),
  create: (data) => api.post('/shifts/', data),
  checkIn: (id) => api.post(`/shifts/${id}/check_in/`),
  checkOut: (id) => api.post(`/shifts/${id}/check_out/`),
  availableDates: (staffId) => api.get('/shifts/available_dates/', { params: { staff: staffId } }),
};

export const leaveApi = {
  list: (params) => api.get('/leave/', { params }),
  create: (data) => api.post('/leave/', data),
  approve: (id) => api.post(`/leave/${id}/approve/`),
};

// ─── Inventory ────────────────────────────────────────────────────────────
export const inventoryApi = {
  list: (params) => api.get('/inventory/items/', { params }),
  create: (data) => api.post('/inventory/items/', data),
  lowStock: () => api.get('/inventory/items/low_stock/'),
  restock: (id, quantity) => api.post(`/inventory/items/${id}/restock/`, { quantity }),
  dispense: (id, quantity, visit_id) => api.post(`/inventory/items/${id}/dispense/`, { quantity, visit_id }),
  transactions: (params) => api.get('/inventory/transactions/', { params }),
};

export default api;
