import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from './prisma.js'
import { createNotification } from './notifications.js'
import { registerConnection, _resetForTests } from './wsRegistry.js'

const USER_ID = 'usr_notif_test'

function fakeSocket() {
  return { readyState: 1, sent: [], send(msg) { this.sent.push(msg) } }
}

beforeEach(async () => {
  _resetForTests()
  await prisma.notification.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.task.deleteMany()
  await prisma.projectMember.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()
  await prisma.user.create({ data: { id: USER_ID, email: `${USER_ID}@example.local`, name: USER_ID } })
})

describe('createNotification', () => {
  it('persists a notification row', async () => {
    const notification = await createNotification({
      userId: USER_ID,
      type: 'TASK_ASSIGNED',
      title: 'You were assigned to "Ship it"',
      body: 'desc',
      link: '/tasks/abc',
    })

    expect(notification).toMatchObject({
      userId: USER_ID,
      type: 'TASK_ASSIGNED',
      title: 'You were assigned to "Ship it"',
      body: 'desc',
      link: '/tasks/abc',
      read: false,
    })

    const row = await prisma.notification.findUnique({ where: { id: notification.id } })
    expect(row).not.toBeNull()
  })

  it('defaults body to an empty string and link to null when omitted', async () => {
    const notification = await createNotification({ userId: USER_ID, type: 'MEMBER_INVITED', title: 'Hi' })
    expect(notification.body).toBe('')
    expect(notification.link).toBeNull()
  })

  it('pushes the notification to an open WebSocket connection for that user', async () => {
    const socket = fakeSocket()
    registerConnection(USER_ID, socket)

    const notification = await createNotification({ userId: USER_ID, type: 'TASK_COMMENTED', title: 'New comment' })

    expect(socket.sent).toHaveLength(1)
    const payload = JSON.parse(socket.sent[0])
    // JSON round-trips Dates to strings, so normalize before comparing.
    expect(payload).toEqual(JSON.parse(JSON.stringify({ type: 'notification', data: notification })))
  })

  it('does not throw when the user has no open connection', async () => {
    await expect(
      createNotification({ userId: USER_ID, type: 'TASK_DEADLINE', title: 'Due soon' })
    ).resolves.toMatchObject({ type: 'TASK_DEADLINE' })
  })
})
