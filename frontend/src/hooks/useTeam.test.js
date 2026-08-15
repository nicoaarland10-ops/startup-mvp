import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { useTeam } from './useTeam.js'

const mockMembers = [
  { id: 'usr_001', name: 'Alice Chen', avatar: 'https://i.pravatar.cc/40?img=1', projectCount: 3, projects: [{ id: 'proj_001', name: 'LLM Prompt Optimisation' }], openInsights: 2 },
]

function jsonResponse(body, status = 200) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useTeam', () => {
  it('starts in loading state', () => {
    global.fetch = vi.fn(() => new Promise(() => {}))
    const { result } = renderHook(() => useTeam())
    expect(result.current.loading).toBe(true)
    expect(result.current.members).toEqual([])
  })

  it('resolves members after fetch completes', async () => {
    global.fetch = vi.fn(() => jsonResponse({ data: mockMembers, total: 1 }))
    const { result } = renderHook(() => useTeam())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.members).toEqual(mockMembers)
    expect(result.current.error).toBeNull()
  })

  it('sets an error message on failed fetch', async () => {
    global.fetch = vi.fn(() => jsonResponse({}, 500))
    const { result } = renderHook(() => useTeam())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeTruthy()
  })
})
