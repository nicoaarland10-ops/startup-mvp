import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Team from './Team.jsx'

const mockMembers = [
  { id: 'usr_001', name: 'Alice Chen', avatar: null, projectCount: 3, projects: [{ id: 'proj_001', name: 'LLM Prompt Optimisation' }], openInsights: 2 },
  { id: 'usr_002', name: 'Bob Ramirez', avatar: null, projectCount: 0, projects: [], openInsights: 0 },
]

afterEach(() => {
  vi.restoreAllMocks()
})

function renderPage() {
  global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockMembers, total: 2 }) }))
  return render(<MemoryRouter><Team /></MemoryRouter>)
}

describe('Team', () => {
  it('renders team members once loaded', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Alice Chen')).toBeInTheDocument())
    expect(screen.getByText('Bob Ramirez')).toBeInTheDocument()
  })

  it('links a project chip to its overview page', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('LLM Prompt Optimisation')).toBeInTheDocument())
    expect(screen.getByText('LLM Prompt Optimisation').closest('a')).toHaveAttribute('href', '/dashboard/projects/proj_001')
  })
})
