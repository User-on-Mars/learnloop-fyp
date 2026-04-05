import axios, { type AxiosInstance } from 'axios'
import type { Mood, Session, SkillMapFull, SkillNode, NodeState, NodeType } from '../types/skillmap'
import { auth } from '../firebase.js'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

/** Builds an axios instance with Firebase auth header. */
function buildHttpClient(): AxiosInstance {
  const client = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
  })
  client.interceptors.request.use(async (config) => {
    const user = auth.currentUser
    if (user) {
      const token = await user.getIdToken()
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })
  return client
}

const client = buildHttpClient()

// ============ AUTH API ============
export const authAPI = {
  register: (data: any) => client.post('/auth/register', data),
  login: (data: any) => client.post('/auth/login', data),
  forgotPassword: (email: string) => client.post('/auth/forgot', { email }),
  resetPassword: (token: string, password: string) => 
    client.post('/auth/reset', { token, password }),
  syncProfile: (data: any) => client.post('/auth/sync-profile', data),
}

// ============ PRACTICE API ============
export const practiceAPI = {
  getPractices: (params = {}) => client.get('/practice', { params }),
  createPractice: (data: any) => client.post('/practice', data),
  getPractice: (id: string) => client.get(`/practice/${id}`),
  updatePractice: (id: string, data: any) => client.put(`/practice/${id}`, data),
  deletePractice: (id: string) => client.delete(`/practice/${id}`),
  getStats: () => client.get('/practice/stats/summary'),
  getWeeklyStats: (weeks = 12) => 
    client.get('/practice/stats/weekly', { params: { weeks } }),
}

// ============ SKILLS API ============
export const skillsAPI = {
  getAll: () => client.get('/skills'),
  getById: (id: string) => client.get(`/skills/${id}`),
  getNodes: (skillId: string) => client.get(`/skills/${skillId}/nodes`),
}

// ============ ACTIVE SESSIONS API ============
export const activeSessionAPI = {
  getSessions: () => client.get('/active-sessions'),
  createSession: (data: any) => client.post('/active-sessions', data),
  updateSession: (id: string, data: any) => client.put(`/active-sessions/${id}`, data),
  deleteSession: (id: string) => client.delete(`/active-sessions/${id}`),
  deleteAllSessions: () => client.delete('/active-sessions'),
}

// ============ NODE PROGRESSION API ============
export const nodeProgressionAPI = {
  completeNode: (skillId: string, nodeId: string, reflectionData: any) => 
    client.post(`/skills/${skillId}/nodes/${nodeId}/complete`, { reflectionData }),
  getProgressionPath: (skillId: string) => 
    client.get(`/skills/${skillId}/progression-path`),
  getSkillNodes: (skillId: string) => 
    client.get(`/skills/${skillId}/nodes`),
}

// ============ SESSION API ============
export const sessionAPI = {
  startSession: (nodeId: string, skillId: string) => 
    client.post('/sessions/start', { nodeId, skillId }),
  updateProgress: (sessionId: string, progress: any, action: string, metadata: any) => 
    client.put(`/sessions/${sessionId}/progress`, { progress, action, metadata }),
  completeSession: (sessionId: string, reflectionData: any) => 
    client.post(`/sessions/${sessionId}/complete`, { reflection: reflectionData }),
  getActiveSession: () => 
    client.get('/sessions/active'),
  getSessionHistory: (nodeId: string) => 
    client.get(`/sessions/history/${nodeId}`),
  recoverSession: (sessionId: string) => 
    client.post(`/sessions/${sessionId}/recover`),
  abandonSession: (sessionId: string) => 
    client.post(`/sessions/${sessionId}/abandon`),
}

// ============ SKILL MAP API ============
export const skillMapAPI = {
  // Skill map operations
  fetchSkillMapFull: (skillMapId: string) => 
    client.get(`/skills/maps/${skillMapId}/full`),
  createSkillMap: (data: any) => 
    client.post('/skills/maps', data),
  getAllSkillMaps: () => 
    client.get('/skill-maps'),
  getConfig: (skillMapId: string) => 
    client.get(`/skill-maps/${skillMapId}/config`),
  updateTheme: (skillMapId: string, theme: any) => 
    client.put(`/skill-maps/${skillMapId}/theme`, { theme }),
  toggleActivation: (skillMapId: string, isActive: boolean) => 
    client.put(`/skill-maps/${skillMapId}/activate`, { isActive }),
  
  // Node operations
  createSession: (nodeId: string) => 
    client.post(`/nodes/${nodeId}/sessions`, {}),
  completeSession: (sessionId: string, data: any) => 
    client.post(`/sessions/${sessionId}/complete`, data),
  abandonSession: (sessionId: string) => 
    client.post(`/sessions/${sessionId}/abandon`, {}),
  completeNode: (nodeId: string, skillMapId: string) => 
    client.patch(`/nodes/${nodeId}/status`, { status: 'Completed' }),
  createNode: (skillMapId: string, data: any) => 
    client.post(`/skills/${skillMapId}/nodes`, data),
  fetchNodeSessions: (nodeId: string) => 
    client.get(`/sessions/history/${nodeId}`),
  updateNode: (nodeId: string, data: any) => 
    client.patch(`/nodes/${nodeId}/content`, data),
  deleteNode: (nodeId: string) => 
    client.delete(`/nodes/${nodeId}`),
  createSkillMapFromTemplate: (template: any) => 
    client.post('/skills/maps/from-template', { template }),
}

// ============ XP API ============
export const xpAPI = {
  getProfile: () => client.get('/xp/profile'),
  getTransactions: (params = {}) => client.get('/xp/transactions', { params }),
}

// ============ LEADERBOARD API ============
export const leaderboardAPI = {
  getWeekly: (page = 1) => client.get('/leaderboard/weekly', { params: { page } }),
  getStreaks: (page = 1) => client.get('/leaderboard/streaks', { params: { page } }),
  getAllTime: (page = 1) => client.get('/leaderboard/all-time', { params: { page } }),
  getMyRanks: () => client.get('/leaderboard/my-ranks'),
}

export default client
