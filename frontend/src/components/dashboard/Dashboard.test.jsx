import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from './Dashboard.jsx'

const mockStats = {
  totalProjects: 5,
  activeCollaborators: 12,
  aiInsightsGenerated: 124,
  tasksCompleted: 47,
  recentActivity: [],
}

const mockProjectsResp = {
  projects: [
    {
      id: 'proj_1',
      name: 'Test Project',
      status: 'active',
      collaborators: [],
      lastActivity: new Date().toISOString(),
      aiInsightsCount: 3,
      description: 'A test project',
    },
  ],
}

const mockActivityResp = {
  activities: [
    {
      id: 'act_1',
      type: 'document_created',
      user: { id: 'u1', name: 'Alice Chen' },
      action: 'created a document',
      target: 'Market Analysis',
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    },
  ],
}

const mockInsightsResp = {
  insights: [
    {
      id: 'ins_1',
      title: 'Performance Opportunity',
      description: 'Switch to chain-of-thought prompting.',
      type: 'performance',
      priority: 'high',
      createdAt: new Date().toISOString(),
    },
  ],
}

const mockNotifResp = {
  notifications: [
    { id: 'n1', type: 'mention', read: false, message: 'Hi', createdAt: new Date().toISOString() },
    { id: 'n2', type: 'insight', read: true,  message: 'New insight', createdAt: new Date().toISOString() },
  ],
}

function setupFetch() {
  global.fetch = vi.fn((url) => {
    const map = {
      '/api/dashboard/stats':         mockStats,
      '/api/dashboard/projects':      mockProjectsResp,
      '/api/dashboard/activity':      mockActivityResp,
      '/api/dashboard/insights':      mockInsightsResp,
      '/api/dashboard/notifications': mockNotifResp,
    }
    const key = Object.keys(map).find((k) => url.includes(k))
    return Promise.resolve({ ok: true, json: () => Promise.resolve(key ? map[key] : {}) })
  })
}

beforeEach(setupFetch)
afterEach(() => vi.restoreAllMocks())

const renderDashboard = () =>
  render(<MemoryRouter><Dashboard /></MemoryRouter>)

describe('Dashboard', () => {
  it('renders without crashing', () => {
    renderDashboard()
    expect(document.body).toBeTruthy()
  })

  it('shows header greeting', () => {
    renderDashboard()
    expect(screen.getByText(/Good morning/i)).toBeInTheDocument()
  })

  it('shows loading skeleton cards initially', () => {
    global.fetch = vi.fn(() => new Promise(() => {})) // never resolves
    renderDashboard()
    // In loading state, StatsCards show skeleton divs (no stat values)
    expect(screen.queryByText('Total Projects')).not.toBeInTheDocument()
  })

  it('renders stat cards after data loads', async () => {
    renderDashboard()
    await waitFor(() => expect(screen.getByText('Total Projects')).toBeInTheDocument())
    expect(screen.getByText('Active Collaborators')).toBeInTheDocument()
    // 'AI Insights' appears in both the stat card and the insights panel heading
    expect(screen.getAllByText('AI Insights').length).toBeGreaterThan(0)
    expect(screen.getByText('Tasks Completed')).toBeInTheDocument()
  })

  it('renders stat values after data loads', async () => {
    renderDashboard()
    await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument())
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('renders activity feed after data loads', async () => {
    renderDashboard()
    await waitFor(() => expect(screen.getByText('Alice Chen')).toBeInTheDocument())
  })

  it('renders AI insights after data loads', async () => {
    renderDashboard()
    await waitFor(() => expect(screen.getByText('Performance Opportunity')).toBeInTheDocument())
  })

  it('renders projects list after data loads', async () => {
    renderDashboard()
    await waitFor(() => expect(screen.getAllByText('Test Project').length).toBeGreaterThan(0))
  })

  it('shows unread notification count badge', async () => {
    renderDashboard()
    await waitFor(() => expect(screen.getByLabelText('1 unread notifications')).toBeInTheDocument())
  })

  it('shows error state when fetch fails', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) }))
    renderDashboard()
    await waitFor(() => expect(screen.getByText(/Could not load dashboard/i)).toBeInTheDocument())
  })
})
