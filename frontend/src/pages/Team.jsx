import { Link } from 'react-router-dom'
import { useTeam } from '../hooks/useTeam.js'

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 animate-pulse space-y-3">
      <div className="w-10 h-10 rounded-full bg-gray-200" />
      <div className="h-4 bg-gray-200 rounded w-2/3" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
    </div>
  )
}

export default function Team() {
  const { members, loading, error } = useTeam()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-xl font-bold text-gray-900">Team</h1>
          <p className="text-sm text-gray-500 mt-0.5">Everyone collaborating across your projects</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-white rounded-xl border border-red-100 shadow-sm p-6 mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            members.map((member) => (
              <div key={member.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-3">
                  {member.avatar ? (
                    <img src={member.avatar} alt="" className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold">
                      {member.name?.[0] ?? '?'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                    <p className="text-xs text-gray-400">
                      {member.projectCount} project{member.projectCount === 1 ? '' : 's'} · {member.openInsights} open insight{member.openInsights === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                {member.projects?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {member.projects.map((p) => (
                      <Link
                        key={p.id}
                        to={`/dashboard/projects/${p.id}`}
                        className="text-xs font-medium bg-gray-100 text-gray-700 rounded-full px-2.5 py-1 hover:bg-gray-200 transition-colors"
                      >
                        {p.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {!loading && members.length === 0 && !error && (
          <p className="text-sm text-gray-400 text-center py-12">No team members yet.</p>
        )}
      </main>
    </div>
  )
}
