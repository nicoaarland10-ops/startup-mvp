import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../lib/api.js'

const BASE_URL = '/api/projects'

export function useProject(projectId) {
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProject = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await apiFetch(`${BASE_URL}/${projectId}`)
      setProject(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchProject()
  }, [fetchProject])

  const updateProject = useCallback(async (patch) => {
    const { data } = await apiFetch(`${BASE_URL}/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
    setProject(data)
    return data
  }, [projectId])

  const deleteProject = useCallback(async () => {
    await apiFetch(`${BASE_URL}/${projectId}`, { method: 'DELETE' })
  }, [projectId])

  const inviteMember = useCallback(async ({ email, role }) => {
    const { data } = await apiFetch(`${BASE_URL}/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    })
    setProject((prev) => (prev ? { ...prev, members: [...prev.members, data] } : prev))
    return data
  }, [projectId])

  const updateMemberRole = useCallback(async (memberId, role) => {
    const { data } = await apiFetch(`${BASE_URL}/${projectId}/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    })
    setProject((prev) =>
      prev
        ? { ...prev, members: prev.members.map((m) => (m.id === memberId ? data : m)) }
        : prev
    )
    return data
  }, [projectId])

  const removeMember = useCallback(async (memberId) => {
    await apiFetch(`${BASE_URL}/${projectId}/members/${memberId}`, { method: 'DELETE' })
    setProject((prev) =>
      prev ? { ...prev, members: prev.members.filter((m) => m.id !== memberId) } : prev
    )
  }, [projectId])

  return {
    project,
    loading,
    error,
    refetch: fetchProject,
    updateProject,
    deleteProject,
    inviteMember,
    updateMemberRole,
    removeMember,
  }
}
