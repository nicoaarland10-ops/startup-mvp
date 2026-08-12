import { Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './components/dashboard/Dashboard.jsx'
import ProjectDetail from './pages/ProjectDetail.jsx'
import TaskDetail from './pages/TaskDetail.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/projects/:id" element={<ProjectDetail />} />
      <Route path="/tasks/:id" element={<TaskDetail />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
