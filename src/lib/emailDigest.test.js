import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { prisma } from './prisma.js'
import { buildDailyDigest, sendDailyDigest } from './emailDigest.js'

const USER_ID = 'usr_digest_test'
const NOW = new Date('2026-08-12T12:00:00Z')

beforeEach(async () => {
  await prisma.notification.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.task.deleteMany()
  await prisma.projectMember.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()
  await prisma.user.create({ data: { id: USER_ID, email: 'digest@example.com', name: 'Digest User' } })
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function seedNotification({ type, createdAt, title = 'Title', body = '' }) {
  return prisma.notification.create({ data: { userId: USER_ID, type, title, body, createdAt } })
}

describe('buildDailyDigest', () => {
  it('includes notifications from the last 24h, grouped by type', async () => {
    await seedNotification({ type: 'TASK_ASSIGNED', createdAt: new Date(NOW.getTime() - 2 * 3600_000) })
    await seedNotification({ type: 'TASK_ASSIGNED', createdAt: new Date(NOW.getTime() - 1 * 3600_000) })
    await seedNotification({ type: 'TASK_COMMENTED', createdAt: new Date(NOW.getTime() - 30 * 60_000) })

    const digest = await buildDailyDigest(USER_ID, NOW)

    expect(digest.userId).toBe(USER_ID)
    expect(digest.totalCount).toBe(3)
    expect(digest.groups.TASK_ASSIGNED).toHaveLength(2)
    expect(digest.groups.TASK_COMMENTED).toHaveLength(1)
  })

  it('excludes notifications older than 24h', async () => {
    await seedNotification({ type: 'TASK_ASSIGNED', createdAt: new Date(NOW.getTime() - 25 * 3600_000) })

    const digest = await buildDailyDigest(USER_ID, NOW)

    expect(digest.totalCount).toBe(0)
    expect(digest.groups).toEqual({})
  })

  it('only includes the given user\'s notifications', async () => {
    await prisma.user.create({ data: { id: 'other_user', email: 'other@example.com', name: 'Other' } })
    await prisma.notification.create({
      data: { userId: 'other_user', type: 'TASK_ASSIGNED', title: 'Not yours', createdAt: NOW },
    })

    const digest = await buildDailyDigest(USER_ID, NOW)

    expect(digest.totalCount).toBe(0)
  })
})

describe('sendDailyDigest', () => {
  it('logs a mock email and returns the digest tagged as mock', async () => {
    await seedNotification({ type: 'MEMBER_INVITED', createdAt: NOW })
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const result = await sendDailyDigest(USER_ID, NOW)

    expect(result.mock).toBe(true)
    expect(result.sentAt).toBeInstanceOf(Date)
    expect(result.totalCount).toBe(1)
    expect(logSpy).toHaveBeenCalledTimes(1)
    expect(logSpy.mock.calls[0][0]).toContain('[MOCK EMAIL]')
    expect(logSpy.mock.calls[0][0]).toContain('digest@example.com')
  })
})
