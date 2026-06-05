import axios from 'axios';

// In production: set VITE_API_URL in .env to your hosted backend URL
// Example: VITE_API_URL=https://payyatu-api.onrender.com
// In local dev: leave empty — Vite proxy handles /api → localhost:5000
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
