import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: attach access token ─────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor: auto-refresh on 401 ───────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
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
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh/`, {
          refresh: refreshToken,
        });
        localStorage.setItem('access_token', data.access);
        api.defaults.headers.common.Authorization = `Bearer ${data.access}`;
        processQueue(null, data.access);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.clear();
        window.location.href = '/login';
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
};

// ─── Appointments ─────────────────────────────────────────────────────────
export const appointmentApi = {
  list: (params) => api.get('/appointments/', { params }),
  create: (data) => api.post('/appointments/', data),
  get: (id) => api.get(`/appointments/${id}/`),
  update: (id, data) => api.patch(`/appointments/${id}/`, data),
  checkIn: (id) => api.post(`/appointments/${id}/check_in/`),
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
};

// ─── Diagnosis Access ─────────────────────────────────────────────────────
export const diagnosisAccessApi = {
  request: (data) => api.post('/diagnosis-access-requests/', data),
  approve: (id, data) =>
    api.post(`/diagnosis-access-requests/${id}/approve/`, data),
  list: (params) => api.get('/diagnosis-access-requests/', { params }),
};

// ─── Dashboard ────────────────────────────────────────────────────────────
export const dashboardApi = {
  today: () => api.get('/dashboard/today/'),
};

export default api;
