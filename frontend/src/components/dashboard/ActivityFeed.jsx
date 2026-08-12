import { useEffect, useState } from 'react'

const typeIcon = {
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

export default function ActivityFeed({ activities = [], refreshInterval = 30000 }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), refreshInterval)
    return () => clearInterval(id)
  }, [refreshInterval])

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Recent Activity</h2>
        <p className="text-sm text-gray-400 text-center py-8">No activity yet. Start collaborating!</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-4">Recent Activity</h2>
      <ul className="space-y-4">
        {activities.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            <span className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm">
              {typeIcon[item.type] ?? '📌'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700">
                <span className="font-medium">{item.user?.name}</span>
                {' '}{item.action}{' '}
                <span className="text-gray-900 font-medium truncate">{item.target}</span>
              </p>
              <time
                dateTime={item.timestamp}
                className="text-xs text-gray-400"
                // Suppress stale closure lint — `now` forces a re-render tick
                // eslint-disable-next-line no-unused-expressions
                data-now={now}
              >
                {timeAgo(item.timestamp)}
              </time>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
