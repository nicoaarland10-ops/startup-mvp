import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useNotifications } from './useNotifications.js'

const mockNotifications = [
  { id: 'n1', type: 'mention', title: 'You were mentioned', body: null, link: '/tasks/abc123', read: false, createdAt: new Date().toISOString() },
  { id: 'n2', type: 'insight', title: 'New critical insight', body: null, link: '/insights/ins_006', read: true, createdAt: new Date().toISOString() },
]

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
    if (url === '/api/dashboard/notifications' && method === 'GET') {
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

  it('polls for fresh notifications on an interval', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useNotifications())
    await vi.waitFor(() => expect(result.current.loading).toBe(false))

    expect(global.fetch).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(30000)
    })
    expect(global.fetch).toHaveBeenCalledTimes(2)

    vi.useRealTimers()
  })

  it('stops polling on unmount', async () => {
    vi.useFakeTimers()
    const { result, unmount } = renderHook(() => useNotifications())
    await vi.waitFor(() => expect(result.current.loading).toBe(false))
    unmount()

    await act(async () => {
      vi.advanceTimersByTime(60000)
    })
    expect(global.fetch).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })

  it('markAsRead patches the item in place and decrements unread count', async () => {
    const updated = { ...mockNotifications[0], read: true }
    global.fetch = vi.fn((url, options = {}) => {
      const method = options.method ?? 'GET'
      if (method === 'GET') return jsonResponse({ data: mockNotifications, unreadCount: 1, total: 2 })
      if (url === '/api/dashboard/notifications/n1/read' && method === 'PATCH') return jsonResponse({ data: updated })
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
      if (url === '/api/dashboard/notifications/n2/read' && method === 'PATCH') return jsonResponse({ data: mockNotifications[1] })
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
      if (url === '/api/dashboard/notifications/read-all' && method === 'POST') return jsonResponse({ data: mockNotifications.map((n) => ({ ...n, read: true })) })
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
