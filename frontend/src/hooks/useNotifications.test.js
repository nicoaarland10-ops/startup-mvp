import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useNotifications } from './useNotifications.js'

const mockNotifications = [
  { id: 'n1', userId: 'demo-user-1', type: 'TASK_ASSIGNED', title: 'You were assigned a task', body: 'Ship the release', link: '/tasks/abc123', read: false, createdAt: new Date().toISOString() },
  { id: 'n2', userId: 'demo-user-1', type: 'MEMBER_INVITED', title: 'New member invited', body: null, link: '/projects/xyz', read: true, createdAt: new Date().toISOString() },
]

function jsonResponse(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })
}

// Minimal fake WebSocket so no real connection is attempted in jsdom.
class MockWebSocket {
  static instances = []

  constructor(url) {
    this.url = url
    this.readyState = 0
    this.onopen = null
    this.onmessage = null
    this.onclose = null
    this.close = vi.fn()
    MockWebSocket.instances.push(this)
  }
}

beforeEach(() => {
  MockWebSocket.instances = []
  vi.stubGlobal('WebSocket', MockWebSocket)
  global.fetch = vi.fn((url, options = {}) => {
    const method = options.method ?? 'GET'
    if (url === '/api/notifications' && method === 'GET') {
      return jsonResponse({ data: mockNotifications, unreadCount: 1, total: 2 })
    }
    return jsonResponse({}, 404)
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('useNotifications', () => {
  it('starts in loading state', () => {
    const { result } = renderHook(() => useNotifications())
    expect(result.current.loading).toBe(true)
    expect(result.current.notifications).toEqual([])
  })

  it('resolves notifications and unread count after fetch completes', async () => {
    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.notifications).toEqual(mockNotifications)
    expect(result.current.unreadCount).toBe(1)
    expect(result.current.error).toBeNull()
  })

  it('sets error message on failed fetch', async () => {
    global.fetch = vi.fn(() => jsonResponse({ error: 'SERVER_ERROR', message: 'Boom' }, 500))
    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Boom')
  })

  it('opens a WebSocket connection to the notifications endpoint with the current user id', async () => {
    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(MockWebSocket.instances).toHaveLength(1)
    expect(MockWebSocket.instances[0].url).toBe('ws://localhost:3000/ws/notifications?userId=demo-user-1')
  })

  it('prepends a pushed notification and bumps the unread count', async () => {
    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const pushed = { id: 'n3', userId: 'demo-user-1', type: 'TASK_COMMENTED', title: 'New comment', body: 'Nice work', link: '/tasks/def456', read: false, createdAt: new Date().toISOString() }

    act(() => {
      MockWebSocket.instances[0].onmessage({ data: JSON.stringify({ type: 'notification', data: pushed }) })
    })

    expect(result.current.notifications[0]).toEqual(pushed)
    expect(result.current.notifications).toHaveLength(3)
    expect(result.current.unreadCount).toBe(2)
  })

  it('ignores unrecognized message shapes', async () => {
    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      MockWebSocket.instances[0].onmessage({ data: JSON.stringify({ type: 'ping' }) })
    })

    expect(result.current.notifications).toHaveLength(2)
    expect(result.current.unreadCount).toBe(1)
  })

  it('ignores malformed (non-JSON) messages without throwing', async () => {
    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(() => {
      act(() => {
        MockWebSocket.instances[0].onmessage({ data: 'not json' })
      })
    }).not.toThrow()

    expect(result.current.notifications).toHaveLength(2)
  })

  it('reconnects ~3s after the socket closes', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useNotifications())
    await vi.waitFor(() => expect(result.current.loading).toBe(false))

    expect(MockWebSocket.instances).toHaveLength(1)

    act(() => {
      MockWebSocket.instances[0].onclose()
    })
    expect(MockWebSocket.instances).toHaveLength(1)

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(MockWebSocket.instances).toHaveLength(2)

    vi.useRealTimers()
  })

  it('closes the socket and cancels pending reconnect on unmount', async () => {
    vi.useFakeTimers()
    const { result, unmount } = renderHook(() => useNotifications())
    await vi.waitFor(() => expect(result.current.loading).toBe(false))

    const socket = MockWebSocket.instances[0]
    unmount()
    expect(socket.close).toHaveBeenCalled()

    // A close firing post-unmount should not schedule a reconnect.
    act(() => {
      socket.onclose()
      vi.advanceTimersByTime(5000)
    })
    expect(MockWebSocket.instances).toHaveLength(1)

    vi.useRealTimers()
  })

  it('markAsRead patches the item in place and decrements unread count', async () => {
    const updated = { ...mockNotifications[0], read: true }
    global.fetch = vi.fn((url, options = {}) => {
      const method = options.method ?? 'GET'
      if (method === 'GET') return jsonResponse({ data: mockNotifications, unreadCount: 1, total: 2 })
      if (url === '/api/notifications/n1/read' && method === 'PATCH') return jsonResponse({ data: updated })
      return jsonResponse({}, 404)
    })
    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.markAsRead('n1')
    })

    expect(result.current.notifications.find((n) => n.id === 'n1').read).toBe(true)
    expect(result.current.unreadCount).toBe(0)
  })

  it('markAsRead does not decrement unread count for an already-read item', async () => {
    global.fetch = vi.fn((url, options = {}) => {
      const method = options.method ?? 'GET'
      if (method === 'GET') return jsonResponse({ data: mockNotifications, unreadCount: 1, total: 2 })
      if (url === '/api/notifications/n2/read' && method === 'PATCH') return jsonResponse({ data: mockNotifications[1] })
      return jsonResponse({}, 404)
    })
    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.markAsRead('n2')
    })

    expect(result.current.unreadCount).toBe(1)
  })

  it('markAllAsRead marks every notification read and zeroes the unread count', async () => {
    global.fetch = vi.fn((url, options = {}) => {
      const method = options.method ?? 'GET'
      if (method === 'GET') return jsonResponse({ data: mockNotifications, unreadCount: 1, total: 2 })
      if (url === '/api/notifications/read-all' && method === 'POST') return jsonResponse({ data: { count: 1 } })
      return jsonResponse({}, 404)
    })
    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.markAllAsRead()
    })

    expect(result.current.notifications.every((n) => n.read)).toBe(true)
    expect(result.current.unreadCount).toBe(0)
  })

  it('exposes a refetch function', async () => {
    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(typeof result.current.refetch).toBe('function')
  })
})
