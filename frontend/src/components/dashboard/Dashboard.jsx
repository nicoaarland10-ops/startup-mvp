import StatsCard from './StatsCard.jsx'
import ActivityFeed from './ActivityFeed.jsx'
import AIInsightsPanel from './AIInsightsPanel.jsx'
import ProjectsList from './ProjectsList.jsx'
import { useDashboard } from '../../hooks/useDashboard.js'

function NotificationBell({ count }) {
  return (
    <button
      aria-label={`${count} unread notifications`}
      className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V4a1 1 0 10-2 0v1.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {count > 0 && (
        <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium leading-none">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
      <div className="h-8 bg-gray-200 rounded w-1/3" />
    </div>
  )
}

export default function Dashboard() {
  const { stats, projects, activity, insights, notifications, loading, error } = useDashboard()

  const unreadCount = notifications.filter((n) => !n.read).length

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-red-100 shadow-sm p-8 max-w-md text-center">
          <p className="text-4xl mb-3">⚠️</p>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Could not load dashboard</h2>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Good morning, <span className="text-indigo-600">Team</span> 👋
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Here's what's happening across your projects</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell count={unreadCount} />
            <div className="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              AI
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stats row */}
        <section aria-label="Key metrics">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            ) : (
              <>
                <StatsCard title="Total Projects"       value={stats?.totalProjects}       change={12} icon="🗂️" color="indigo" />
                <StatsCard title="Active Collaborators" value={stats?.activeCollaborators}  change={8}  icon="👥" color="blue" />
                <StatsCard title="AI Insights"          value={stats?.aiInsightsGenerated} change={34} icon="🧠" color="purple" />
                <StatsCard title="Tasks Completed"      value={stats?.tasksCompleted}      change={-3} icon="✅" color="green" />
              </>
            )}
          </div>
        </section>

        {/* Activity + Insights */}
        <section aria-label="Activity and insights" className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <ActivityFeed activities={loading ? [] : activity} />
          </div>
          <div className="lg:col-span-2">
            <AIInsightsPanel insights={loading ? [] : insights} />
          </div>
        </section>

        {/* Projects list */}
        <section aria-label="Projects">
          <ProjectsList projects={loading ? [] : projects} />
        </section>
      </main>
    </div>
  )
}
