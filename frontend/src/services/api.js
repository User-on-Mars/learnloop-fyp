import axios from 'axios';
import { auth } from '../firebase.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Logger utility
const logger = {
  request: (config) => {
    console.group(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    console.log('URL:', `${config.baseURL}${config.url}`);
    console.log('Method:', config.method?.toUpperCase());
    if (config.params && Object.keys(config.params).length > 0) {
      console.log('Params:', config.params);
    }
    if (config.data) {
      console.log('Body:', config.data);
    }
    console.log('Headers:', {
      ...config.headers,
      Authorization: config.headers?.Authorization ? '[REDACTED]' : undefined
    });
    console.groupEnd();
  },
  response: (response) => {
    console.group(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`);
    console.log('Status:', response.status, response.statusText);
    console.log('Data:', response.data);
    console.groupEnd();
  },
  error: (error) => {
    console.group(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
    console.log('Status:', error.response?.status, error.response?.statusText);
    console.log('Error Message:', error.message);
    if (error.response?.data) {
      console.log('Error Data:', error.response.data);
    }
    console.groupEnd();
  }
};

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
    } else {
      console.warn('⚠️ No authenticated user found for API request');
    }
  } catch (error) {
    console.error('Error getting Firebase token:', error);
  }
  
  // Log the request
  logger.request(config);
  
  return config;
});

// Handle responses and errors with logging
api.interceptors.response.use(
  (response) => {
    logger.response(response);
    return response;
  },
  (error) => {
    logger.error(error);
    
    if (error.response?.status === 401) {
      // Token expired or invalid
      console.warn('⚠️ Authentication failed - redirecting to login');
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

// Active Sessions API
export const activeSessionAPI = {
  // Get all active sessions for user
  getSessions: () => api.get('/active-sessions'),
  
  // Create new active session
  createSession: (data) => api.post('/active-sessions', data),
  
  // Update active session
  updateSession: (id, data) => api.put(`/active-sessions/${id}`, data),
  
  // Delete specific active session
  deleteSession: (id) => api.delete(`/active-sessions/${id}`),
  
  // Delete all active sessions
  deleteAllSessions: () => api.delete('/active-sessions'),
};

export default api;