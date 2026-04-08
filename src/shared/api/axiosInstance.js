import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api-inventario-ekw9.onrender.com/api/',
});

// Interceptor para agregar el token JWT siempre
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores globales (como el bloqueo de empresa)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 403) {
      const detail = error.response.data.detail || '';
      if (detail.includes('suspendido') || detail.includes('inactiva')) {
        alert("⚠️ ACCESO DENEGADO: " + detail);
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('refresh_token');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
