import { useEffect, useState, useCallback } from 'react'
import { api } from '../utils/api'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api('/api/me')
      setUser(data && data.google_id ? data : null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const login = (next = '/') => {
    window.location.href = `/auth/login?next=${encodeURIComponent(next)}`
  }
  const logout = () => { window.location.href = '/auth/logout' }

  return { user, loading, refresh, login, logout }
}
