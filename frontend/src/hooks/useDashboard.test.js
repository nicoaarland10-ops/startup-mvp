import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useDashboard } from './useDashboard.js'

const mockStats = {
  totalProjects: 5,
  activeCollaborators: 12,
  aiInsightsGenerated: 124,
  tasksCompleted: 47,
  recentActivity: [],
}

const mockProjects = { data: [{ id: 'proj_1', name: 'Test', status: 'active', collaborators: [], lastActivity: new Date().toISOString(), aiInsightsCount: 3 }] }
const mockActivity = { data: [{ id: 'act_1', type: 'document_created', user: { id: 'u1', name: 'Alice' }, action: 'created', target: 'Doc', timestamp: new Date().toISOString() }] }
const mockInsights = { data: [{ id: 'ins_1', title: 'Test Insight', description: 'Desc', type: 'performance', priority: 'high', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }] }
const mockNotifications = { data: [{ id: 'n1', type: 'mention', title: 'Hi', body: null, link: null, read: false, createdAt: new Date().toISOString() }] }

function setupFetchMock(overrides = {}) {
  const responses = {
    '/api/dashboard/stats': mockStats,
    '/api/dashboard/projects': mockProjects,
    '/api/dashboard/activity': mockActivity,
    '/api/dashboard/insights': mockInsights,
    '/api/dashboard/notifications': mockNotifications,
    ...overrides,
  }

  global.fetch = vi.fn((url) => {
    const key = Object.keys(responses).find((k) => url.includes(k))
    if (key === null || responses[key] instanceof Error) {
      return Promise.reject(responses[key] ?? new Error('Unknown URL'))
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(responses[key]),
    })
  })
}

beforeEach(() => {
  setupFetchMock()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useDashboard', () => {
  it('starts in loading state', () => {
    const { result } = renderHook(() => useDashboard())
    expect(result.current.loading).toBe(true)
    expect(result.current.stats).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('resolves data after fetch completes', async () => {
    const { result } = renderHook(() => useDashboard())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.stats).toEqual(mockStats)
    expect(result.current.projects).toHaveLength(1)
    expect(result.current.activity).toHaveLength(1)
    expect(result.current.insights).toHaveLength(1)
    expect(result.current.notifications).toHaveLength(1)
    expect(result.current.error).toBeNull()
  })

  it('sets error when fetch fails', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) }))

    const { result } = renderHook(() => useDashboard())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeTruthy()
    expect(result.current.stats).toBeNull()
  })

  it('sets error when network throws', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))

    const { result } = renderHook(() => useDashboard())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('Network error')
  })

  it('exposes a refetch function', async () => {
    const { result } = renderHook(() => useDashboard())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(typeof result.current.refetch).toBe('function')
  })

  it('returns empty arrays when response has no data keys', async () => {
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    }))

    const { result } = renderHook(() => useDashboard())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.projects).toEqual([])
    expect(result.current.activity).toEqual([])
    expect(result.current.insights).toEqual([])
    expect(result.current.notifications).toEqual([])
  })

  it('actionInsight patches the insight in place with the server response', async () => {
    const updated = { ...mockInsights.data[0], status: 'resolved' }

    const { result } = renderHook(() => useDashboard())
    await waitFor(() => expect(result.current.loading).toBe(false))

    global.fetch = vi.fn((url, options = {}) => {
      const method = options.method ?? 'GET'
      if (method === 'PATCH' && url.includes('/insights/ins_1/action')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: updated }) })
      }
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) })
    })

    await act(async () => {
      await result.current.actionInsight('ins_1', 'resolve')
    })

    expect(result.current.insights[0].status).toBe('resolved')
  })
})
