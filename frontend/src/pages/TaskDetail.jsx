import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTask } from '../hooks/useTask.js'
import { apiFetch } from '../lib/api.js'
import TaskForm from '../components/project/TaskForm.jsx'
import CommentThread from '../components/project/CommentThread.jsx'

const statusLabel = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
}

const priorityBadge = {
  URGENT: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW: 'bg-gray-100 text-gray-600',
}

function SkeletonBlock({ className }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
}

function TaskDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 animate-pulse">
          <SkeletonBlock className="h-6 w-1/2 mb-3" />
          <SkeletonBlock className="h-4 w-full mb-1" />
          <SkeletonBlock className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  )
}

export default function TaskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { task, comments, loading, error, updateTask, deleteTask, addComment } = useTask(id)

  const [members, setMembers] = useState([])
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  useEffect(() => {
    setConfirmingDelete(false)
    setEditing(false)
  }, [id])

  useEffect(() => {
    if (!task?.projectId) return
    let cancelled = false
    apiFetch(`/api/projects/${task.projectId}`)
      .then(({ data }) => {
        if (!cancelled) setMembers(data.members ?? [])
      })
      .catch(() => {
        if (!cancelled) setMembers([])
      })
    return () => {
      cancelled = true
    }
  }, [task?.projectId])

  if (loading) {
    return <TaskDetailSkeleton />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-red-100 shadow-sm p-8 max-w-md text-center">
          <p className="text-4xl mb-3">⚠️</p>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Could not load task</h2>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  if (!task) {
    return null
  }

  const handleSave = async (patch) => {
    await updateTask(patch)
    setEditing(false)
  }

  const handleDelete = async () => {
    setDeleteError(null)
    setDeleting(true)
    try {
      await deleteTask()
      navigate(`/projects/${task.projectId}`)
    } catch (err) {
      setDeleteError(err.message)
      setDeleting(false)
      setConfirmingDelete(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Link to={`/projects/${task.projectId}`} className="text-sm text-blue-600 hover:text-blue-700">
          ← Back to project
        </Link>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          {editing ? (
            <TaskForm
              members={members}
              initialValues={{
                title: task.title,
                description: task.description ?? '',
                status: task.status,
                priority: task.priority,
                assigneeId: task.assigneeId ?? '',
              }}
              onSubmit={handleSave}
              onCancel={() => setEditing(false)}
              submitLabel="Save"
            />
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-gray-900">{task.title}</h1>
                  {task.description && (
                    <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">{task.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    aria-label="Edit task"
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

              <div className="flex flex-wrap items-center gap-2 mt-4">
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                  {statusLabel[task.status] ?? task.status}
                </span>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${priorityBadge[task.priority] ?? priorityBadge.LOW}`}>
                  {task.priority}
                </span>
                <span className="text-xs text-gray-500">
                  Assignee: {task.assignee?.name || task.assignee?.email || 'Unassigned'}
                </span>
                <span className="text-xs text-gray-400">
                  Created by {task.createdBy?.name || task.createdBy?.email}
                </span>
              </div>

              {deleteError && (
                <p role="alert" className="text-sm text-red-600 mt-3">{deleteError}</p>
              )}
            </>
          )}
        </div>

        <CommentThread comments={comments} onAddComment={addComment} />
      </div>
    </div>
  )
}
