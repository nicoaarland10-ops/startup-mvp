import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../lib/api.js'

const BASE_URL = '/api/tasks'

export function useTasks(projectId, filters = {}) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Stringify filters so the effect/callback dependency is stable across
  // renders even when the caller passes a fresh object literal each time.
  const filtersKey = JSON.stringify(filters ?? {})

  const fetchTasks = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ projectId })
      const f = JSON.parse(filtersKey)
      if (f.status) params.set('status', f.status)
      if (f.priority) params.set('priority', f.priority)
      if (f.assigneeId) params.set('assigneeId', f.assigneeId)
      if (f.page) params.set('page', f.page)
      if (f.limit) params.set('limit', f.limit)

      const { data } = await apiFetch(`${BASE_URL}?${params.toString()}`)
      setTasks(data ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, filtersKey])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const createTask = useCallback(async (payload) => {
    const { data } = await apiFetch(BASE_URL, {
      method: 'POST',
      body: JSON.stringify({ projectId, ...payload }),
    })
    setTasks((prev) => [data, ...prev])
    return data
  }, [projectId])

  const updateTaskStatus = useCallback(async (taskId, status) => {
    const { data } = await apiFetch(`${BASE_URL}/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    setTasks((prev) => prev.map((t) => (t.id === taskId ? data : t)))
    return data
  }, [])

  const deleteTask = useCallback(async (taskId) => {
    await apiFetch(`${BASE_URL}/${taskId}`, { method: 'DELETE' })
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
  }, [])

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
    createTask,
    updateTaskStatus,
    deleteTask,
  }
}
