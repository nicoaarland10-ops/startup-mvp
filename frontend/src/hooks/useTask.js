import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../lib/api.js'

const BASE_URL = '/api/tasks'

export function useTask(taskId) {
  const [task, setTask] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTask = useCallback(async () => {
    if (!taskId) return
    setLoading(true)
    setError(null)
    try {
      const [taskRes, commentsRes] = await Promise.all([
        apiFetch(`${BASE_URL}/${taskId}`),
        apiFetch(`${BASE_URL}/${taskId}/comments`),
      ])
      setTask(taskRes.data)
      setComments(commentsRes.data ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    fetchTask()
  }, [fetchTask])

  const updateTask = useCallback(async (patch) => {
    const { data } = await apiFetch(`${BASE_URL}/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
    setTask(data)
    return data
  }, [taskId])

  const deleteTask = useCallback(async () => {
    await apiFetch(`${BASE_URL}/${taskId}`, { method: 'DELETE' })
  }, [taskId])

  const addComment = useCallback(async (body) => {
    const { data } = await apiFetch(`${BASE_URL}/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    })
    setComments((prev) => [...prev, data])
    return data
  }, [taskId])

  return {
    task,
    comments,
    loading,
    error,
    refetch: fetchTask,
    updateTask,
    deleteTask,
    addComment,
  }
}
