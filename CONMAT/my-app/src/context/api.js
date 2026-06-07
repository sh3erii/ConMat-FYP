/// ============================================================
//  src/services/api.js
//  Day 2 update – Vite-safe Axios instance with JWT interceptor
//  Owner: Talha Tariq (077019)
// ============================================================
import axios from 'axios';

const getBaseURL = () => {
  const viteUrl = import.meta.env?.VITE_API_URL;
  const craUrl = typeof process !== 'undefined' ? process.env?.REACT_APP_API_URL : undefined;
  return viteUrl || craUrl || 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('conmat_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('conmat_token');
      localStorage.removeItem('conmat_user');

      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?session=expired';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
