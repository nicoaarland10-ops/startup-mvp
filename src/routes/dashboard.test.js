import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../app.js'

const api = (path) => request(app).get(`/api/dashboard${path}`)
const post = (path) => request(app).post(`/api/dashboard${path}`)

// ── Health check ──────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('returns 200 with service metadata', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ status: 'ok', service: 'ai-collab-platform-backend' })
    expect(typeof res.body.timestamp).toBe('string')
  })
})

// ── 404 handler ───────────────────────────────────────────────────────────────

describe('Unknown routes', () => {
  it('returns 404 for unknown paths', async () => {
    const res = await request(app).get('/does-not-exist')
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('NOT_FOUND')
  })
})

// ── GET /api/dashboard/stats ──────────────────────────────────────────────────

describe('GET /api/dashboard/stats', () => {
  it('returns 200 with correct shape', async () => {
    const res = await api('/stats')
    expect(res.status).toBe(200)
    const { data } = res.body
    expect(typeof data.totalProjects).toBe('number')
    expect(typeof data.activeCollaborators).toBe('number')
    expect(typeof data.aiInsightsGenerated).toBe('number')
    expect(typeof data.tasksCompleted).toBe('number')
    expect(Array.isArray(data.recentActivity)).toBe(true)
  })

  it('recentActivity entries have the expected fields', async () => {
    const res = await api('/stats')
    const activity = res.body.data.recentActivity
    expect(activity.length).toBeGreaterThan(0)
    for (const item of activity) {
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('type')
      expect(item).toHaveProperty('user')
      expect(item).toHaveProperty('action')
      expect(item).toHaveProperty('target')
      expect(item).toHaveProperty('timestamp')
    }
  })

  it('counts are positive numbers', async () => {
    const res = await api('/stats')
    const { totalProjects, activeCollaborators } = res.body.data
    expect(totalProjects).toBeGreaterThan(0)
    expect(activeCollaborators).toBeGreaterThan(0)
  })
})

// ── GET /api/dashboard/projects ───────────────────────────────────────────────

describe('GET /api/dashboard/projects', () => {
  it('returns 200 with paginated data', async () => {
    const res = await api('/projects')
    expect(res.status).toBe(200)
    const { data, pagination } = res.body
    expect(Array.isArray(data)).toBe(true)
    expect(pagination).toHaveProperty('page')
    expect(pagination).toHaveProperty('limit')
    expect(pagination).toHaveProperty('total')
    expect(pagination).toHaveProperty('totalPages')
    expect(pagination).toHaveProperty('hasNextPage')
    expect(pagination).toHaveProperty('hasPrevPage')
  })

  it('each project has the required fields', async () => {
    const res = await api('/projects')
    for (const project of res.body.data) {
      expect(project).toHaveProperty('id')
      expect(project).toHaveProperty('name')
      expect(project).toHaveProperty('status')
      expect(project).toHaveProperty('collaborators')
      expect(project).toHaveProperty('lastActivity')
      expect(project).toHaveProperty('aiInsightsCount')
    }
  })

  it('filters by status=active', async () => {
    const res = await api('/projects?status=active')
    expect(res.status).toBe(200)
    for (const p of res.body.data) {
      expect(p.status).toBe('active')
    }
  })

  it('filters by status=completed', async () => {
    const res = await api('/projects?status=completed')
    expect(res.status).toBe(200)
    for (const p of res.body.data) {
      expect(p.status).toBe('completed')
    }
  })

  it('returns 400 for an invalid status filter', async () => {
    const res = await api('/projects?status=invalid_status')
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('INVALID_QUERY_PARAM')
  })

  it('respects page and limit query params', async () => {
    const res = await api('/projects?page=1&limit=2')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeLessThanOrEqual(2)
    expect(res.body.pagination.limit).toBe(2)
  })

  it('page 1 and page 2 return different projects', async () => {
    const page1 = await api('/projects?page=1&limit=2')
    const page2 = await api('/projects?page=2&limit=2')
    const ids1 = page1.body.data.map((p) => p.id)
    const ids2 = page2.body.data.map((p) => p.id)
    const overlap = ids1.filter((id) => ids2.includes(id))
    expect(overlap).toHaveLength(0)
  })
})

// ── POST /api/dashboard/projects ─────────────────────────────────────────────

describe('POST /api/dashboard/projects', () => {
  it('creates a new project and returns 201', async () => {
    const res = await post('/projects')
      .send({ name: 'Test Project Alpha', description: 'Integration test project.' })
    expect(res.status).toBe(201)
    const { data } = res.body
    expect(data.name).toBe('Test Project Alpha')
    expect(data.description).toBe('Integration test project.')
    expect(data.status).toBe('active')
    expect(data.aiInsightsCount).toBe(0)
    expect(typeof data.id).toBe('string')
    expect(typeof data.createdAt).toBe('string')
  })

  it('new project appears in subsequent GET /projects', async () => {
    const createRes = await post('/projects').send({ name: 'Visibility Check Project' })
    expect(createRes.status).toBe(201)
    const listRes = await api('/projects?limit=50')
    const ids = listRes.body.data.map((p) => p.id)
    expect(ids).toContain(createRes.body.data.id)
  })

  it('returns 400 when name is missing', async () => {
    const res = await post('/projects').send({ description: 'No name here.' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when name is an empty string', async () => {
    const res = await post('/projects').send({ name: '   ' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when name exceeds 120 characters', async () => {
    const res = await post('/projects').send({ name: 'x'.repeat(121) })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when description is not a string', async () => {
    const res = await post('/projects').send({ name: 'Valid Name', description: 42 })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('creates a project without description (optional field)', async () => {
    const res = await post('/projects').send({ name: 'No Description Project' })
    expect(res.status).toBe(201)
    expect(res.body.data.description).toBe('')
  })
})

// ── GET /api/dashboard/activity ───────────────────────────────────────────────

describe('GET /api/dashboard/activity', () => {
  it('returns 200 with an array of activity entries', async () => {
    const res = await api('/activity')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(typeof res.body.total).toBe('number')
  })

  it('each activity entry has required fields', async () => {
    const res = await api('/activity')
    for (const item of res.body.data) {
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('type')
      expect(item).toHaveProperty('user')
      expect(item).toHaveProperty('action')
      expect(item).toHaveProperty('target')
      expect(item).toHaveProperty('timestamp')
      expect(item.user).toHaveProperty('id')
      expect(item.user).toHaveProperty('name')
    }
  })

  it('respects the limit query param', async () => {
    const res = await api('/activity?limit=3')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeLessThanOrEqual(3)
  })

  it('clamps limit to a maximum of 50', async () => {
    const res = await api('/activity?limit=9999')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeLessThanOrEqual(50)
  })
})

// ── GET /api/dashboard/insights ──────────────────────────────────────────────

describe('GET /api/dashboard/insights', () => {
  it('returns 200 with insight array', async () => {
    const res = await api('/insights')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(typeof res.body.total).toBe('number')
  })

  it('each insight has the required fields', async () => {
    const res = await api('/insights')
    for (const insight of res.body.data) {
      expect(insight).toHaveProperty('id')
      expect(insight).toHaveProperty('title')
      expect(insight).toHaveProperty('description')
      expect(insight).toHaveProperty('type')
      expect(insight).toHaveProperty('priority')
      expect(insight).toHaveProperty('createdAt')
    }
  })

  it('filters by priority=high', async () => {
    const res = await api('/insights?priority=high')
    expect(res.status).toBe(200)
    for (const insight of res.body.data) {
      expect(insight.priority).toBe('high')
    }
  })

  it('filters by priority=critical', async () => {
    const res = await api('/insights?priority=critical')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThan(0)
    for (const insight of res.body.data) {
      expect(insight.priority).toBe('critical')
    }
  })

  it('returns 400 for an invalid priority filter', async () => {
    const res = await api('/insights?priority=extreme')
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('INVALID_QUERY_PARAM')
  })

  it('filters by type=security', async () => {
    const res = await api('/insights?type=security')
    expect(res.status).toBe(200)
    for (const insight of res.body.data) {
      expect(insight.type).toBe('security')
    }
  })

  it('returns empty array when filters produce no matches', async () => {
    const res = await api('/insights?priority=low')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(0)
    expect(res.body.total).toBe(0)
  })
})

// ── GET /api/dashboard/notifications ─────────────────────────────────────────

describe('GET /api/dashboard/notifications', () => {
  it('returns 200 with notification array and counts', async () => {
    const res = await api('/notifications')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(typeof res.body.unreadCount).toBe('number')
    expect(typeof res.body.total).toBe('number')
  })

  it('each notification has required fields', async () => {
    const res = await api('/notifications')
    for (const notif of res.body.data) {
      expect(notif).toHaveProperty('id')
      expect(notif).toHaveProperty('type')
      expect(notif).toHaveProperty('read')
      expect(notif).toHaveProperty('message')
      expect(notif).toHaveProperty('createdAt')
      expect(typeof notif.read).toBe('boolean')
    }
  })

  it('unreadOnly=true returns only unread notifications', async () => {
    const res = await api('/notifications?unreadOnly=true')
    expect(res.status).toBe(200)
    for (const notif of res.body.data) {
      expect(notif.read).toBe(false)
    }
  })

  it('unreadCount matches actual unread items', async () => {
    const full = await api('/notifications')
    const unreadCount = full.body.unreadCount
    const unreadRes = await api('/notifications?unreadOnly=true')
    expect(unreadRes.body.data.length).toBe(unreadCount)
  })
})
