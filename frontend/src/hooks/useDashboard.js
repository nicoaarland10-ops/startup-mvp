import { useState, useEffect, useCallback } from 'react'

const BASE_URL = 'https://startup-mvp-production.up.railway.app/api'
async function fetchJSON(url) {
  const res = await fetch(url, { headers: { 'x-user-id': '1' } })  
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
                const [projectsData, tasksData] = await Promise.all([
                          fetchJSON(`${BASE_URL}/projects`),
                          fetchJSON(`${BASE_URL}/tasks`),
                        ])

          // Transform data for dashboard display
          setStats({
                    totalProjects: projectsData.projects?.length || 0,
                    totalTasks: tasksData.tasks?.length || 0,
                    completedTasks: tasksData.tasks?.filter(t => t.completed)?.length || 0,
          })
                setProjects(projectsData.projects ?? [])
                setActivity([]) // Will populate from notifications
          setInsights([
            { title: 'Active Projects', value: projectsData.projects?.length || 0 },
            { title: 'Total Tasks', value: tasksData.tasks?.length || 0 },
                  ])
                setNotifications([])
        } catch (err) {
                setError(err.message)
        } finally {
                setLoading(false)
        }
  }, [])

  useEffect(() => {
        fetchAll()
  }, [fetchAll])

  return { stats, projects, activity, insights, notifications, loading, error, refetch: fetchAll }
}
