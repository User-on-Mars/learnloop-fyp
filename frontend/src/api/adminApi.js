import { auth } from '../firebase'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

async function getHeaders() {
  const token = await auth.currentUser?.getIdToken()
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  }
}

async function getToken() {
  return await auth.currentUser?.getIdToken()
}

async function request(path, options = {}) {
  const headers = await getHeaders()
  const res = await fetch(`${API}${path}`, { ...options, headers })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const errorMsg = data.message || `Request failed with status ${res.status}`
    console.error(`API Error [${res.status}] ${path}:`, data)
    throw new Error(errorMsg)
  }
  return res.json()
}

export const adminApi = {
  getToken,
  // Dashboard
  getStats: () => request('/admin/stats'),
  getLearningHealth: () => request('/admin/learning-health'),
  
  // Users
  getUsers: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/admin/users?${q}`)
  },
  getUserDetail: (userId) => request(`/admin/users/${userId}`),
  banUser: (userId, reason) => request(`/admin/users/${userId}/ban`, { method: 'POST', body: JSON.stringify({ reason }) }),
  unbanUser: (userId) => request(`/admin/users/${userId}/unban`, { method: 'POST' }),
  nudgeUser: (userId) => request(`/admin/users/${userId}/nudge`, { method: 'POST' }),
  promoteToAdmin: (userId) => request(`/admin/users/${userId}/promote`, { method: 'POST' }),
  demoteFromAdmin: (userId) => request(`/admin/users/${userId}/demote`, { method: 'POST' }),
  adjustXp: (userId, amount, reason) => request(`/admin/users/${userId}/adjust-xp`, { method: 'POST', body: JSON.stringify({ amount, reason }) }),
  
  // Activity
  getActivity: (page = 1, limit = 20) => request(`/admin/activity?page=${page}&limit=${limit}`),
  
  // XP & Leaderboard
  getXpLeaderboard: (limit = 50) => request(`/admin/xp-leaderboard?limit=${limit}`),
  
  // Skill Maps
  getSkillMapStats: () => request('/admin/skill-maps/stats'),
  getSkillMaps: () => request('/admin/skill-maps'),
  deleteSkillMap: (skillMapId) => request(`/admin/skill-maps/${skillMapId}`, { method: 'DELETE' }),
  
  // Reflections
  getReflections: (limit = 20) => request(`/admin/reflections?limit=${limit}`),
  
  // Audit Log
  getAuditLog: (page = 1, limit = 50, filter = {}) => {
    const q = new URLSearchParams({ page, limit, ...filter }).toString()
    return request(`/admin/audit-log?${q}`)
  },
  
  // Alerts / Flags
  getAlerts: (page = 1, limit = 20) => request(`/admin/alerts?page=${page}&limit=${limit}`),
  dismissAlert: (flagId) => request(`/admin/alerts/${flagId}/dismiss`, { method: 'POST' }),
  actionAlert: (flagId) => request(`/admin/alerts/${flagId}/action`, { method: 'POST' }),
  
  // Admin Actions
  manualReset: (confirmation) => request('/admin/manual-reset', { method: 'POST', body: JSON.stringify({ confirmation }) }),
  recalculateXp: () => request('/admin/recalculate-xp', { method: 'POST' }),
  exportUserData: () => request('/admin/export-users', { method: 'POST' }),
  
  // Content
  deleteContent: (type, id) => request(`/admin/content/${type}/${id}`, { method: 'DELETE' }),

  // Subscriptions
  getSubscriptions: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/subscriptions${qs ? `?${qs}` : ''}`);
  },
  getRewards: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/rewards${qs ? `?${qs}` : ''}`);
  },
  getLatestRewards: () => request('/admin/rewards/latest'),
}
