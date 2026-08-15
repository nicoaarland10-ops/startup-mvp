import { useState, useEffect, useCallback } from 'react'

const BASE_URL = 'https://startup-mvp-production.up.railway.app/api/dashboard/projects'

async function fetchJSON(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json()
}

export function useProjectOverview(projectId) {
  const [project, setProject] = useState(null)
  const [insights, setInsights] = useState([])
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchOverview = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await fetchJSON(`${BASE_URL}/${projectId}/overview`)
      setProject(data.project)
      setInsights(data.insights ?? [])
      setActivity(data.activity ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  return { project, insights, activity, loading, error, refetch: fetchOverview }
}
