import React from 'react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import TaskDetail from './TaskDetail.jsx'

const mockTask = {
  id: 'task_1',
  projectId: 'proj_1',
  title: 'Write spec',
  description: 'Draft the spec doc',
  status: 'TODO',
  priority: 'MEDIUM',
  assigneeId: null,
  assignee: null,
  createdById: 'demo-user-1',
  createdBy: { id: 'demo-user-1', name: 'Demo User', email: 'demo@test.com' },
  commentCount: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const mockProject = {
  id: 'proj_1',
  name: 'Launch Plan',
  members: [
    { id: 'mem_1', projectId: 'proj_1', userId: 'demo-user-1', email: 'owner@test.com', name: 'Owner Person', role: 'OWNER', status: 'ACTIVE' },
  ],
}

const mockComment = {
  id: 'comment_1',
  taskId: 'task_1',
  authorId: 'demo-user-1',
  author: { id: 'demo-user-1', name: 'Demo User', email: 'demo@test.com' },
  body: 'Looks good',
  createdAt: new Date().toISOString(),
}

function jsonResponse(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })
}

function renderPage(id = 'task_1') {
  return render(
    <MemoryRouter initialEntries={[`/tasks/${id}`]}>
      <Routes>
        <Route path="/tasks/:id" element={<TaskDetail />} />
        <Route path="/projects/:id" element={<div>Project Page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  global.fetch = vi.fn((url, options = {}) => {
    const method = options.method ?? 'GET'
    if (url === '/api/tasks/task_1' && method === 'GET') return jsonResponse({ data: mockTask })
    if (url === '/api/tasks/task_1/comments' && method === 'GET') return jsonResponse({ data: [mockComment], total: 1 })
    if (url === '/api/projects/proj_1' && method === 'GET') return jsonResponse({ data: mockProject })
    return jsonResponse({}, 404)
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('TaskDetail', () => {
  it('shows a loading skeleton before data resolves', () => {
    const { container } = renderPage()
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders task title, description, status, and priority after loading', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Write spec')).toBeInTheDocument())
    expect(screen.getByText('Draft the spec doc')).toBeInTheDocument()
    expect(screen.getByText('To Do')).toBeInTheDocument()
    expect(screen.getByText('MEDIUM')).toBeInTheDocument()
    expect(screen.getByText(/unassigned/i)).toBeInTheDocument()
  })

  it('renders an error state when the task fetch fails', async () => {
    global.fetch = vi.fn(() => jsonResponse({ error: 'NOT_FOUND', message: 'Task not found' }, 404))
    renderPage()
    await waitFor(() => expect(screen.getByText(/could not load task/i)).toBeInTheDocument())
    expect(screen.getByText('Task not found')).toBeInTheDocument()
  })

  it('renders the comment thread with existing comments', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Write spec')).toBeInTheDocument())
    expect(screen.getByText('Looks good')).toBeInTheDocument()
  })

  it('enters edit mode and saves updated task details', async () => {
    const updated = { ...mockTask, title: 'Renamed task' }
    global.fetch = vi.fn((url, options = {}) => {
      const method = options.method ?? 'GET'
      if (url === '/api/tasks/task_1' && method === 'GET') return jsonResponse({ data: mockTask })
      if (url === '/api/tasks/task_1/comments' && method === 'GET') return jsonResponse({ data: [mockComment], total: 1 })
      if (url === '/api/projects/proj_1' && method === 'GET') return jsonResponse({ data: mockProject })
      if (url === '/api/tasks/task_1' && method === 'PATCH') return jsonResponse({ data: updated })
      return jsonResponse({}, 404)
    })
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(screen.getByText('Write spec')).toBeInTheDocument())

    await user.click(screen.getByLabelText(/edit task/i))
    const titleInput = screen.getByLabelText(/^title$/i)
    await user.clear(titleInput)
    await user.type(titleInput, 'Renamed task')
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(screen.getByText('Renamed task')).toBeInTheDocument())
  })

  it('fetches project members for the assignee picker once the task loads', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(screen.getByText('Write spec')).toBeInTheDocument())

    await user.click(screen.getByLabelText(/edit task/i))
    expect(await screen.findByRole('option', { name: 'Owner Person' })).toBeInTheDocument()
  })

  it('requires a two-step confirmation before deleting, then navigates to the project', async () => {
    global.fetch = vi.fn((url, options = {}) => {
      const method = options.method ?? 'GET'
      if (url === '/api/tasks/task_1' && method === 'GET') return jsonResponse({ data: mockTask })
      if (url === '/api/tasks/task_1/comments' && method === 'GET') return jsonResponse({ data: [mockComment], total: 1 })
      if (url === '/api/projects/proj_1' && method === 'GET') return jsonResponse({ data: mockProject })
      if (url === '/api/tasks/task_1' && method === 'DELETE') {
        return Promise.resolve({ ok: true, status: 204, json: () => Promise.resolve(null) })
      }
      return jsonResponse({}, 404)
    })
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(screen.getByText('Write spec')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /^delete$/i }))
    expect(screen.getByRole('button', { name: /confirm delete/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /confirm delete/i }))

    await waitFor(() => expect(screen.getByText('Project Page')).toBeInTheDocument())
  })

  it('shows a delete error and resets confirmation state on failure', async () => {
    global.fetch = vi.fn((url, options = {}) => {
      const method = options.method ?? 'GET'
      if (url === '/api/tasks/task_1' && method === 'GET') return jsonResponse({ data: mockTask })
      if (url === '/api/tasks/task_1/comments' && method === 'GET') return jsonResponse({ data: [mockComment], total: 1 })
      if (url === '/api/projects/proj_1' && method === 'GET') return jsonResponse({ data: mockProject })
      if (url === '/api/tasks/task_1' && method === 'DELETE') {
        return jsonResponse({ error: 'FORBIDDEN', message: 'Only the creator or an admin can delete this task' }, 403)
      }
      return jsonResponse({}, 404)
    })
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(screen.getByText('Write spec')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /^delete$/i }))
    await user.click(screen.getByRole('button', { name: /confirm delete/i }))

    await waitFor(() => expect(screen.getByText('Only the creator or an admin can delete this task')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument()
  })

  it('adds a comment through the CommentThread', async () => {
    const newComment = { ...mockComment, id: 'comment_2', body: 'New comment here' }
    global.fetch = vi.fn((url, options = {}) => {
      const method = options.method ?? 'GET'
      if (url === '/api/tasks/task_1' && method === 'GET') return jsonResponse({ data: mockTask })
      if (url === '/api/tasks/task_1/comments' && method === 'GET') return jsonResponse({ data: [mockComment], total: 1 })
      if (url === '/api/projects/proj_1' && method === 'GET') return jsonResponse({ data: mockProject })
      if (url === '/api/tasks/task_1/comments' && method === 'POST') return jsonResponse({ data: newComment }, 201)
      return jsonResponse({}, 404)
    })
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(screen.getByText('Write spec')).toBeInTheDocument())

    await user.type(screen.getByLabelText(/add a comment/i), 'New comment here')
    await user.click(screen.getByRole('button', { name: /post comment/i }))

    await waitFor(() => expect(screen.getByText('New comment here')).toBeInTheDocument())
  })
})
