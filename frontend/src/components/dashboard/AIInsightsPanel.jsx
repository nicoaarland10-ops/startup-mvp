import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

const priorityConfig = {
  critical: { label: 'Critical', className: 'bg-red-100 text-red-700' },
  high:     { label: 'High',     className: 'bg-orange-100 text-orange-700' },
  medium:   { label: 'Medium',   className: 'bg-amber-100 text-amber-700' },
  low:      { label: 'Low',      className: 'bg-gray-100 text-gray-600' },
}

const statusConfig = {
  active:   { label: 'Active',   className: 'bg-blue-100 text-blue-700' },
  snoozed:  { label: 'Snoozed',  className: 'bg-amber-100 text-amber-700' },
  resolved: { label: 'Resolved', className: 'bg-green-100 text-green-700' },
  archived: { label: 'Archived', className: 'bg-gray-100 text-gray-500' },
}

const typeIcon = {
  collaboration: '🤝',
  performance:   '📈',
  productivity:  '⚡',
  data_quality:  '🔍',
  quality:       '🧪',
  security:      '🔐',
}

function timeAgo(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function ActionButtons({ insight, onAction }) {
  if (!onAction) return null
  const status = insight.status ?? 'active'

  const buttonClass = 'text-xs font-medium px-2 py-1 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'

  if (status === 'active' || status === 'snoozed') {
    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        <button type="button" className={buttonClass} onClick={() => onAction(insight.id, 'resolve')}>
          Resolve
        </button>
        {status === 'active' && (
          <button type="button" className={buttonClass} onClick={() => onAction(insight.id, 'snooze')}>
            Snooze 1 week
          </button>
        )}
        <button type="button" className={buttonClass} onClick={() => onAction(insight.id, 'archive')}>
          Archive
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      <button type="button" className={buttonClass} onClick={() => onAction(insight.id, 'reopen')}>
        Reopen
      </button>
    </div>
  )
}

export default function AIInsightsPanel({ insights = [], onAction }) {
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('active')

  const types = useMemo(
    () => [...new Set(insights.map((i) => i.type))].sort(),
    [insights],
  )

  const filtered = useMemo(() => {
    return insights.filter((insight) => {
      if (priorityFilter !== 'all' && insight.priority !== priorityFilter) return false
      if (typeFilter !== 'all' && insight.type !== typeFilter) return false
      if (statusFilter !== 'all' && (insight.status ?? 'active') !== statusFilter) return false
      return true
    })
  }, [insights, priorityFilter, typeFilter, statusFilter])

  if (insights.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">AI Insights</h2>
        <p className="text-sm text-gray-400 text-center py-8">No insights generated yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-800">AI Insights</h2>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600 bg-white"
        >
          <option value="active">Active</option>
          <option value="snoozed">Snoozed</option>
          <option value="resolved">Resolved</option>
          <option value="archived">Archived</option>
          <option value="all">All statuses</option>
        </select>
        <select
          aria-label="Filter by priority"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600 bg-white"
        >
          <option value="all">All priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          aria-label="Filter by type"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600 bg-white"
        >
          <option value="all">All types</option>
          {types.map((type) => (
            <option key={type} value={type}>{type.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No insights match the current filters.</p>
      ) : (
        <ul className="space-y-4">
          {filtered.map((insight) => {
            const priority = priorityConfig[insight.priority] ?? priorityConfig.low
            const status = statusConfig[insight.status] ?? null
            return (
              <li key={insight.id} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-2 mb-1">
                  <span className="text-base flex-shrink-0">{typeIcon[insight.type] ?? '🧠'}</span>
                  <Link
                    to={`/insights/${insight.id}`}
                    className="text-sm font-medium text-gray-800 leading-snug hover:text-indigo-700 hover:underline"
                  >
                    {insight.title}
                  </Link>
                </div>
                <p className="text-xs text-gray-500 mb-2 line-clamp-2">{insight.description}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${priority.className}`}
                    aria-label={`Priority: ${priority.label}`}
                  >
                    {priority.label}
                  </span>
                  {status && (
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${status.className}`}
                      aria-label={`Status: ${status.label}`}
                    >
                      {status.label}
                    </span>
                  )}
                  {insight.updatedAt && (
                    <span className="text-xs text-gray-400">Updated {timeAgo(insight.updatedAt)}</span>
                  )}
                  <Link
                    to={`/insights/${insight.id}`}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 ml-auto"
                  >
                    View details →
                  </Link>
                </div>
                <ActionButtons insight={insight} onAction={onAction} />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
