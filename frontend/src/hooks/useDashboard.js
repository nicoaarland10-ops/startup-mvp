import { useState, useEffect, useCallback } from 'react'

const BASE_URL = 'https://startup-mvp-production.up.railway.app/api/dashboard'

async function fetchJSON(url, options) {
  const res = await fetch(url, options)
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json()
}

export function useDashboard() {
  const [stats, setStats] = useState(null)
  const [projects, setProjects] = useState([])
  const [activity, setActivity] = useState([])
  const [insights, setInsights] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsData, projectsData, activityData, insightsData, notifData] = await Promise.all([
        fetchJSON(`${BASE_URL}/stats`),
        fetchJSON(`${BASE_URL}/projects`),
        fetchJSON(`${BASE_URL}/activity`),
        fetchJSON(`${BASE_URL}/insights`),
        fetchJSON(`${BASE_URL}/notifications`),
      ])
      setStats(statsData.data ?? statsData)
      setProjects(projectsData.data ?? [])
      setActivity(activityData.data ?? [])
      setInsights(insightsData.data ?? [])
      setNotifications(notifData.data ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const actionInsight = useCallback(async (id, action, assignee) => {
    const { data } = await fetchJSON(`${BASE_URL}/insights/${id}/action`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...(assignee !== undefined ? { assignee } : {}) }),
    })
    setInsights((prev) => prev.map((i) => (i.id === id ? data : i)))
    return data
  }, [])

  return { stats, projects, activity, insights, notifications, loading, error, refetch: fetchAll, actionInsight }
}
