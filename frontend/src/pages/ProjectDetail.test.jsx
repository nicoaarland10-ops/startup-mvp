import React from 'react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProjectDetail from './ProjectDetail.jsx'

const mockProject = {
  id: 'proj_1',
  name: 'Launch Plan',
  description: 'Everything for the Q3 launch',
  ownerId: 'demo-user-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  members: [
    { id: 'mem_1', projectId: 'proj_1', userId: 'demo-user-1', email: 'owner@test.com', name: 'Owner Person', role: 'OWNER', status: 'ACTIVE', invitedAt: new Date().toISOString() },
  ],
}

function jsonResponse(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })
}

function renderPage(id = 'proj_1') {
  return render(
    <MemoryRouter initialEntries={[`/projects/${id}`]}>
      <Routes>
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  global.fetch = vi.fn((url, options = {}) => {
    const method = options.method ?? 'GET'
    if (url === '/api/projects/proj_1' && method === 'GET') {
      return jsonResponse({ data: mockProject })
    }
    return jsonResponse({}, 404)
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ProjectDetail', () => {
  it('shows a loading skeleton before data resolves', () => {
    const { container } = renderPage()
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders project name and description after loading', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Launch Plan')).toBeInTheDocument())
    expect(screen.getByText('Everything for the Q3 launch')).toBeInTheDocument()
  })

  it('renders an error state when the fetch fails', async () => {
    global.fetch = vi.fn(() => jsonResponse({ error: 'NOT_FOUND', message: 'Project not found' }, 404))
    renderPage()
    await waitFor(() => expect(screen.getByText(/could not load project/i)).toBeInTheDocument())
    expect(screen.getByText('Project not found')).toBeInTheDocument()
  })

  it('renders members and invite form', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Launch Plan')).toBeInTheDocument())
    expect(screen.getByText('Owner Person')).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
  })

  it('enters edit mode and saves updated project details', async () => {
    const updated = { ...mockProject, name: 'Renamed Plan' }
    global.fetch = vi.fn((url, options = {}) => {
      const method = options.method ?? 'GET'
      if (method === 'GET') return jsonResponse({ data: mockProject })
      if (method === 'PATCH') return jsonResponse({ data: updated })
      return jsonResponse({}, 404)
    })
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(screen.getByText('Launch Plan')).toBeInTheDocument())

    await user.click(screen.getByLabelText(/edit project/i))
    const nameInput = screen.getByLabelText(/^name$/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Renamed Plan')
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(screen.getByText('Renamed Plan')).toBeInTheDocument())
  })

  it('requires a two-step confirmation before deleting, then navigates away', async () => {
    global.fetch = vi.fn((url, options = {}) => {
      const method = options.method ?? 'GET'
      if (method === 'GET') return jsonResponse({ data: mockProject })
      if (method === 'DELETE') return Promise.resolve({ ok: true, status: 204, json: () => Promise.resolve(null) })
      return jsonResponse({}, 404)
    })
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(screen.getByText('Launch Plan')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /^delete$/i }))
    expect(screen.getByRole('button', { name: /confirm delete/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /confirm delete/i }))

    await waitFor(() => expect(screen.getByText('Dashboard Page')).toBeInTheDocument())
  })

  it('shows a delete error and resets confirmation state on failure', async () => {
    global.fetch = vi.fn((url, options = {}) => {
      const method = options.method ?? 'GET'
      if (method === 'GET') return jsonResponse({ data: mockProject })
      if (method === 'DELETE') return jsonResponse({ error: 'FORBIDDEN', message: 'Only the owner can delete this project' }, 403)
      return jsonResponse({}, 404)
    })
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(screen.getByText('Launch Plan')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /^delete$/i }))
    await user.click(screen.getByRole('button', { name: /confirm delete/i }))

    await waitFor(() => expect(screen.getByText('Only the owner can delete this project')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument()
  })

  it('invites a member through the InviteForm', async () => {
    const newMember = { id: 'mem_2', projectId: 'proj_1', userId: null, email: 'new@test.com', name: null, role: 'MEMBER', status: 'PENDING', invitedAt: new Date().toISOString() }
    global.fetch = vi.fn((url, options = {}) => {
      const method = options.method ?? 'GET'
      if (method === 'GET') return jsonResponse({ data: mockProject })
      if (method === 'POST') return jsonResponse({ data: newMember }, 201)
      return jsonResponse({}, 404)
    })
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(screen.getByText('Launch Plan')).toBeInTheDocument())

    await user.type(screen.getByLabelText(/email address/i), 'new@test.com')
    await user.click(screen.getByRole('button', { name: /send invite/i }))

    await waitFor(() => expect(screen.getByText('new@test.com')).toBeInTheDocument())
  })

  it('changes a member role and removes a member', async () => {
    const admin = { id: 'mem_2', projectId: 'proj_1', userId: 'u2', email: 'admin@test.com', name: 'Admin Person', role: 'MEMBER', status: 'ACTIVE', invitedAt: new Date().toISOString() }
    const projectWithAdmin = { ...mockProject, members: [...mockProject.members, admin] }
    const promoted = { ...admin, role: 'ADMIN' }

    global.fetch = vi.fn((url, options = {}) => {
      const method = options.method ?? 'GET'
      if (method === 'GET') return jsonResponse({ data: projectWithAdmin })
      if (method === 'PATCH') return jsonResponse({ data: promoted })
      if (method === 'DELETE') return Promise.resolve({ ok: true, status: 204, json: () => Promise.resolve(null) })
      return jsonResponse({}, 404)
    })
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(screen.getByText('Admin Person')).toBeInTheDocument())

    await user.selectOptions(screen.getByLabelText(/change role for admin person/i), 'ADMIN')
    await waitFor(() => expect(screen.getByLabelText(/change role for admin person/i)).toHaveValue('ADMIN'))

    await user.click(screen.getByLabelText(/remove admin person/i))
    await user.click(screen.getByRole('button', { name: /confirm/i }))

    await waitFor(() => expect(screen.queryByText('Admin Person')).not.toBeInTheDocument())
  })
})
