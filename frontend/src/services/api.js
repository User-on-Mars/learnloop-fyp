import axios from 'axios';
import { auth } from '../firebase.js';

/** Ensure requests hit /api/... even when VITE_API_URL omits /api (avoids 404 on POST /skill-maps). */
function normalizeApiBase(envUrl) {
  const fallback = 'http://localhost:4000/api';
  if (envUrl == null || String(envUrl).trim() === '') return fallback;
  const trimmed = String(envUrl).trim().replace(/\/+$/, '');
  if (trimmed === '') return fallback;
  if (/\/api$/i.test(trimmed)) return trimmed;
  return `${trimmed}/api`;
}

const API_BASE_URL = normalizeApiBase(import.meta.env.VITE_API_URL);

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

// Skills API (for dashboard)
export const skillsAPI = {
  getAll: () => api.get('/skills'),
  getById: (id) => api.get(`/skills/${id}`),
  getNodes: (skillId) => api.get(`/skills/${skillId}/nodes`),
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

// Node Progression API
export const nodeProgressionAPI = {
  // Complete a node and trigger progression
  completeNode: (skillId, nodeId, reflectionData) => 
    api.post(`/skills/${skillId}/nodes/${nodeId}/complete`, { reflectionData }),
  
  // Get linear progression path for skill
  getProgressionPath: (skillId) => 
    api.get(`/skills/${skillId}/progression-path`),
  
  // Get all nodes for a skill with current status
  getSkillNodes: (skillId) => 
    api.get(`/skills/${skillId}/nodes`),
};

// Session Management API
export const sessionAPI = {
  // Start a new learning session
  startSession: (nodeId, skillId) => 
    api.post('/sessions/start', { nodeId, skillId }),
  
  // Update session progress
  updateProgress: (sessionId, progress, action, metadata) => 
    api.put(`/sessions/${sessionId}/progress`, { progress, action, metadata }),
  
  // Complete session with reflection
  completeSession: (sessionId, reflectionData) => 
    api.post(`/sessions/${sessionId}/complete`, { reflection: reflectionData }),
  
  // Get current active session
  getActiveSession: () => 
    api.get('/sessions/active'),
  
  // Get session history for node
  getSessionHistory: (nodeId) => 
    api.get(`/sessions/history/${nodeId}`),
  
  // Recover and resume abandoned session
  recoverSession: (sessionId) => 
    api.post(`/sessions/${sessionId}/recover`),
  
  // Manually abandon session
  abandonSession: (sessionId) => 
    api.post(`/sessions/${sessionId}/abandon`),
};

// Skill Map API
export const skillMapAPI = {
  // Create new skill map
  createSkillMap: (data) => 
    api.post('/skills/maps', data),
  
  // Get all skill maps for user
  getAllSkillMaps: () => 
    api.get('/skill-maps'),
  
  // Get skill map configuration
  getConfig: (skillMapId) => 
    api.get(`/skill-maps/${skillMapId}/config`),
  
  // Update skill map theme
  updateTheme: (skillMapId, theme) => 
    api.put(`/skill-maps/${skillMapId}/theme`, { theme }),
  
  // Toggle skill map activation
  toggleActivation: (skillMapId, isActive) => 
    api.put(`/skill-maps/${skillMapId}/activate`, { isActive }),
};

// XP API
export const xpAPI = {
  getProfile: () => api.get('/xp/profile'),
  getTransactions: (params = {}) => api.get('/xp/transactions', { params }),
};

// Leaderboard API
export const leaderboardAPI = {
  getWeekly: (page = 1) => api.get('/leaderboard/weekly', { params: { page } }),
  getStreaks: (page = 1) => api.get('/leaderboard/streaks', { params: { page } }),
  getAllTime: (page = 1) => api.get('/leaderboard/all-time', { params: { page } }),
  getMyRanks: () => api.get('/leaderboard/my-ranks'),
};

export default api;