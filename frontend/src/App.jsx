import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/layout/AppShell.jsx'
import Dashboard from './components/dashboard/Dashboard.jsx'
import InsightDetail from './pages/InsightDetail.jsx'
import ProjectOverview from './pages/ProjectOverview.jsx'
import Team from './pages/Team.jsx'
import Settings from './pages/Settings.jsx'
import ProjectDetail from './pages/ProjectDetail.jsx'
import TaskDetail from './pages/TaskDetail.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/projects/:id" element={<ProjectOverview />} />
        <Route path="/insights/:id" element={<InsightDetail />} />
        <Route path="/team" element={<Team />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="/projects/:id" element={<ProjectDetail />} />
      <Route path="/tasks/:id" element={<TaskDetail />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
