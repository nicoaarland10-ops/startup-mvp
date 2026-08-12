import { prisma } from './prisma.js'
import { createNotification } from './notifications.js'

const DEADLINE_WINDOW_MS = 24 * 60 * 60 * 1000

/**
 * Scans for non-done tasks whose dueDate falls within the next 24h and
 * notifies the assignee (falling back to the creator when unassigned).
 * Idempotent per due date: skipped if a TASK_DEADLINE notification for the
 * task already exists since it was last updated (i.e. since this dueDate
 * was set), so repeated calls (e.g. from a periodic timer) don't spam.
 */
export async function checkTaskDeadlines(now = new Date()) {
  const windowEnd = new Date(now.getTime() + DEADLINE_WINDOW_MS)

  const dueSoonTasks = await prisma.task.findMany({
    where: {
      dueDate: { gte: now, lte: windowEnd },
      status: { not: 'DONE' },
    },
  })

  const notified = []
  for (const task of dueSoonTasks) {
    const recipientId = task.assigneeId ?? task.createdById
    const link = `/tasks/${task.id}`

    const alreadyNotified = await prisma.notification.findFirst({
      where: {
        userId: recipientId,
        type: 'TASK_DEADLINE',
        link,
        createdAt: { gte: task.updatedAt },
      },
    })
    if (alreadyNotified) continue

    const notification = await createNotification({
      userId: recipientId,
      type: 'TASK_DEADLINE',
      title: `"${task.title}" is due soon`,
      body: `Due ${task.dueDate.toISOString()}`,
      link,
    })
    notified.push(notification)
  }

  return notified
}
