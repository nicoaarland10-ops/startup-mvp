import { Link, useNavigate } from 'react-router-dom'

const statusConfig = {
  active:    { label: 'Active',    className: 'bg-green-100 text-green-700' },
  in_review: { label: 'In Review', className: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', className: 'bg-gray-100 text-gray-600' },
  archived:  { label: 'Archived',  className: 'bg-gray-100 text-gray-400' },
  paused:    { label: 'Paused',    className: 'bg-amber-100 text-amber-700' },
}

function relativeDate(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const days = Math.floor(diffMs / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

export default function ProjectsList({ projects = [] }) {
  const navigate = useNavigate()

  if (projects.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Projects</h2>
        <p className="text-sm text-gray-400 text-center py-8">No projects yet. Create your first one!</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-800">Projects</h2>
        <span className="text-xs text-gray-400">{projects.length} total</span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="pb-3 pr-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Project</th>
              <th className="pb-3 pr-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
              <th className="pb-3 pr-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Collaborators</th>
              <th className="pb-3 pr-4 text-xs font-medium text-gray-500 uppercase tracking-wide">AI Insights</th>
              <th className="pb-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Last Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {projects.map((project) => {
              const status = statusConfig[project.status] ?? { label: project.status, className: 'bg-gray-100 text-gray-500' }
              return (
                <tr
                  key={project.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  role="row"
                  tabIndex={0}
                  onClick={() => navigate(`/dashboard/projects/${project.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigate(`/dashboard/projects/${project.id}`)
                  }}
                >
                  <td className="py-3 pr-4">
                    <div>
                      <Link
                        to={`/dashboard/projects/${project.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-gray-900 hover:text-indigo-700 hover:underline"
                      >
                        {project.name}
                      </Link>
                      {project.description && (
                        <p className="text-xs text-gray-400 truncate max-w-xs">{project.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${status.className}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-700 font-medium">{project.collaborators?.length ?? 0}</span>
                      <span className="text-gray-400 text-xs">members</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1">
                      <span className="text-indigo-600 font-medium">{project.aiInsightsCount}</span>
                      <span className="text-gray-400 text-xs">insights</span>
                    </div>
                  </td>
                  <td className="py-3 text-gray-500 text-xs">{relativeDate(project.lastActivity)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="md:hidden space-y-3">
        {projects.map((project) => {
          const status = statusConfig[project.status] ?? { label: project.status, className: 'bg-gray-100 text-gray-500' }
          return (
            <li key={project.id}>
              <Link
                to={`/dashboard/projects/${project.id}`}
                className="block border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-1">
                  <p className="font-medium text-gray-900 text-sm">{project.name}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.className}`}>{status.label}</span>
                </div>
                <div className="flex gap-4 text-xs text-gray-500 mt-2">
                  <span>{project.collaborators?.length ?? 0} members</span>
                  <span>{project.aiInsightsCount} insights</span>
                  <span>{relativeDate(project.lastActivity)}</span>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
