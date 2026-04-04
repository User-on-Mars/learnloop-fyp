import { useState, useEffect } from 'react'
import { auth } from '../firebase'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

/**
 * Hook to check if the current user has admin role.
 * Makes a lightweight call to the admin stats endpoint — if it succeeds, user is admin.
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
          console.log('🔐 useAdmin: No token found')
          setIsAdmin(false)
          setChecking(false)
          return 
        }

        const res = await fetch(`${API}/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        console.log(`🔐 useAdmin: /admin/stats returned ${res.status}`)
        
        if (!cancelled) {
          setIsAdmin(res.ok)
          console.log(`🔐 useAdmin: isAdmin set to ${res.ok}`)
        }
      } catch (err) {
        console.error('🔐 useAdmin: Error checking admin status:', err)
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
