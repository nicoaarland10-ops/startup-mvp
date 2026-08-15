import { useState, useEffect, useCallback } from 'react'

const BASE_URL = 'https://startup-mvp-production.up.railway.app/api/dashboard/insights'

async function fetchJSON(url, options) {
  const res = await fetch(url, options)
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json()
}

export function useInsight(insightId) {
  const [insight, setInsight] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchInsight = useCallback(async () => {
    if (!insightId) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await fetchJSON(`${BASE_URL}/${insightId}`)
      setInsight(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [insightId])

  useEffect(() => {
    fetchInsight()
  }, [fetchInsight])

  const actionInsight = useCallback(async (action, assignee) => {
    const { data } = await fetchJSON(`${BASE_URL}/${insightId}/action`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...(assignee !== undefined ? { assignee } : {}) }),
    })
    setInsight((prev) => (prev ? { ...prev, ...data } : prev))
    return data
  }, [insightId])

  return { insight, loading, error, refetch: fetchInsight, actionInsight }
}
