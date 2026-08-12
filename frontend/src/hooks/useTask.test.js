import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useTask } from './useTask.js'

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

beforeEach(() => {
  global.fetch = vi.fn((url, options = {}) => {
    const method = options.method ?? 'GET'
    if (url === '/api/tasks/task_1' && method === 'GET') {
      return jsonResponse({ data: mockTask })
    }
    if (url === '/api/tasks/task_1/comments' && method === 'GET') {
      return jsonResponse({ data: [mockComment], total: 1 })
    }
    return jsonResponse({}, 404)
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useTask', () => {
  it('starts in loading state', () => {
    const { result } = renderHook(() => useTask('task_1'))
    expect(result.current.loading).toBe(true)
    expect(result.current.task).toBeNull()
    expect(result.current.comments).toEqual([])
  })

  it('resolves task and comments in parallel', async () => {
    const { result } = renderHook(() => useTask('task_1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.task).toEqual(mockTask)
    expect(result.current.comments).toEqual([mockComment])
    expect(result.current.error).toBeNull()
  })

  it('sets error message when the task fetch fails', async () => {
    global.fetch = vi.fn(() => jsonResponse({ error: 'NOT_FOUND', message: 'Task not found' }, 404))
    const { result } = renderHook(() => useTask('missing'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Task not found')
  })

  it('updateTask patches and replaces local task state', async () => {
    const updated = { ...mockTask, status: 'IN_PROGRESS' }
    global.fetch = vi.fn((url, options = {}) => {
      const method = options.method ?? 'GET'
      if (url === '/api/tasks/task_1' && method === 'GET') return jsonResponse({ data: mockTask })
      if (url === '/api/tasks/task_1/comments' && method === 'GET') return jsonResponse({ data: [mockComment], total: 1 })
      if (url === '/api/tasks/task_1' && method === 'PATCH') return jsonResponse({ data: updated })
      return jsonResponse({}, 404)
    })
    const { result } = renderHook(() => useTask('task_1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.updateTask({ status: 'IN_PROGRESS' })
    })

    expect(result.current.task.status).toBe('IN_PROGRESS')
  })

  it('deleteTask calls the DELETE endpoint', async () => {
    global.fetch = vi.fn((url, options = {}) => {
      const method = options.method ?? 'GET'
      if (url === '/api/tasks/task_1' && method === 'GET') return jsonResponse({ data: mockTask })
      if (url === '/api/tasks/task_1/comments' && method === 'GET') return jsonResponse({ data: [mockComment], total: 1 })
      if (url === '/api/tasks/task_1' && method === 'DELETE') {
        return Promise.resolve({ ok: true, status: 204, json: () => Promise.resolve(null) })
      }
      return jsonResponse({}, 404)
    })
    const { result } = renderHook(() => useTask('task_1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.deleteTask()
    })

    const deleteCall = global.fetch.mock.calls.find(([, opts]) => opts?.method === 'DELETE')
    expect(deleteCall[0]).toBe('/api/tasks/task_1')
  })

  it('addComment posts and appends the new comment to local state', async () => {
    const newComment = { ...mockComment, id: 'comment_2', body: 'Another comment' }
    global.fetch = vi.fn((url, options = {}) => {
      const method = options.method ?? 'GET'
      if (url === '/api/tasks/task_1' && method === 'GET') return jsonResponse({ data: mockTask })
      if (url === '/api/tasks/task_1/comments' && method === 'GET') return jsonResponse({ data: [mockComment], total: 1 })
      if (url === '/api/tasks/task_1/comments' && method === 'POST') return jsonResponse({ data: newComment }, 201)
      return jsonResponse({}, 404)
    })
    const { result } = renderHook(() => useTask('task_1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.addComment('Another comment')
    })

    expect(result.current.comments).toHaveLength(2)
    expect(result.current.comments[1]).toEqual(newComment)
  })

  it('addComment throws with the server error message on failure', async () => {
    global.fetch = vi.fn((url, options = {}) => {
      const method = options.method ?? 'GET'
      if (url === '/api/tasks/task_1' && method === 'GET') return jsonResponse({ data: mockTask })
      if (url === '/api/tasks/task_1/comments' && method === 'GET') return jsonResponse({ data: [mockComment], total: 1 })
      if (url === '/api/tasks/task_1/comments' && method === 'POST') {
        return jsonResponse({ error: 'VALIDATION_ERROR', message: 'Comment body is required' }, 400)
      }
      return jsonResponse({}, 404)
    })
    const { result } = renderHook(() => useTask('task_1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      act(async () => {
        await result.current.addComment('')
      })
    ).rejects.toThrow('Comment body is required')
  })

  it('exposes a refetch function', async () => {
    const { result } = renderHook(() => useTask('task_1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(typeof result.current.refetch).toBe('function')
  })
})
