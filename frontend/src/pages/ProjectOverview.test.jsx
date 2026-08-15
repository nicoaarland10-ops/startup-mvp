import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProjectOverview from './ProjectOverview.jsx'

const mockOverview = {
  project: {
    id: 'proj_002',
    name: 'RAG Knowledge Base',
    description: 'Retrieval-augmented generation pipeline.',
    status: 'active',
    collaborators: [{ id: 'u1', name: 'Bob Ramirez' }],
    aiInsightsCount: 18,
    lastActivity: new Date().toISOString(),
  },
  insights: [{ id: 'ins_001', title: 'Review Cycle Bottleneck', priority: 'high' }],
  activity: [{ id: 'act_002', type: 'ai_analysis_run', user: { name: 'Bob Ramirez' }, action: 'ran AI analysis', target: 'Chunking comparison', timestamp: new Date().toISOString() }],
}

afterEach(() => {
  vi.restoreAllMocks()
})

function renderPage() {
  global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockOverview }) }))
  return render(
    <MemoryRouter initialEntries={['/dashboard/projects/proj_002']}>
      <Routes>
        <Route path="/dashboard/projects/:id" element={<ProjectOverview />} />
        <Route path="/insights/:id" element={<div>Insight detail page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProjectOverview', () => {
  it('renders project details, insights, and activity once loaded', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('RAG Knowledge Base')).toBeInTheDocument())
    expect(screen.getByText('Retrieval-augmented generation pipeline.')).toBeInTheDocument()
    expect(screen.getByText('Review Cycle Bottleneck')).toBeInTheDocument()
    expect(screen.getByText(/ran AI analysis/)).toBeInTheDocument()
  })

  it('links an insight to its detail page', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Review Cycle Bottleneck')).toBeInTheDocument())
    expect(screen.getByText('Review Cycle Bottleneck').closest('a')).toHaveAttribute('href', '/insights/ins_001')
  })
})
