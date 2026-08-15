import { useState, useEffect, useCallback } from 'react'

const BASE_URL = 'https://startup-mvp-production.up.railway.app/api/dashboard/team'

export function useTeam() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTeam = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(BASE_URL)
      if (!res.ok) throw new Error(`Request failed: ${res.status}`)
      const { data } = await res.json()
      setMembers(data ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTeam()
  }, [fetchTeam])

  return { members, loading, error, refetch: fetchTeam }
}
