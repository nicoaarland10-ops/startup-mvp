import { Link, useParams } from 'react-router-dom'
import { useInsight } from '../hooks/useInsight.js'

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

function formatDateTime(isoString) {
  return new Date(isoString).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function InsightDetailSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/4" />
        <div className="h-6 bg-gray-200 rounded w-2/3" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
      </div>
    </div>
  )
}

export default function InsightDetail() {
  const { id } = useParams()
  const { insight, loading, error, actionInsight } = useInsight(id)

  if (loading) {
    return <InsightDetailSkeleton />
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl border border-red-100 shadow-sm p-8 text-center">
          <p className="text-4xl mb-3">⚠️</p>
          <h1 className="text-lg font-semibold text-gray-800 mb-2">Could not load insight</h1>
          <p className="text-sm text-gray-500">{error}</p>
          <Link to="/dashboard" className="inline-block mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-800">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (!insight) {
    return null
  }

  const priority = priorityConfig[insight.priority] ?? priorityConfig.low
  const status = statusConfig[insight.status] ?? statusConfig.active
  const buttonClass = 'text-sm font-medium px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors'

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Link to="/dashboard" className="text-sm font-medium text-gray-500 hover:text-gray-700">
        ← Back to dashboard
      </Link>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{typeIcon[insight.type] ?? '🧠'}</span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-gray-900">{insight.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${priority.className}`}>
                {priority.label} priority
              </span>
              <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${status.className}`}>
                {status.label}
              </span>
              <span className="text-xs text-gray-400 capitalize">{insight.type.replace('_', ' ')}</span>
              {insight.project && (
                <Link
                  to={`/dashboard/projects/${insight.project.id}`}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  {insight.project.name} →
                </Link>
              )}
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600 mt-4 leading-relaxed">{insight.description}</p>

        <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-400">
          <span>Detected {formatDateTime(insight.createdAt)}</span>
          <span>Updated {formatDateTime(insight.updatedAt)}</span>
        </div>
      </div>

      {insight.recommendedActions?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-3">Recommended actions</h2>
          <ul className="space-y-2">
            {insight.recommendedActions.map((action) => (
              <li key={action} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-indigo-500 mt-0.5">•</span>
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-3">Manage this insight</h2>
        <div className="flex flex-wrap gap-2">
          {(insight.status === 'active' || insight.status === 'snoozed') ? (
            <>
              <button type="button" className={buttonClass} onClick={() => actionInsight('resolve')}>
                Mark resolved
              </button>
              {insight.status === 'active' && (
                <button type="button" className={buttonClass} onClick={() => actionInsight('snooze')}>
                  Snooze 1 week
                </button>
              )}
              <button type="button" className={buttonClass} onClick={() => actionInsight('archive')}>
                Archive
              </button>
            </>
          ) : (
            <button type="button" className={buttonClass} onClick={() => actionInsight('reopen')}>
              Reopen
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
