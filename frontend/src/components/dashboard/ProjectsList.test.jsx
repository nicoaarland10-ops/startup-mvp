import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProjectsList from './ProjectsList.jsx'

const mockProjects = [
  {
    id: 'proj_1',
    name: 'LLM Prompt Optimisation',
    description: 'Systematic evaluation of prompt templates.',
    status: 'active',
    collaborators: [{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }],
    lastActivity: new Date(Date.now() - 86400000).toISOString(), // yesterday
    aiInsightsCount: 24,
  },
  {
    id: 'proj_2',
    name: 'Fine-Tuning Pipeline',
    description: 'Automated supervised fine-tuning workflow.',
    status: 'completed',
    collaborators: [{ id: 'u4' }],
    lastActivity: new Date(Date.now() - 5 * 86400000).toISOString(), // 5 days ago
    aiInsightsCount: 31,
  },
  {
    id: 'proj_3',
    name: 'Vision Agent',
    description: 'Multimodal agent for UI testing.',
    status: 'in_review',
    collaborators: [],
    lastActivity: new Date().toISOString(), // today
    aiInsightsCount: 9,
  },
]

function renderList(projects = mockProjects) {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<ProjectsList projects={projects} />} />
        <Route path="/dashboard/projects/:id" element={<div>Project overview page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProjectsList', () => {
  it('renders section heading', () => {
    renderList()
    expect(screen.getByText('Projects')).toBeInTheDocument()
  })

  it('renders all project names', () => {
    renderList()
    expect(screen.getAllByText('LLM Prompt Optimisation').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Fine-Tuning Pipeline').length).toBeGreaterThan(0)
  })

  it('shows total project count', () => {
    renderList()
    expect(screen.getByText('3 total')).toBeInTheDocument()
  })

  it('shows status badges', () => {
    renderList()
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0)
    expect(screen.getAllByText('In Review').length).toBeGreaterThan(0)
  })

  it('shows collaborator counts', () => {
    renderList()
    // 3 members for proj_1 — appears in both table and mobile
    expect(screen.getAllByText('3').length).toBeGreaterThan(0)
  })

  it('shows AI insights counts', () => {
    renderList()
    expect(screen.getAllByText('24').length).toBeGreaterThan(0)
  })

  it('shows relative dates', () => {
    renderList()
    expect(screen.getAllByText('Yesterday').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Today').length).toBeGreaterThan(0)
  })

  it('shows empty state when no projects', () => {
    renderList([])
    expect(screen.getByText(/No projects yet/i)).toBeInTheDocument()
  })

  it('shows empty state when prop omitted', () => {
    render(
      <MemoryRouter>
        <ProjectsList />
      </MemoryRouter>,
    )
    expect(screen.getByText(/No projects yet/i)).toBeInTheDocument()
  })

  it('links a project name to its overview page', () => {
    renderList()
    const link = screen.getAllByRole('link', { name: 'LLM Prompt Optimisation' })[0]
    expect(link).toHaveAttribute('href', '/dashboard/projects/proj_1')
  })

  it('navigates to the project overview when a table row is clicked', () => {
    renderList()
    fireEvent.click(screen.getAllByText('Fine-Tuning Pipeline')[0])
    expect(screen.getByText('Project overview page')).toBeInTheDocument()
  })
})
