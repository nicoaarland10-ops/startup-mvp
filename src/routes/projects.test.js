import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { prisma } from '../lib/prisma.js'

const OWNER = 'usr_owner'
const ADMIN = 'usr_admin'
const OUTSIDER = 'usr_outsider'

const as = (userId) => ({
  post: (path, body) => request(app).post(path).set('x-user-id', userId).send(body),
  get: (path) => request(app).get(path).set('x-user-id', userId),
  patch: (path, body) => request(app).patch(path).set('x-user-id', userId).send(body),
  delete: (path) => request(app).delete(path).set('x-user-id', userId),
})

async function createProject(userId = OWNER, body = { name: 'Test Project' }) {
  const res = await as(userId).post('/api/projects', body)
  return res.body.data
}

beforeEach(async () => {
  await prisma.notification.deleteMany()
  await prisma.projectMember.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()
})

// ── Auth ──────────────────────────────────────────────────────────────────────

describe('Authentication', () => {
  it('returns 401 when x-user-id header is missing', async () => {
    const res = await request(app).post('/api/projects').send({ name: 'No Auth' })
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('UNAUTHORIZED')
  })
})

// ── POST /api/projects ───────────────────────────────────────────────────────

describe('POST /api/projects', () => {
  it('creates a project and returns 201 with the owner as a member', async () => {
    const res = await as(OWNER).post('/api/projects', { name: 'Prompt Optimisation', description: 'desc' })
    expect(res.status).toBe(201)
    const { data } = res.body
    expect(data.name).toBe('Prompt Optimisation')
    expect(data.description).toBe('desc')
    expect(data.ownerId).toBe(OWNER)
    expect(data.members).toHaveLength(1)
    expect(data.members[0]).toMatchObject({ userId: OWNER, role: 'OWNER', status: 'ACTIVE' })
  })

  it('creates a project without description (optional field)', async () => {
    const res = await as(OWNER).post('/api/projects', { name: 'No Description' })
    expect(res.status).toBe(201)
    expect(res.body.data.description).toBe('')
  })

  it('returns 400 when name is missing', async () => {
    const res = await as(OWNER).post('/api/projects', {})
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when name is blank', async () => {
    const res = await as(OWNER).post('/api/projects', { name: '   ' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when name exceeds 120 characters', async () => {
    const res = await as(OWNER).post('/api/projects', { name: 'x'.repeat(121) })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when description is not a string', async () => {
    const res = await as(OWNER).post('/api/projects', { name: 'Valid', description: 42 })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })
})

// ── GET /api/projects/:id ─────────────────────────────────────────────────────

describe('GET /api/projects/:id', () => {
  it('returns the project for a member', async () => {
    const project = await createProject()
    const res = await as(OWNER).get(`/api/projects/${project.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(project.id)
  })

  it('returns 404 for an unknown project', async () => {
    const res = await as(OWNER).get('/api/projects/does-not-exist')
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('NOT_FOUND')
  })

  it('returns 403 for a user who is not a member', async () => {
    const project = await createProject()
    const res = await as(OUTSIDER).get(`/api/projects/${project.id}`)
    expect(res.status).toBe(403)
    expect(res.body.error).toBe('FORBIDDEN')
  })
})

// ── PATCH /api/projects/:id ───────────────────────────────────────────────────

describe('PATCH /api/projects/:id', () => {
  it('updates name and description as the owner', async () => {
    const project = await createProject()
    const res = await as(OWNER).patch(`/api/projects/${project.id}`, { name: 'Renamed', description: 'Updated' })
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Renamed')
    expect(res.body.data.description).toBe('Updated')
  })

  it('allows an admin member to update the project', async () => {
    const project = await createProject()
    await createProject(ADMIN, { name: 'Admin Project' })
    await as(OWNER).post(`/api/projects/${project.id}/members`, { email: `${ADMIN}@example.local`, role: 'ADMIN' })
    const res = await as(ADMIN).patch(`/api/projects/${project.id}`, { name: 'By Admin' })
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('By Admin')
  })

  it('returns 403 for a plain member', async () => {
    const project = await createProject()
    const inviteRes = await as(OWNER).post(`/api/projects/${project.id}/members`, { email: `${OUTSIDER}@example.local` })
    expect(inviteRes.status).toBe(201)
    const res = await as(OUTSIDER).patch(`/api/projects/${project.id}`, { name: 'Nope' })
    expect(res.status).toBe(403)
  })

  it('returns 400 when no fields are provided', async () => {
    const project = await createProject()
    const res = await as(OWNER).patch(`/api/projects/${project.id}`, {})
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('returns 404 for an unknown project', async () => {
    const res = await as(OWNER).patch('/api/projects/does-not-exist', { name: 'X' })
    expect(res.status).toBe(404)
  })
})

// ── DELETE /api/projects/:id ──────────────────────────────────────────────────

describe('DELETE /api/projects/:id', () => {
  it('deletes the project as the owner', async () => {
    const project = await createProject()
    const res = await as(OWNER).delete(`/api/projects/${project.id}`)
    expect(res.status).toBe(204)

    const getRes = await as(OWNER).get(`/api/projects/${project.id}`)
    expect(getRes.status).toBe(404)
  })

  it('returns 403 when a non-owner tries to delete', async () => {
    const project = await createProject()
    await as(OWNER).post(`/api/projects/${project.id}/members`, { email: `${OUTSIDER}@example.local` })
    const res = await as(OUTSIDER).delete(`/api/projects/${project.id}`)
    expect(res.status).toBe(403)
  })

  it('returns 404 for an unknown project', async () => {
    const res = await as(OWNER).delete('/api/projects/does-not-exist')
    expect(res.status).toBe(404)
  })
})

// ── POST /api/projects/:id/members ────────────────────────────────────────────

describe('POST /api/projects/:id/members', () => {
  it('invites a new member by email, defaulting to MEMBER role', async () => {
    const project = await createProject()
    const res = await as(OWNER).post(`/api/projects/${project.id}/members`, { email: 'new.person@example.com' })
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ email: 'new.person@example.com', role: 'MEMBER', status: 'PENDING' })
  })

  it('activates the membership immediately if the invited email already has an account', async () => {
    const project = await createProject()
    // Register OUTSIDER as a known user by having them create their own project first.
    await createProject(OUTSIDER, { name: 'Outsider Project' })
    const res = await as(OWNER).post(`/api/projects/${project.id}/members`, { email: `${OUTSIDER}@example.local`, role: 'ADMIN' })
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ userId: OUTSIDER, role: 'ADMIN', status: 'ACTIVE' })
  })

  it('notifies the invited user when they already have an account', async () => {
    const project = await createProject()
    await createProject(OUTSIDER, { name: 'Outsider Project' })
    await as(OWNER).post(`/api/projects/${project.id}/members`, { email: `${OUTSIDER}@example.local` })

    const notifications = await prisma.notification.findMany({ where: { userId: OUTSIDER, type: 'MEMBER_INVITED' } })
    expect(notifications).toHaveLength(1)
  })

  it('does not create a notification for a pending invite with no account', async () => {
    const project = await createProject()
    await as(OWNER).post(`/api/projects/${project.id}/members`, { email: 'no-account@example.com' })

    const notifications = await prisma.notification.findMany({ where: { type: 'MEMBER_INVITED' } })
    expect(notifications).toHaveLength(0)
  })

  it('returns 400 for an invalid email', async () => {
    const project = await createProject()
    const res = await as(OWNER).post(`/api/projects/${project.id}/members`, { email: 'not-an-email' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('returns 400 for an invalid role', async () => {
    const project = await createProject()
    const res = await as(OWNER).post(`/api/projects/${project.id}/members`, { email: 'x@example.com', role: 'OWNER' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('returns 409 when the email is already a member', async () => {
    const project = await createProject()
    await as(OWNER).post(`/api/projects/${project.id}/members`, { email: 'dup@example.com' })
    const res = await as(OWNER).post(`/api/projects/${project.id}/members`, { email: 'dup@example.com' })
    expect(res.status).toBe(409)
    expect(res.body.error).toBe('CONFLICT')
  })

  it('returns 403 when a plain member tries to invite', async () => {
    const project = await createProject()
    await createProject(OUTSIDER, { name: 'Outsider Project' })
    await as(OWNER).post(`/api/projects/${project.id}/members`, { email: `${OUTSIDER}@example.local` })
    const res = await as(OUTSIDER).post(`/api/projects/${project.id}/members`, { email: 'another@example.com' })
    expect(res.status).toBe(403)
  })
})

// ── PATCH /api/projects/:id/members/:memberId ────────────────────────────────

describe('PATCH /api/projects/:id/members/:memberId', () => {
  it('updates a member role as the owner', async () => {
    const project = await createProject()
    const invite = await as(OWNER).post(`/api/projects/${project.id}/members`, { email: 'member@example.com' })
    const memberId = invite.body.data.id
    const res = await as(OWNER).patch(`/api/projects/${project.id}/members/${memberId}`, { role: 'ADMIN' })
    expect(res.status).toBe(200)
    expect(res.body.data.role).toBe('ADMIN')
  })

  it('returns 400 when trying to change the owner role', async () => {
    const project = await createProject()
    const ownerMemberId = project.members[0].id
    const res = await as(OWNER).patch(`/api/projects/${project.id}/members/${ownerMemberId}`, { role: 'MEMBER' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('CANNOT_MODIFY_OWNER')
  })

  it('returns 400 for an invalid role', async () => {
    const project = await createProject()
    const invite = await as(OWNER).post(`/api/projects/${project.id}/members`, { email: 'member2@example.com' })
    const res = await as(OWNER).patch(`/api/projects/${project.id}/members/${invite.body.data.id}`, { role: 'SUPERADMIN' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('returns 404 for an unknown member', async () => {
    const project = await createProject()
    const res = await as(OWNER).patch(`/api/projects/${project.id}/members/does-not-exist`, { role: 'ADMIN' })
    expect(res.status).toBe(404)
  })
})

// ── DELETE /api/projects/:id/members/:memberId ───────────────────────────────

describe('DELETE /api/projects/:id/members/:memberId', () => {
  it('removes a member as the owner', async () => {
    const project = await createProject()
    const invite = await as(OWNER).post(`/api/projects/${project.id}/members`, { email: 'toremove@example.com' })
    const res = await as(OWNER).delete(`/api/projects/${project.id}/members/${invite.body.data.id}`)
    expect(res.status).toBe(204)

    const getRes = await as(OWNER).get(`/api/projects/${project.id}`)
    expect(getRes.body.data.members.find((m) => m.id === invite.body.data.id)).toBeUndefined()
  })

  it('returns 400 when trying to remove the owner', async () => {
    const project = await createProject()
    const ownerMemberId = project.members[0].id
    const res = await as(OWNER).delete(`/api/projects/${project.id}/members/${ownerMemberId}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('CANNOT_REMOVE_OWNER')
  })

  it('returns 404 for an unknown member', async () => {
    const project = await createProject()
    const res = await as(OWNER).delete(`/api/projects/${project.id}/members/does-not-exist`)
    expect(res.status).toBe(404)
  })

  it('returns 403 when a plain member tries to remove someone', async () => {
    const project = await createProject()
    await createProject(OUTSIDER, { name: 'Outsider Project' })
    const invite = await as(OWNER).post(`/api/projects/${project.id}/members`, { email: `${OUTSIDER}@example.local` })
    const other = await as(OWNER).post(`/api/projects/${project.id}/members`, { email: 'someoneelse@example.com' })
    const res = await as(OUTSIDER).delete(`/api/projects/${project.id}/members/${other.body.data.id}`)
    expect(res.status).toBe(403)
    void invite
  })
})
