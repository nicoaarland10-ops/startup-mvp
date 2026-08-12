import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from './prisma.js'
import { checkTaskDeadlines } from './deadlineCheck.js'

const OWNER = 'usr_deadline_owner'
const ASSIGNEE = 'usr_deadline_assignee'
const NOW = new Date('2026-08-12T12:00:00Z')

let project

beforeEach(async () => {
  await prisma.notification.deleteMany()
  await prisma.task.deleteMany()
  await prisma.projectMember.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()

  await prisma.user.create({ data: { id: OWNER, email: `${OWNER}@example.local`, name: OWNER } })
  await prisma.user.create({ data: { id: ASSIGNEE, email: `${ASSIGNEE}@example.local`, name: ASSIGNEE } })

  project = await prisma.project.create({
    data: {
      name: 'Deadline Test Project',
      ownerId: OWNER,
      members: { create: { userId: OWNER, email: `${OWNER}@example.local`, role: 'OWNER', status: 'ACTIVE' } },
    },
  })
})

async function createTask({ dueDate, status = 'TODO', assigneeId = null }) {
  return prisma.task.create({
    data: {
      projectId: project.id,
      title: 'Due soon task',
      createdById: OWNER,
      assigneeId,
      status,
      dueDate,
    },
  })
}

describe('checkTaskDeadlines', () => {
  it('notifies the assignee when a task is due within 24h', async () => {
    const task = await createTask({ dueDate: new Date(NOW.getTime() + 3 * 3600_000), assigneeId: ASSIGNEE })

    const notified = await checkTaskDeadlines(NOW)

    expect(notified).toHaveLength(1)
    expect(notified[0]).toMatchObject({ userId: ASSIGNEE, type: 'TASK_DEADLINE', link: `/tasks/${task.id}` })
  })

  it('falls back to the creator when the task is unassigned', async () => {
    await createTask({ dueDate: new Date(NOW.getTime() + 3 * 3600_000), assigneeId: null })

    const notified = await checkTaskDeadlines(NOW)

    expect(notified).toHaveLength(1)
    expect(notified[0].userId).toBe(OWNER)
  })

  it('ignores tasks due further out than 24h', async () => {
    await createTask({ dueDate: new Date(NOW.getTime() + 48 * 3600_000), assigneeId: ASSIGNEE })
    const notified = await checkTaskDeadlines(NOW)
    expect(notified).toHaveLength(0)
  })

  it('ignores tasks with no due date', async () => {
    await createTask({ dueDate: null, assigneeId: ASSIGNEE })
    const notified = await checkTaskDeadlines(NOW)
    expect(notified).toHaveLength(0)
  })

  it('ignores DONE tasks even if due soon', async () => {
    await createTask({ dueDate: new Date(NOW.getTime() + 3 * 3600_000), assigneeId: ASSIGNEE, status: 'DONE' })
    const notified = await checkTaskDeadlines(NOW)
    expect(notified).toHaveLength(0)
  })

  it('does not double-notify on a second run for the same due date', async () => {
    await createTask({ dueDate: new Date(NOW.getTime() + 3 * 3600_000), assigneeId: ASSIGNEE })

    const first = await checkTaskDeadlines(NOW)
    const second = await checkTaskDeadlines(new Date(NOW.getTime() + 60_000))

    expect(first).toHaveLength(1)
    expect(second).toHaveLength(0)
  })
})
