import { describe, it, expect, vi, afterEach } from 'vitest'
import { apiFetch, getCurrentUserId } from './api.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getCurrentUserId', () => {
  it('returns a stable demo user id', () => {
    expect(getCurrentUserId()).toBe('demo-user-1')
  })
})

describe('apiFetch', () => {
  it('attaches the x-user-id header', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ data: {} }) }))
    await apiFetch('/api/projects/1')
    const [, options] = global.fetch.mock.calls[0]
    expect(options.headers['x-user-id']).toBe('demo-user-1')
  })

  it('returns parsed JSON body on success', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ data: { id: '1' } }) }))
    const result = await apiFetch('/api/projects/1')
    expect(result).toEqual({ data: { id: '1' } })
  })

  it('returns null for 204 responses', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, status: 204, json: () => Promise.resolve(null) }))
    const result = await apiFetch('/api/projects/1', { method: 'DELETE' })
    expect(result).toBeNull()
  })

  it('throws an error with server message and code on failure', async () => {
    global.fetch = vi.fn(() => Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'NOT_FOUND', message: 'Project not found' }),
    }))
    await expect(apiFetch('/api/projects/missing')).rejects.toMatchObject({
      message: 'Project not found',
      code: 'NOT_FOUND',
      status: 404,
    })
  })

  it('falls back to a generic message when body has no message', async () => {
    global.fetch = vi.fn(() => Promise.resolve({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('bad json')),
    }))
    await expect(apiFetch('/api/projects/1')).rejects.toMatchObject({
      message: 'Request failed: 500',
    })
  })
})
