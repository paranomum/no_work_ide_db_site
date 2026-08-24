import axios from 'axios';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 10_000,
  withCredentials: true, // отправлять сессионную cookie на бек
});

// Если сессия истекла — бек вернёт 401, кидаем на /login
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('scenario-db.user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
