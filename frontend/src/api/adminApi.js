import { auth } from '../firebase'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

async function getHeaders() {
  const token = await auth.currentUser?.getIdToken()
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  }
}

async function request(path, options = {}) {
  const headers = await getHeaders()
  const res = await fetch(`${API}${path}`, { ...options, headers })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const adminApi = {
  getStats: () => request('/admin/stats'),
  getUserGrowth: (days = 30) => request(`/admin/stats/user-growth?days=${days}`),
  getUsers: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/admin/users?${q}`)
  },
  getUserDetail: (userId) => request(`/admin/users/${userId}`),
  suspendUser: (userId, reason) => request(`/admin/users/${userId}/suspend`, { method: 'POST', body: JSON.stringify({ reason }) }),
  banUser: (userId, reason) => request(`/admin/users/${userId}/ban`, { method: 'POST', body: JSON.stringify({ reason }) }),
  reactivateUser: (userId) => request(`/admin/users/${userId}/reactivate`, { method: 'POST' }),
  changeRole: (userId, role) => request(`/admin/users/${userId}/role`, { method: 'POST', body: JSON.stringify({ role }) }),
  getActivity: (page = 1, limit = 20) => request(`/admin/activity?page=${page}&limit=${limit}`),
  deleteContent: (type, id) => request(`/admin/content/${type}/${id}`, { method: 'DELETE' })
}
