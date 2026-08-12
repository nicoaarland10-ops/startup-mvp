const priorityConfig = {
  critical: { label: 'Critical', className: 'bg-red-100 text-red-700' },
  high:     { label: 'High',     className: 'bg-orange-100 text-orange-700' },
  medium:   { label: 'Medium',   className: 'bg-amber-100 text-amber-700' },
  low:      { label: 'Low',      className: 'bg-gray-100 text-gray-600' },
}

const typeIcon = {
  collaboration: '🤝',
  performance:   '📈',
  productivity:  '⚡',
  data_quality:  '🔍',
  quality:       '🧪',
  security:      '🔐',
}

export default function AIInsightsPanel({ insights = [] }) {
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
        <a
          href="/insights"
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          View All →
        </a>
      </div>
      <ul className="space-y-4">
        {insights.map((insight) => {
          const priority = priorityConfig[insight.priority] ?? priorityConfig.low
          return (
            <li key={insight.id} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-2 mb-1">
                <span className="text-base flex-shrink-0">{typeIcon[insight.type] ?? '🧠'}</span>
                <p className="text-sm font-medium text-gray-800 leading-snug">{insight.title}</p>
              </div>
              <p className="text-xs text-gray-500 mb-2 line-clamp-2">{insight.description}</p>
              <span
                className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${priority.className}`}
                aria-label={`Priority: ${priority.label}`}
              >
                {priority.label}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
