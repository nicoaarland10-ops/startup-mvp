import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { prisma } from '../lib/prisma.js'
import { createNotification } from '../lib/notifications.js'

const OWNER = 'usr_notif_owner'
const OTHER = 'usr_notif_other'

const as = (userId) => ({
  get: (path) => request(app).get(path).set('x-user-id', userId),
  patch: (path, body) => request(app).patch(path).set('x-user-id', userId).send(body),
  post: (path, body) => request(app).post(path).set('x-user-id', userId).send(body),
})

beforeEach(async () => {
  await prisma.notification.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.task.deleteMany()
  await prisma.projectMember.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()
  // requireUser auto-provisions on any authenticated request, but seed
  // directly so tests can create notifications before the first request.
  await prisma.user.create({ data: { id: OWNER, email: `${OWNER}@example.local`, name: OWNER } })
  await prisma.user.create({ data: { id: OTHER, email: `${OTHER}@example.local`, name: OTHER } })
})

describe('Authentication', () => {
  it('returns 401 when x-user-id header is missing', async () => {
    const res = await request(app).get('/api/notifications')
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('UNAUTHORIZED')
  })
})

describe('GET /api/notifications', () => {
  it('returns an empty list with zeroed counts when there are none', async () => {
    const res = await as(OWNER).get('/api/notifications')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ data: [], unreadCount: 0, total: 0 })
  })

  it('returns notifications newest first with correct unread/total counts', async () => {
    const first = await createNotification({ userId: OWNER, type: 'TASK_ASSIGNED', title: 'First' })
    await new Promise((r) => setTimeout(r, 5))
    const second = await createNotification({ userId: OWNER, type: 'TASK_COMMENTED', title: 'Second' })
    await prisma.notification.update({ where: { id: first.id }, data: { read: true } })

    const res = await as(OWNER).get('/api/notifications')
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(2)
    expect(res.body.unreadCount).toBe(1)
    expect(res.body.data[0].id).toBe(second.id)
  })

  it('only returns unread notifications when unreadOnly=true', async () => {
    const read = await createNotification({ userId: OWNER, type: 'TASK_ASSIGNED', title: 'Read one' })
    await prisma.notification.update({ where: { id: read.id }, data: { read: true } })
    await createNotification({ userId: OWNER, type: 'TASK_COMMENTED', title: 'Unread one' })

    const res = await as(OWNER).get('/api/notifications?unreadOnly=true')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].title).toBe('Unread one')
  })

  it('respects the limit query param', async () => {
    await createNotification({ userId: OWNER, type: 'TASK_ASSIGNED', title: 'A' })
    await createNotification({ userId: OWNER, type: 'TASK_ASSIGNED', title: 'B' })
    const res = await as(OWNER).get('/api/notifications?limit=1')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
  })

  it('only returns the caller\'s own notifications', async () => {
    await createNotification({ userId: OTHER, type: 'TASK_ASSIGNED', title: 'Not yours' })
    const res = await as(OWNER).get('/api/notifications')
    expect(res.body.data).toHaveLength(0)
  })
})

describe('PATCH /api/notifications/:id/read', () => {
  it('marks a notification as read', async () => {
    const notification = await createNotification({ userId: OWNER, type: 'TASK_ASSIGNED', title: 'X' })
    const res = await as(OWNER).patch(`/api/notifications/${notification.id}/read`)
    expect(res.status).toBe(200)
    expect(res.body.data.read).toBe(true)
  })

  it('returns 404 for an unknown notification', async () => {
    const res = await as(OWNER).patch('/api/notifications/does-not-exist/read')
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('NOT_FOUND')
  })

  it('returns 404 when trying to mark another user\'s notification as read', async () => {
    const notification = await createNotification({ userId: OTHER, type: 'TASK_ASSIGNED', title: 'X' })
    const res = await as(OWNER).patch(`/api/notifications/${notification.id}/read`)
    expect(res.status).toBe(404)
  })
})

describe('POST /api/notifications/read-all', () => {
  it('marks all of the caller\'s unread notifications as read and returns the count', async () => {
    await createNotification({ userId: OWNER, type: 'TASK_ASSIGNED', title: 'A' })
    await createNotification({ userId: OWNER, type: 'TASK_ASSIGNED', title: 'B' })
    await createNotification({ userId: OTHER, type: 'TASK_ASSIGNED', title: 'Not yours' })

    const res = await as(OWNER).post('/api/notifications/read-all')
    expect(res.status).toBe(200)
    expect(res.body.data.count).toBe(2)

    const listRes = await as(OWNER).get('/api/notifications')
    expect(listRes.body.unreadCount).toBe(0)

    const otherRes = await as(OTHER).get('/api/notifications')
    expect(otherRes.body.unreadCount).toBe(1)
  })
})

describe('GET /api/notifications/digest', () => {
  it('returns a digest preview for the caller without sending anything', async () => {
    await createNotification({ userId: OWNER, type: 'TASK_ASSIGNED', title: 'A' })
    const res = await as(OWNER).get('/api/notifications/digest')
    expect(res.status).toBe(200)
    expect(res.body.data.userId).toBe(OWNER)
    expect(res.body.data.totalCount).toBe(1)
    expect(res.body.data.mock).toBeUndefined()
  })
})

describe('POST /api/notifications/digest/send', () => {
  it('mock-sends the digest and marks it as such', async () => {
    await createNotification({ userId: OWNER, type: 'TASK_ASSIGNED', title: 'A' })
    const res = await as(OWNER).post('/api/notifications/digest/send')
    expect(res.status).toBe(200)
    expect(res.body.data.mock).toBe(true)
    expect(res.body.data.totalCount).toBe(1)
  })
})
