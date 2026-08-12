import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useTasks } from './useTasks.js'

const task1 = {
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
  commentCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const task2 = {
  ...task1,
  id: 'task_2',
  title: 'Build UI',
  status: 'IN_PROGRESS',
}

function jsonResponse(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })
}

beforeEach(() => {
  global.fetch = vi.fn((url, options = {}) => {
    const method = options.method ?? 'GET'
    if (typeof url === 'string' && url.startsWith('/api/tasks?') && method === 'GET') {
      return jsonResponse({
        data: [task1, task2],
        pagination: { page: 1, limit: 20, total: 2, totalPages: 1, hasNextPage: false, hasPrevPage: false },
      })
    }
    return jsonResponse({}, 404)
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useTasks', () => {
  it('starts in loading state', () => {
    const { result } = renderHook(() => useTasks('proj_1'))
    expect(result.current.loading).toBe(true)
    expect(result.current.tasks).toEqual([])
  })

  it('resolves tasks after fetch completes', async () => {
    const { result } = renderHook(() => useTasks('proj_1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.tasks).toEqual([task1, task2])
    expect(result.current.error).toBeNull()
  })

  it('requires a projectId in the query string', async () => {
    const { result } = renderHook(() => useTasks('proj_1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const [url] = global.fetch.mock.calls[0]
    expect(url).toContain('projectId=proj_1')
  })

  it('includes filters in the query string', async () => {
    const { result } = renderHook(() => useTasks('proj_1', { status: 'TODO', priority: 'HIGH', assigneeId: 'u1' }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const [url] = global.fetch.mock.calls[0]
    expect(url).toContain('status=TODO')
    expect(url).toContain('priority=HIGH')
    expect(url).toContain('assigneeId=u1')
  })

  it('does not refetch when a new filters object with the same contents is passed', async () => {
    const { result, rerender } = renderHook(
      ({ filters }) => useTasks('proj_1', filters),
      { initialProps: { filters: { status: 'TODO' } } }
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    const callsAfterFirst = global.fetch.mock.calls.length

    rerender({ filters: { status: 'TODO' } })
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(global.fetch.mock.calls.length).toBe(callsAfterFirst)
  })

  it('sets error message from JSON error body on failure', async () => {
    global.fetch = vi.fn(() => jsonResponse({ error: 'FORBIDDEN', message: 'Not a project member' }, 403))
    const { result } = renderHook(() => useTasks('proj_1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Not a project member')
  })

  it('createTask posts and prepends the new task to local state', async () => {
    const created = { ...task1, id: 'task_3', title: 'New task' }
    global.fetch = vi.fn((url, options = {}) => {
      const method = options.method ?? 'GET'
      if (method === 'GET') {
        return jsonResponse({ data: [task1, task2], pagination: {} })
      }
      if (method === 'POST') return jsonResponse({ data: created }, 201)
      return jsonResponse({}, 404)
    })
    const { result } = renderHook(() => useTasks('proj_1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.createTask({ title: 'New task' })
    })

    expect(result.current.tasks[0]).toEqual(created)
    expect(result.current.tasks).toHaveLength(3)

    const postCall = global.fetch.mock.calls.find(([, opts]) => opts?.method === 'POST')
    expect(JSON.parse(postCall[1].body)).toMatchObject({ projectId: 'proj_1', title: 'New task' })
  })

  it('updateTaskStatus patches and updates the matching task in local state', async () => {
    const updated = { ...task1, status: 'DONE' }
    global.fetch = vi.fn((url, options = {}) => {
      const method = options.method ?? 'GET'
      if (method === 'GET') return jsonResponse({ data: [task1, task2], pagination: {} })
      if (method === 'PATCH') return jsonResponse({ data: updated })
      return jsonResponse({}, 404)
    })
    const { result } = renderHook(() => useTasks('proj_1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.updateTaskStatus('task_1', 'DONE')
    })

    expect(result.current.tasks.find((t) => t.id === 'task_1').status).toBe('DONE')
  })

  it('deleteTask calls DELETE and removes the task locally', async () => {
    global.fetch = vi.fn((url, options = {}) => {
      const method = options.method ?? 'GET'
      if (method === 'GET') return jsonResponse({ data: [task1, task2], pagination: {} })
      if (method === 'DELETE') return Promise.resolve({ ok: true, status: 204, json: () => Promise.resolve(null) })
      return jsonResponse({}, 404)
    })
    const { result } = renderHook(() => useTasks('proj_1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.deleteTask('task_1')
    })

    expect(result.current.tasks.find((t) => t.id === 'task_1')).toBeUndefined()
    expect(result.current.tasks).toHaveLength(1)
  })

  it('exposes a refetch function', async () => {
    const { result } = renderHook(() => useTasks('proj_1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(typeof result.current.refetch).toBe('function')
  })
})
