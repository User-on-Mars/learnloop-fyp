import axios from 'axios';
import { auth } from '../firebase.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add Firebase ID token to requests if user is authenticated
api.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error getting Firebase token:', error);
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  forgotPassword: (email) => api.post('/auth/forgot', { email }),
  resetPassword: (token, password) => api.post('/auth/reset', { token, password }),
};

// Practice API
export const practiceAPI = {
  // Get practice sessions with optional filters
  getPractices: (params = {}) => api.get('/practice', { params }),
  
  // Create new practice session
  createPractice: (data) => api.post('/practice', data),
  
  // Get specific practice session
  getPractice: (id) => api.get(`/practice/${id}`),
  
  // Update practice session
  updatePractice: (id, data) => api.put(`/practice/${id}`, data),
  
  // Delete practice session
  deletePractice: (id) => api.delete(`/practice/${id}`),
  
  // Get practice statistics
  getStats: () => api.get('/practice/stats/summary'),
  
  // Get weekly practice data for charts
  getWeeklyStats: (weeks = 12) => api.get('/practice/stats/weekly', { params: { weeks } }),
};

export default api;