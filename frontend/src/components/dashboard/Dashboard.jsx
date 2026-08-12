import StatsCard from './StatsCard.jsx'
import ActivityFeed from './ActivityFeed.jsx'
import AIInsightsPanel from './AIInsightsPanel.jsx'
import ProjectsList from './ProjectsList.jsx'
import NotificationBell from '../NotificationBell.jsx'
import { useDashboard } from '../../hooks/useDashboard.js'

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
      <div className="h-8 bg-gray-200 rounded w-1/3" />
    </div>
  )
}

export default function Dashboard() {
  const { stats, projects, activity, insights, loading, error } = useDashboard()

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
            <NotificationBell />
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
