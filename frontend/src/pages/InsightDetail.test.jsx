import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import InsightDetail from './InsightDetail.jsx'

const mockInsight = {
  id: 'ins_001',
  title: 'Review Cycle Bottleneck Detected',
  description: 'PR review latency increased by 38%.',
  type: 'collaboration',
  priority: 'high',
  status: 'active',
  project: { id: 'proj_002', name: 'RAG Knowledge Base' },
  recommendedActions: ['Redistribute reviewer load', 'Set a 24-hour SLA'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

function jsonResponse(body, status = 200) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) })
}

afterEach(() => {
  vi.restoreAllMocks()
})

function renderPage(insight = mockInsight) {
  global.fetch = vi.fn((url, options = {}) => {
    if (options.method === 'PATCH') return jsonResponse({ data: { ...insight, status: 'resolved' } })
    return jsonResponse({ data: insight })
  })
  return render(
    <MemoryRouter initialEntries={[`/insights/${insight.id}`]}>
      <Routes>
        <Route path="/insights/:id" element={<InsightDetail />} />
        <Route path="/dashboard/projects/:id" element={<div>Project overview page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('InsightDetail', () => {
  it('renders the title, description, and recommended actions once loaded', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Review Cycle Bottleneck Detected')).toBeInTheDocument())
    expect(screen.getByText('PR review latency increased by 38%.')).toBeInTheDocument()
    expect(screen.getByText('Redistribute reviewer load')).toBeInTheDocument()
    expect(screen.getByText('Set a 24-hour SLA')).toBeInTheDocument()
  })

  it('links to the related project', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText(/RAG Knowledge Base/)).toBeInTheDocument())
    const link = screen.getByText(/RAG Knowledge Base/)
    expect(link.closest('a')).toHaveAttribute('href', '/dashboard/projects/proj_002')
  })

  it('shows resolve/snooze/archive actions for an active insight', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Mark resolved')).toBeInTheDocument())
    expect(screen.getByText('Snooze 1 week')).toBeInTheDocument()
    expect(screen.getByText('Archive')).toBeInTheDocument()
  })

  it('shows reopen for a resolved insight', async () => {
    renderPage({ ...mockInsight, status: 'resolved' })
    await waitFor(() => expect(screen.getByText('Reopen')).toBeInTheDocument())
    expect(screen.queryByText('Mark resolved')).not.toBeInTheDocument()
  })

  it('resolves the insight when "Mark resolved" is clicked', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Mark resolved')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Mark resolved'))
    await waitFor(() => expect(screen.getByText('Reopen')).toBeInTheDocument())
  })
})
