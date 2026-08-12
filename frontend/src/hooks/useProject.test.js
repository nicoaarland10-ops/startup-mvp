import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useProject } from './useProject.js'

const mockProject = {
  id: 'proj_1',
  name: 'Test Project',
  description: 'A test project',
  ownerId: 'demo-user-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  members: [
    { id: 'mem_1', projectId: 'proj_1', userId: 'demo-user-1', email: 'owner@test.com', name: 'Owner', role: 'OWNER', status: 'ACTIVE', invitedAt: new Date().toISOString() },
  ],
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
    if (url === '/api/projects/proj_1' && method === 'GET') {
      return jsonResponse({ data: mockProject })
    }
    return jsonResponse({}, 404)
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useProject', () => {
  it('starts in loading state', () => {
    const { result } = renderHook(() => useProject('proj_1'))
    expect(result.current.loading).toBe(true)
    expect(result.current.project).toBeNull()
  })

  it('resolves project data after fetch completes', async () => {
    const { result } = renderHook(() => useProject('proj_1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.project).toEqual(mockProject)
    expect(result.current.error).toBeNull()
  })

  it('sends the x-user-id auth header', async () => {
    const { result } = renderHook(() => useProject('proj_1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const [, options] = global.fetch.mock.calls[0]
    expect(options.headers['x-user-id']).toBe('demo-user-1')
  })

  it('sets error message from JSON error body on failure', async () => {
    global.fetch = vi.fn(() => jsonResponse({ error: 'NOT_FOUND', message: 'Project not found' }, 404))
    const { result } = renderHook(() => useProject('missing'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Project not found')
  })

  it('sets error when network throws', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network down')))
    const { result } = renderHook(() => useProject('proj_1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Network down')
  })

  it('updateProject patches and updates local state', async () => {
    const updated = { ...mockProject, name: 'Renamed' }
    global.fetch = vi.fn((url, options = {}) => {
      const method = options.method ?? 'GET'
      if (method === 'GET') return jsonResponse({ data: mockProject })
      if (method === 'PATCH') return jsonResponse({ data: updated })
      return jsonResponse({}, 404)
    })
    const { result } = renderHook(() => useProject('proj_1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.updateProject({ name: 'Renamed' })
    })

    expect(result.current.project.name).toBe('Renamed')
  })

  it('deleteProject calls DELETE endpoint', async () => {
    global.fetch = vi.fn((url, options = {}) => {
      const method = options.method ?? 'GET'
      if (method === 'GET') return jsonResponse({ data: mockProject })
      if (method === 'DELETE') {
        return Promise.resolve({ ok: true, status: 204, json: () => Promise.resolve(null) })
      }
      return jsonResponse({}, 404)
    })
    const { result } = renderHook(() => useProject('proj_1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.deleteProject()
    })

    const deleteCall = global.fetch.mock.calls.find(([, opts]) => opts?.method === 'DELETE')
    expect(deleteCall[0]).toBe('/api/projects/proj_1')
  })

  it('inviteMember appends the new member to local state', async () => {
    const newMember = { id: 'mem_2', projectId: 'proj_1', userId: null, email: 'new@test.com', name: null, role: 'MEMBER', status: 'PENDING', invitedAt: new Date().toISOString() }
    global.fetch = vi.fn((url, options = {}) => {
      const method = options.method ?? 'GET'
      if (method === 'GET') return jsonResponse({ data: mockProject })
      if (method === 'POST') return jsonResponse({ data: newMember }, 201)
      return jsonResponse({}, 404)
    })
    const { result } = renderHook(() => useProject('proj_1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.inviteMember({ email: 'new@test.com', role: 'MEMBER' })
    })

    expect(result.current.project.members).toHaveLength(2)
    expect(result.current.project.members[1].email).toBe('new@test.com')
  })

  it('inviteMember throws with server error message on conflict', async () => {
    global.fetch = vi.fn((url, options = {}) => {
      const method = options.method ?? 'GET'
      if (method === 'GET') return jsonResponse({ data: mockProject })
      if (method === 'POST') return jsonResponse({ error: 'CONFLICT', message: 'Already invited' }, 409)
      return jsonResponse({}, 404)
    })
    const { result } = renderHook(() => useProject('proj_1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      act(async () => {
        await result.current.inviteMember({ email: 'dup@test.com', role: 'MEMBER' })
      })
    ).rejects.toThrow('Already invited')
  })

  it('updateMemberRole updates the matching member in local state', async () => {
    const member2 = { id: 'mem_2', projectId: 'proj_1', userId: 'u2', email: 'm2@test.com', name: 'M2', role: 'MEMBER', status: 'ACTIVE', invitedAt: new Date().toISOString() }
    const projectWithMember2 = { ...mockProject, members: [...mockProject.members, member2] }
    const updatedMember2 = { ...member2, role: 'ADMIN' }

    global.fetch = vi.fn((url, options = {}) => {
      const method = options.method ?? 'GET'
      if (method === 'GET') return jsonResponse({ data: projectWithMember2 })
      if (method === 'PATCH') return jsonResponse({ data: updatedMember2 })
      return jsonResponse({}, 404)
    })
    const { result } = renderHook(() => useProject('proj_1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.updateMemberRole('mem_2', 'ADMIN')
    })

    expect(result.current.project.members.find((m) => m.id === 'mem_2').role).toBe('ADMIN')
  })

  it('removeMember removes the member from local state', async () => {
    const member2 = { id: 'mem_2', projectId: 'proj_1', userId: 'u2', email: 'm2@test.com', name: 'M2', role: 'MEMBER', status: 'ACTIVE', invitedAt: new Date().toISOString() }
    const projectWithMember2 = { ...mockProject, members: [...mockProject.members, member2] }

    global.fetch = vi.fn((url, options = {}) => {
      const method = options.method ?? 'GET'
      if (method === 'GET') return jsonResponse({ data: projectWithMember2 })
      if (method === 'DELETE') return Promise.resolve({ ok: true, status: 204, json: () => Promise.resolve(null) })
      return jsonResponse({}, 404)
    })
    const { result } = renderHook(() => useProject('proj_1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.removeMember('mem_2')
    })

    expect(result.current.project.members.find((m) => m.id === 'mem_2')).toBeUndefined()
  })

  it('exposes a refetch function', async () => {
    const { result } = renderHook(() => useProject('proj_1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(typeof result.current.refetch).toBe('function')
  })
})
