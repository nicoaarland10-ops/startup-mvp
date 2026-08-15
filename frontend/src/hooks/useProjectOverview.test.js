import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { useProjectOverview } from './useProjectOverview.js'

const mockOverview = {
  project: { id: 'proj_002', name: 'RAG Knowledge Base', status: 'active', collaborators: [], aiInsightsCount: 18, lastActivity: new Date().toISOString() },
  insights: [{ id: 'ins_001', title: 'Review Cycle Bottleneck', priority: 'high' }],
  activity: [{ id: 'act_002', type: 'ai_analysis_run', user: { name: 'Bob' }, action: 'ran AI analysis', target: 'x', timestamp: new Date().toISOString() }],
}

function jsonResponse(body, status = 200) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useProjectOverview', () => {
  it('starts in loading state', () => {
    global.fetch = vi.fn(() => new Promise(() => {}))
    const { result } = renderHook(() => useProjectOverview('proj_002'))
    expect(result.current.loading).toBe(true)
    expect(result.current.project).toBeNull()
  })

  it('resolves project, insights, and activity after fetch completes', async () => {
    global.fetch = vi.fn(() => jsonResponse({ data: mockOverview }))
    const { result } = renderHook(() => useProjectOverview('proj_002'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.project).toEqual(mockOverview.project)
    expect(result.current.insights).toHaveLength(1)
    expect(result.current.activity).toHaveLength(1)
    expect(result.current.error).toBeNull()
  })

  it('sets an error message when the fetch fails', async () => {
    global.fetch = vi.fn(() => jsonResponse({}, 404))
    const { result } = renderHook(() => useProjectOverview('does_not_exist'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeTruthy()
  })
})
