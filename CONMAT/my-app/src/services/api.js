// ============================================================
//  src/services/api.js
//  Central Axios instance – used by all frontend modules
// ============================================================
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' }
});

// ── Request Interceptor: attach JWT token ────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('conmat_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: handle token expiry ────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid – clear storage and go to login
      localStorage.removeItem('conmat_token');
      localStorage.removeItem('conmat_user');
      window.location.href = '/login?session=expired';
    }
    return Promise.reject(error);
  }
);

export default api;
