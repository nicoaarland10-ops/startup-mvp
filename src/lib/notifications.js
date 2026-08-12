import { prisma } from './prisma.js'
import { pushToUser } from './wsRegistry.js'

function serializeNotification(notification) {
  return {
    id: notification.id,
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    link: notification.link,
    read: notification.read,
    createdAt: notification.createdAt,
  }
}

/**
 * Persists a notification and pushes it live to the user's open
 * WebSocket connection(s), if any. This is the single entry point every
 * event source (task assignment, comments, invites, deadline checks)
 * should call instead of writing to the Notification table directly.
 */
export async function createNotification({ userId, type, title, body = '', link = null }) {
  const notification = await prisma.notification.create({
    data: { userId, type, title, body, link },
  })

  const serialized = serializeNotification(notification)
  pushToUser(userId, { type: 'notification', data: serialized })

  return serialized
}

export { serializeNotification }
