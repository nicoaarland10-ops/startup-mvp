import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import KanbanBoard from './KanbanBoard.jsx'

const members = [
  { id: 'mem_1', projectId: 'proj_1', userId: 'u1', email: 'owner@test.com', name: 'Owner Person', role: 'OWNER', status: 'ACTIVE' },
]

const todoTask = {
  id: 'task_1',
  projectId: 'proj_1',
  title: 'Write spec',
  description: '',
  status: 'TODO',
  priority: 'URGENT',
  assigneeId: null,
  assignee: null,
  createdById: 'demo-user-1',
  createdBy: { id: 'demo-user-1', name: 'Demo User', email: 'demo@test.com' },
  commentCount: 2,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const doneTask = {
  ...todoTask,
  id: 'task_2',
  title: 'Ship feature',
  status: 'DONE',
  priority: 'LOW',
  assigneeId: 'u1',
  assignee: { id: 'u1', name: 'Owner Person', email: 'owner@test.com' },
  commentCount: 0,
}

function jsonResponse(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })
}

function renderBoard(props = {}) {
  return render(
    <MemoryRouter>
      <KanbanBoard projectId="proj_1" members={members} {...props} />
    </MemoryRouter>
  )
}

beforeEach(() => {
  global.fetch = vi.fn((url, options = {}) => {
    const method = options.method ?? 'GET'
    if (typeof url === 'string' && url.startsWith('/api/tasks?') && method === 'GET') {
      return jsonResponse({ data: [todoTask, doneTask], pagination: {} })
    }
    return jsonResponse({}, 404)
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('KanbanBoard', () => {
  it('shows loading skeletons before tasks resolve', () => {
    renderBoard()
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('renders all four columns and places tasks in the correct column', async () => {
    renderBoard()
    await waitFor(() => expect(screen.getByText('Write spec')).toBeInTheDocument())

    expect(screen.getByRole('heading', { name: 'To Do' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'In Progress' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'In Review' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Done' })).toBeInTheDocument()
    expect(screen.getByText('Ship feature')).toBeInTheDocument()
  })

  it('shows an empty state for columns with no tasks', async () => {
    renderBoard()
    await waitFor(() => expect(screen.getByText('Write spec')).toBeInTheDocument())
    expect(screen.getAllByText('No tasks').length).toBeGreaterThan(0)
  })

  it('shows priority badge, assignee, and comment count on cards', async () => {
    renderBoard()
    await waitFor(() => expect(screen.getByText('Write spec')).toBeInTheDocument())
    expect(screen.getByText('URGENT')).toBeInTheDocument()
    expect(screen.getByText('Unassigned')).toBeInTheDocument()
    expect(screen.getByText('Owner Person')).toBeInTheDocument()
  })

  it('renders task titles as links to the task detail page', async () => {
    renderBoard()
    await waitFor(() => expect(screen.getByText('Write spec')).toBeInTheDocument())
    expect(screen.getByRole('link', { name: 'Write spec' })).toHaveAttribute('href', '/tasks/task_1')
  })

  it('moves a card between columns via the status select', async () => {
    const updated = { ...todoTask, status: 'IN_PROGRESS' }
    global.fetch = vi.fn((url, options = {}) => {
      const method = options.method ?? 'GET'
      if (typeof url === 'string' && url.startsWith('/api/tasks?') && method === 'GET') {
        return jsonResponse({ data: [todoTask, doneTask], pagination: {} })
      }
      if (url === '/api/tasks/task_1' && method === 'PATCH') return jsonResponse({ data: updated })
      return jsonResponse({}, 404)
    })
    const user = userEvent.setup()
    renderBoard()
    await waitFor(() => expect(screen.getByText('Write spec')).toBeInTheDocument())

    await user.selectOptions(screen.getByLabelText(/change status for write spec/i), 'IN_PROGRESS')

    const patchCall = await waitFor(() =>
      global.fetch.mock.calls.find(([, opts]) => opts?.method === 'PATCH')
    )
    expect(JSON.parse(patchCall[1].body)).toEqual({ status: 'IN_PROGRESS' })
  })

  it('opens the new task form and creates a task', async () => {
    const created = { ...todoTask, id: 'task_3', title: 'Brand new task', status: 'TODO' }
    global.fetch = vi.fn((url, options = {}) => {
      const method = options.method ?? 'GET'
      if (typeof url === 'string' && url.startsWith('/api/tasks?') && method === 'GET') {
        return jsonResponse({ data: [todoTask, doneTask], pagination: {} })
      }
      if (url === '/api/tasks' && method === 'POST') return jsonResponse({ data: created }, 201)
      return jsonResponse({}, 404)
    })
    const user = userEvent.setup()
    renderBoard()
    await waitFor(() => expect(screen.getByText('Write spec')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /\+ new task/i }))
    await user.type(screen.getByLabelText(/title/i), 'Brand new task')
    await user.click(screen.getByRole('button', { name: /create task/i }))

    await waitFor(() => expect(screen.getByText('Brand new task')).toBeInTheDocument())
    expect(screen.queryByLabelText(/^title$/i)).not.toBeInTheDocument()
  })

  it('cancels the new task form without creating a task', async () => {
    const user = userEvent.setup()
    renderBoard()
    await waitFor(() => expect(screen.getByText('Write spec')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /\+ new task/i }))
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByLabelText(/^title$/i)).not.toBeInTheDocument()
  })

  it('renders an error message when the initial fetch fails', async () => {
    global.fetch = vi.fn(() => jsonResponse({ error: 'FORBIDDEN', message: 'Not a project member' }, 403))
    renderBoard()
    await waitFor(() => expect(screen.getByText('Not a project member')).toBeInTheDocument())
  })
})
