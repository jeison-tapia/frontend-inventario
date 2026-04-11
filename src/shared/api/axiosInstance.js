import axios from 'axios';

const BASE_URL = 'https://api-inventario-ekw9.onrender.com/api/';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30s — necesario para el cold start de Render en plan gratuito
});

// ─────────────────────────────────────────────
// INTERCEPTOR REQUEST: agrega el token JWT
// ─────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─────────────────────────────────────────────
// INTERCEPTOR RESPONSE: auto-refresh JWT + retry
// ─────────────────────────────────────────────
let isRefreshing = false;
let refreshQueue = []; // cola de requests pendientes mientras se hace refresh

const processQueue = (error, token = null) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  refreshQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // ── 401: Token expirado → intentar renovar ──
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = sessionStorage.getItem('refresh_token');

      // Si no hay refresh_token, redirigir al login
      if (!refreshToken) {
        sessionStorage.clear();
        window.location.href = '/';
        return Promise.reject(error);
      }

      // Si ya hay un refresh en curso, encolar este request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(`${BASE_URL}token/refresh/`, {
          refresh: refreshToken,
        });
        const newAccess = res.data.access;
        sessionStorage.setItem('access_token', newAccess);
        api.defaults.headers.common['Authorization'] = `Bearer ${newAccess}`;
        processQueue(null, newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        sessionStorage.clear();
        window.location.href = '/';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ── 403: Empresa suspendida / sin permiso ──
    if (error.response?.status === 403) {
      const detail = error.response.data?.detail || '';
      if (detail.includes('suspendido') || detail.includes('inactiva')) {
        alert('⚠️ ACCESO DENEGADO: ' + detail);
        sessionStorage.clear();
        window.location.href = '/';
      }
    }

    // ── Sin respuesta (backend durmiendo o sin internet) ──
    if (!error.response && !originalRequest._retryNetwork) {
      originalRequest._retryNetwork = true;
      // Esperar 3 segundos y reintentar una vez
      await new Promise((r) => setTimeout(r, 3000));
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default api;
