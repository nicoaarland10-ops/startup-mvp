import { useState } from 'react'

const STATUS_OPTIONS = [
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'DONE', label: 'Done' },
]

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]

export default function TaskForm({
  members = [],
  initialValues = {},
  onSubmit,
  onCancel,
  submitLabel = 'Save',
}) {
  const [title, setTitle] = useState(initialValues.title ?? '')
  const [description, setDescription] = useState(initialValues.description ?? '')
  const [status, setStatus] = useState(initialValues.status ?? 'TODO')
  const [priority, setPriority] = useState(initialValues.priority ?? 'MEDIUM')
  const [assigneeId, setAssigneeId] = useState(initialValues.assigneeId ?? '')
  const [validationError, setValidationError] = useState(null)
  const [serverError, setServerError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const activeMembers = members.filter((m) => m.status === 'ACTIVE')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError(null)

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setValidationError('Title is required')
      return
    }
    if (trimmedTitle.length > 200) {
      setValidationError('Title must be 200 characters or fewer')
      return
    }
    setValidationError(null)

    setSubmitting(true)
    try {
      await onSubmit({
        title: trimmedTitle,
        description: description.trim(),
        status,
        priority,
        assigneeId: assigneeId || null,
      })
    } catch (err) {
      setServerError(err?.message || 'Failed to save task')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <div>
        <label htmlFor="task-title" className="block text-xs font-medium text-gray-500 mb-1">
          Title
        </label>
        <input
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={submitting}
        />
      </div>

      <div>
        <label htmlFor="task-description" className="block text-xs font-medium text-gray-500 mb-1">
          Description
        </label>
        <textarea
          id="task-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="What needs to be done?"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={submitting}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label htmlFor="task-status" className="block text-xs font-medium text-gray-500 mb-1">
            Status
          </label>
          <select
            id="task-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={submitting}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label htmlFor="task-priority" className="block text-xs font-medium text-gray-500 mb-1">
            Priority
          </label>
          <select
            id="task-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={submitting}
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label htmlFor="task-assignee" className="block text-xs font-medium text-gray-500 mb-1">
            Assignee
          </label>
          <select
            id="task-assignee"
            value={assigneeId ?? ''}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={submitting}
          >
            <option value="">Unassigned</option>
            {activeMembers.map((m) => (
              <option key={m.userId ?? m.id} value={m.userId ?? m.id}>
                {m.name || m.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      {validationError && (
        <p role="alert" className="text-sm text-red-600">{validationError}</p>
      )}
      {serverError && (
        <p role="alert" className="text-sm text-red-600">{serverError}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          {submitting ? 'Saving…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="text-sm font-medium text-gray-500 hover:text-gray-700 rounded-lg px-4 py-2"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
