import { Link, useParams } from 'react-router-dom'
import { useProjectOverview } from '../hooks/useProjectOverview.js'

const statusConfig = {
  active:    { label: 'Active',    className: 'bg-green-100 text-green-700' },
  in_review: { label: 'In Review', className: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', className: 'bg-gray-100 text-gray-600' },
  archived:  { label: 'Archived',  className: 'bg-gray-100 text-gray-400' },
  paused:    { label: 'Paused',    className: 'bg-amber-100 text-amber-700' },
}

const priorityConfig = {
  critical: { label: 'Critical', className: 'bg-red-100 text-red-700' },
  high:     { label: 'High',     className: 'bg-orange-100 text-orange-700' },
  medium:   { label: 'Medium',   className: 'bg-amber-100 text-amber-700' },
  low:      { label: 'Low',      className: 'bg-gray-100 text-gray-600' },
}

const activityIcon = {
  document_created: '📄',
  document_updated: '✏️',
  ai_analysis_run: '🤖',
  insight_generated: '💡',
  comment_added: '💬',
  task_completed: '✅',
  member_invited: '👋',
  model_deployed: '🚀',
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

function Skeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 animate-pulse space-y-3">
        <div className="h-6 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  )
}

export default function ProjectOverview() {
  const { id } = useParams()
  const { project, insights, activity, loading, error } = useProjectOverview(id)

  if (loading) return <Skeleton />

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl border border-red-100 shadow-sm p-8 text-center">
          <p className="text-4xl mb-3">⚠️</p>
          <h1 className="text-lg font-semibold text-gray-800 mb-2">Could not load project</h1>
          <p className="text-sm text-gray-500">{error}</p>
          <Link to="/dashboard" className="inline-block mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-800">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (!project) return null

  const status = statusConfig[project.status] ?? { label: project.status, className: 'bg-gray-100 text-gray-500' }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Link to="/dashboard" className="text-sm font-medium text-gray-500 hover:text-gray-700">
        ← Back to dashboard
      </Link>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
            {project.description && <p className="text-sm text-gray-500 mt-1">{project.description}</p>}
          </div>
          <span className={`inline-block text-xs font-medium px-2 py-1 rounded-full shrink-0 ${status.className}`}>
            {status.label}
          </span>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 text-sm">
          <div>
            <dt className="text-xs text-gray-400 uppercase tracking-wide">Collaborators</dt>
            <dd className="text-gray-800 font-medium mt-1">{project.collaborators?.length ?? 0}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400 uppercase tracking-wide">AI Insights</dt>
            <dd className="text-gray-800 font-medium mt-1">{project.aiInsightsCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400 uppercase tracking-wide">Last Activity</dt>
            <dd className="text-gray-800 font-medium mt-1">{timeAgo(project.lastActivity)}</dd>
          </div>
        </dl>

        {project.collaborators?.length > 0 && (
          <div className="flex items-center gap-2 mt-4">
            {project.collaborators.map((c) => (
              <span key={c.id} className="text-xs font-medium bg-gray-100 text-gray-700 rounded-full px-2.5 py-1">
                {c.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Insights for this project</h2>
        {insights.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No insights for this project yet.</p>
        ) : (
          <ul className="space-y-3">
            {insights.map((insight) => {
              const priority = priorityConfig[insight.priority] ?? priorityConfig.low
              return (
                <li key={insight.id} className="border border-gray-100 rounded-lg p-3">
                  <Link
                    to={`/insights/${insight.id}`}
                    className="text-sm font-medium text-gray-800 hover:text-indigo-700 hover:underline"
                  >
                    {insight.title}
                  </Link>
                  <div className="mt-1">
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${priority.className}`}>
                      {priority.label}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Recent activity</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No activity for this project yet.</p>
        ) : (
          <ul className="space-y-3">
            {activity.map((item) => (
              <li key={item.id} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm">
                  {activityIcon[item.type] ?? '📌'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{item.user?.name}</span> {item.action}{' '}
                    <span className="text-gray-900 font-medium">{item.target}</span>
                  </p>
                  <time className="text-xs text-gray-400">{timeAgo(item.timestamp)}</time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
