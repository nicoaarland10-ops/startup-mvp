const INTEGRATIONS = [
  { id: 'github', name: 'GitHub', description: 'Pull request review times, merge frequency, code churn.', icon: '🐙' },
  { id: 'jira', name: 'Jira', description: 'Sprint burndown, cycle time, blocked tasks.', icon: '📋' },
  { id: 'slack', name: 'Slack', description: 'Push critical insights to a channel.', icon: '💬' },
  { id: 'model_apis', name: 'Model APIs', description: 'Latency, error rate, and cost across Claude/GPT-4/etc.', icon: '🧠' },
]

export default function Settings() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Data sources and integrations</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800">
            <span className="font-medium">Running on demo data.</span> This dashboard currently shows a fixed set of
            sample projects and insights — no external tools are connected yet.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1">Integrations</h2>
          <p className="text-sm text-gray-500 mb-4">Connect the tools your insights should be generated from.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {INTEGRATIONS.map((integration) => (
              <div key={integration.id} className="border border-gray-100 rounded-lg p-4 flex items-start gap-3">
                <span className="text-xl flex-shrink-0">{integration.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900">{integration.name}</p>
                    <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                      Not connected
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{integration.description}</p>
                  <button
                    type="button"
                    disabled
                    title="Coming soon"
                    className="text-xs font-medium text-gray-400 border border-gray-200 rounded-md px-2.5 py-1 mt-3 cursor-not-allowed"
                  >
                    Connect
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
