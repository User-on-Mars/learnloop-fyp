import { useState, useEffect } from 'react'
import { auth } from '../firebase'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

/**
 * Hook to check if the current user has admin role.
 */
export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function check() {
      try {
        const token = await auth.currentUser?.getIdToken()
        if (!token) {
          setIsAdmin(false)
          setChecking(false)
          return
        }

        const res = await fetch(`${API}/admin/verify`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json().catch(() => ({ admin: false }))

        if (!cancelled) {
          setIsAdmin(Boolean(data.admin))
        }
      } catch {
        if (!cancelled) setIsAdmin(false)
      } finally {
        if (!cancelled) setChecking(false)
      }
    }

    check()
    return () => { cancelled = true }
  }, [])

  return { isAdmin, checking }
}
