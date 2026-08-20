import axios from 'axios';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 10_000,
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('scenario-db.access-token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
