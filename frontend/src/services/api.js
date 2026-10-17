import axios from 'axios';
import { API_BASE_URL } from '../config/apiConfig';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('conmat_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || '';
    const isAuthRoute = requestUrl.includes('/auth/login')
      || requestUrl.includes('/auth/register')
      || requestUrl.includes('/auth/password/');

    if (error.response?.status === 401 && !isAuthRoute) {
      sessionStorage.removeItem('conmat_token');
      sessionStorage.removeItem('conmat_user');
      localStorage.removeItem('conmat_token');
      localStorage.removeItem('conmat_user');

      if (!error.config?.skipAuthRedirect && !window.location.pathname.includes('/login')) {
        window.location.assign('/login?session=expired');
      }
    }

    return Promise.reject(error);
  }
);

export default api;
