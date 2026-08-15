import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { useInsight } from './useInsight.js'

const mockInsight = {
  id: 'ins_001',
  title: 'Review Cycle Bottleneck Detected',
  description: 'PR review latency increased.',
  type: 'collaboration',
  priority: 'high',
  status: 'active',
  project: { id: 'proj_002', name: 'RAG Knowledge Base' },
  recommendedActions: ['Redistribute reviewer load'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

function jsonResponse(body, status = 200) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useInsight', () => {
  it('starts in loading state', () => {
    global.fetch = vi.fn(() => new Promise(() => {}))
    const { result } = renderHook(() => useInsight('ins_001'))
    expect(result.current.loading).toBe(true)
    expect(result.current.insight).toBeNull()
  })

  it('resolves the insight after fetch completes', async () => {
    global.fetch = vi.fn(() => jsonResponse({ data: mockInsight }))
    const { result } = renderHook(() => useInsight('ins_001'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.insight).toEqual(mockInsight)
    expect(result.current.error).toBeNull()
  })

  it('sets an error message when the fetch fails', async () => {
    global.fetch = vi.fn(() => jsonResponse({}, 404))
    const { result } = renderHook(() => useInsight('does_not_exist'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeTruthy()
  })

  it('actionInsight merges the server response into the current insight', async () => {
    global.fetch = vi.fn(() => jsonResponse({ data: mockInsight }))
    const { result } = renderHook(() => useInsight('ins_001'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    global.fetch = vi.fn((url, options = {}) => {
      if (options.method === 'PATCH') return jsonResponse({ data: { status: 'resolved' } })
      return jsonResponse({ data: mockInsight })
    })

    await act(async () => {
      await result.current.actionInsight('resolve')
    })

    expect(result.current.insight.status).toBe('resolved')
    expect(result.current.insight.title).toBe(mockInsight.title)
  })
})
