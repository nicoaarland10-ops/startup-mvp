import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProject } from '../hooks/useProject.js'
import MemberManager from '../components/project/MemberManager.jsx'
import InviteForm from '../components/project/InviteForm.jsx'

function SkeletonBlock({ className }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
}

function ProjectDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 animate-pulse">
          <SkeletonBlock className="h-6 w-1/3 mb-3" />
          <SkeletonBlock className="h-4 w-2/3" />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 animate-pulse">
          <SkeletonBlock className="h-4 w-1/4 mb-4" />
          <SkeletonBlock className="h-10 w-full" />
        </div>
      </div>
    </div>
  )
}

function EditProjectForm({ project, onSave, onCancel }) {
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description ?? '')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    if (name.trim().length > 120) {
      setError('Name must be 120 characters or fewer')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await onSave({ name: name.trim(), description })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="project-name" className="block text-xs font-medium text-gray-500 mb-1">Name</label>
        <input
          id="project-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={saving}
        />
      </div>
      <div>
        <label htmlFor="project-description" className="block text-xs font-medium text-gray-500 mb-1">Description</label>
        <textarea
          id="project-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={saving}
        />
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="text-sm font-medium text-gray-500 hover:text-gray-700 rounded-lg px-4 py-2"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    project,
    loading,
    error,
    updateProject,
    deleteProject,
    inviteMember,
    updateMemberRole,
    removeMember,
  } = useProject(id)

  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  useEffect(() => {
    setConfirmingDelete(false)
  }, [id])

  if (loading) {
    return <ProjectDetailSkeleton />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-red-100 shadow-sm p-8 max-w-md text-center">
          <p className="text-4xl mb-3">⚠️</p>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Could not load project</h2>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return null
  }

  const handleSave = async (patch) => {
    await updateProject(patch)
    setEditing(false)
  }

  const handleDelete = async () => {
    setDeleteError(null)
    setDeleting(true)
    try {
      await deleteProject()
      navigate('/dashboard')
    } catch (err) {
      setDeleteError(err.message)
      setDeleting(false)
      setConfirmingDelete(false)
    }
  }

  const handleInvite = async ({ email, role }) => {
    await inviteMember({ email, role })
  }

  const handleRoleChange = async (memberId, role) => {
    await updateMemberRole(memberId, role)
  }

  const handleRemove = async (memberId) => {
    await removeMember(memberId)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          {editing ? (
            <EditProjectForm project={project} onSave={handleSave} onCancel={() => setEditing(false)} />
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-gray-900 truncate">{project.name}</h1>
                  {project.description && (
                    <p className="text-sm text-gray-500 mt-1">{project.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    aria-label="Edit project"
                    onClick={() => setEditing(true)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  {confirmingDelete ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg px-3 py-2"
                      >
                        {deleting ? 'Deleting…' : 'Confirm delete'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingDelete(false)}
                        disabled={deleting}
                        className="text-xs font-medium text-gray-500 hover:text-gray-700 rounded-lg px-3 py-2"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(true)}
                      className="text-xs font-medium text-red-600 hover:text-white hover:bg-red-600 border border-red-200 rounded-lg px-3 py-2 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              {deleteError && (
                <p role="alert" className="text-sm text-red-600 mt-3">{deleteError}</p>
              )}
            </>
          )}
        </div>

        <MemberManager
          members={project.members ?? []}
          onRoleChange={handleRoleChange}
          onRemove={handleRemove}
        />

        <InviteForm onInvite={handleInvite} />
      </div>
    </div>
  )
}
