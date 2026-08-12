export default function StatsCard({ title, value, change, icon, color = 'blue' }) {
  const isPositive = change >= 0
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <span
          aria-label={title}
          className={`w-10 h-10 flex items-center justify-center rounded-lg text-xl ${colorMap[color] ?? colorMap.blue}`}
        >
          {icon}
        </span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold text-gray-900">{value?.toLocaleString()}</span>
        {change !== undefined && (
          <span
            className={`text-sm font-medium mb-0.5 ${isPositive ? 'text-green-600' : 'text-red-500'}`}
            aria-label={`${isPositive ? 'up' : 'down'} ${Math.abs(change)}%`}
          >
            {isPositive ? '↑' : '↓'} {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-1">vs last week</p>
    </div>
  )
}
