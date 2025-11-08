import axios from 'axios'
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  withCredentials: false
})

export async function login(payload){
  const { data } = await api.post('/auth/login', payload)
  localStorage.setItem('token', data.token || '')
  return data
}
export async function signup(payload){
  const { data } = await api.post('/auth/register', payload)
  return data
}
export async function forgotPassword(payload){
  const { data } = await api.post('/auth/forgot', payload)
  return data
}
