import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTasks } from '../../hooks/useTasks.js'
import TaskForm from './TaskForm.jsx'

const COLUMNS = [
  { key: 'TODO', label: 'To Do' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'IN_REVIEW', label: 'In Review' },
  { key: 'DONE', label: 'Done' },
]

const priorityBadge = {
  URGENT: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW: 'bg-gray-100 text-gray-600',
}

function SkeletonCard() {
  return <div className="h-20 bg-gray-200 rounded-lg animate-pulse" />
}

function TaskCard({ task, onStatusChange }) {
  const [busy, setBusy] = useState(false)

  const handleStatusChange = async (e) => {
    setBusy(true)
    try {
      await onStatusChange(task.id, e.target.value)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 space-y-2">
      <Link
        to={`/tasks/${task.id}`}
        className="text-sm font-medium text-gray-900 hover:text-blue-600 line-clamp-2 block"
      >
        {task.title}
      </Link>

      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityBadge[task.priority] ?? priorityBadge.LOW}`}>
          {task.priority}
        </span>
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {task.commentCount ?? 0}
        </span>
      </div>

      <p className="text-xs text-gray-500 truncate">
        {task.assignee?.name || task.assignee?.email || 'Unassigned'}
      </p>

      <select
        aria-label={`Change status for ${task.title}`}
        value={task.status}
        onChange={handleStatusChange}
        disabled={busy}
        className="w-full text-xs font-medium rounded-lg border border-gray-200 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {COLUMNS.map((col) => (
          <option key={col.key} value={col.key}>{col.label}</option>
        ))}
      </select>
    </div>
  )
}

export default function KanbanBoard({ projectId, members = [] }) {
  const { tasks, loading, error, createTask, updateTaskStatus } = useTasks(projectId)
  const [showForm, setShowForm] = useState(false)

  const handleCreate = async (payload) => {
    await createTask(payload)
    setShowForm(false)
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-red-100 shadow-sm p-6 text-center">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">Tasks</h2>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            + New Task
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">New task</h3>
          <TaskForm
            members={members}
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            submitLabel="Create task"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((column) => {
          const columnTasks = tasks.filter((t) => t.status === column.key)
          return (
            <div key={column.key} className="bg-gray-50 rounded-xl border border-gray-100 p-3 space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {column.label}
                </h3>
                <span className="text-xs text-gray-400">{columnTasks.length}</span>
              </div>

              {loading ? (
                <div className="space-y-2">
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              ) : columnTasks.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No tasks</p>
              ) : (
                <div className="space-y-2">
                  {columnTasks.map((task) => (
                    <TaskCard key={task.id} task={task} onStatusChange={updateTaskStatus} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
