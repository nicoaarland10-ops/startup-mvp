import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { prisma } from '../lib/prisma.js'

const OWNER = 'usr_owner'
const MEMBER = 'usr_member'
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

// Registers `userId` as a known user (via their own throwaway project) then invites
// them into `project` by email, which the invite endpoint activates immediately
// since the email already belongs to a known account.
async function addActiveMember(project, userId, role = 'MEMBER') {
  await createProject(userId, { name: `${userId} scratch project` })
  const res = await as(OWNER).post(`/api/projects/${project.id}/members`, {
    email: `${userId}@example.local`,
    role,
  })
  return res.body.data
}

async function createTask(projectId, userId = OWNER, body = { title: 'Test Task' }) {
  const res = await as(userId).post('/api/tasks', { projectId, ...body })
  return res.body.data
}

beforeEach(async () => {
  await prisma.notification.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.task.deleteMany()
  await prisma.projectMember.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()
})

// ── Auth ──────────────────────────────────────────────────────────────────────

describe('Authentication', () => {
  it('returns 401 when x-user-id header is missing', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'No Auth' })
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('UNAUTHORIZED')
  })
})

// ── POST /api/tasks ───────────────────────────────────────────────────────────

describe('POST /api/tasks', () => {
  it('creates a task with default status and priority', async () => {
    const project = await createProject()
    const res = await as(OWNER).post('/api/tasks', { projectId: project.id, title: 'Write docs' })
    expect(res.status).toBe(201)
    const { data } = res.body
    expect(data.title).toBe('Write docs')
    expect(data.status).toBe('TODO')
    expect(data.priority).toBe('MEDIUM')
    expect(data.projectId).toBe(project.id)
    expect(data.createdById).toBe(OWNER)
    expect(data.commentCount).toBe(0)
    expect(data.assignee).toBeNull()
  })

  it('creates a task with explicit status, priority, and a valid assignee', async () => {
    const project = await createProject()
    await addActiveMember(project, MEMBER)
    const res = await as(OWNER).post('/api/tasks', {
      projectId: project.id,
      title: 'Ship feature',
      description: 'Ship it',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      assigneeId: MEMBER,
    })
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      description: 'Ship it',
      assigneeId: MEMBER,
    })
    expect(res.body.data.assignee).toMatchObject({ id: MEMBER })
  })

  it('returns 400 when projectId is missing', async () => {
    const res = await as(OWNER).post('/api/tasks', { title: 'No project' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when title is missing', async () => {
    const project = await createProject()
    const res = await as(OWNER).post('/api/tasks', { projectId: project.id })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when title exceeds 200 characters', async () => {
    const project = await createProject()
    const res = await as(OWNER).post('/api/tasks', { projectId: project.id, title: 'x'.repeat(201) })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('returns 400 for an invalid status', async () => {
    const project = await createProject()
    const res = await as(OWNER).post('/api/tasks', { projectId: project.id, title: 'X', status: 'BOGUS' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('returns 400 for an invalid priority', async () => {
    const project = await createProject()
    const res = await as(OWNER).post('/api/tasks', { projectId: project.id, title: 'X', priority: 'BOGUS' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when assigneeId is not an active project member', async () => {
    const project = await createProject()
    const res = await as(OWNER).post('/api/tasks', { projectId: project.id, title: 'X', assigneeId: OUTSIDER })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('notifies the assignee when a task is created with an assignee', async () => {
    const project = await createProject()
    await addActiveMember(project, MEMBER)
    await as(OWNER).post('/api/tasks', { projectId: project.id, title: 'Assigned on create', assigneeId: MEMBER })

    const notifications = await prisma.notification.findMany({ where: { userId: MEMBER, type: 'TASK_ASSIGNED' } })
    expect(notifications).toHaveLength(1)
  })

  it('does not notify the creator when self-assigning', async () => {
    const project = await createProject()
    await as(OWNER).post('/api/tasks', { projectId: project.id, title: 'Self assigned', assigneeId: OWNER })

    const notifications = await prisma.notification.findMany({ where: { userId: OWNER, type: 'TASK_ASSIGNED' } })
    expect(notifications).toHaveLength(0)
  })

  it('returns 404 when the project does not exist', async () => {
    const res = await as(OWNER).post('/api/tasks', { projectId: 'does-not-exist', title: 'X' })
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('NOT_FOUND')
  })

  it('returns 403 when the caller is not a project member', async () => {
    const project = await createProject()
    const res = await as(OUTSIDER).post('/api/tasks', { projectId: project.id, title: 'X' })
    expect(res.status).toBe(403)
    expect(res.body.error).toBe('FORBIDDEN')
  })
})

// ── GET /api/tasks ────────────────────────────────────────────────────────────

describe('GET /api/tasks', () => {
  it('returns 400 when projectId is missing', async () => {
    const res = await as(OWNER).get('/api/tasks')
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('lists tasks for a project with pagination metadata', async () => {
    const project = await createProject()
    await createTask(project.id, OWNER, { title: 'A' })
    await createTask(project.id, OWNER, { title: 'B' })
    const res = await as(OWNER).get(`/api/tasks?projectId=${project.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 20, total: 2, totalPages: 1 })
  })

  it('filters by status', async () => {
    const project = await createProject()
    await createTask(project.id, OWNER, { title: 'Todo task' })
    await createTask(project.id, OWNER, { title: 'Doing task', status: 'IN_PROGRESS' })
    const res = await as(OWNER).get(`/api/tasks?projectId=${project.id}&status=IN_PROGRESS`)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].title).toBe('Doing task')
  })

  it('filters by priority', async () => {
    const project = await createProject()
    await createTask(project.id, OWNER, { title: 'Low', priority: 'LOW' })
    await createTask(project.id, OWNER, { title: 'Urgent', priority: 'URGENT' })
    const res = await as(OWNER).get(`/api/tasks?projectId=${project.id}&priority=URGENT`)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].title).toBe('Urgent')
  })

  it('filters by assigneeId', async () => {
    const project = await createProject()
    await addActiveMember(project, MEMBER)
    await createTask(project.id, OWNER, { title: 'Unassigned' })
    await createTask(project.id, OWNER, { title: 'Assigned', assigneeId: MEMBER })
    const res = await as(OWNER).get(`/api/tasks?projectId=${project.id}&assigneeId=${MEMBER}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].title).toBe('Assigned')
  })

  it('returns 400 for an invalid status filter', async () => {
    const project = await createProject()
    const res = await as(OWNER).get(`/api/tasks?projectId=${project.id}&status=BOGUS`)
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('INVALID_QUERY_PARAM')
  })

  it('respects page and limit query params', async () => {
    const project = await createProject()
    await createTask(project.id, OWNER, { title: 'A' })
    await createTask(project.id, OWNER, { title: 'B' })
    await createTask(project.id, OWNER, { title: 'C' })
    const res = await as(OWNER).get(`/api/tasks?projectId=${project.id}&page=1&limit=2`)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.pagination.totalPages).toBe(2)
  })

  it('returns 404 for an unknown project', async () => {
    const res = await as(OWNER).get('/api/tasks?projectId=does-not-exist')
    expect(res.status).toBe(404)
  })

  it('returns 403 for a non-member', async () => {
    const project = await createProject()
    const res = await as(OUTSIDER).get(`/api/tasks?projectId=${project.id}`)
    expect(res.status).toBe(403)
  })
})

// ── GET /api/tasks/:id ────────────────────────────────────────────────────────

describe('GET /api/tasks/:id', () => {
  it('returns the task for a project member', async () => {
    const project = await createProject()
    const task = await createTask(project.id)
    const res = await as(OWNER).get(`/api/tasks/${task.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(task.id)
  })

  it('returns 404 for an unknown task', async () => {
    const res = await as(OWNER).get('/api/tasks/does-not-exist')
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('NOT_FOUND')
  })

  it('returns 403 for a non-member of the task project', async () => {
    const project = await createProject()
    const task = await createTask(project.id)
    const res = await as(OUTSIDER).get(`/api/tasks/${task.id}`)
    expect(res.status).toBe(403)
  })
})

// ── PATCH /api/tasks/:id ──────────────────────────────────────────────────────

describe('PATCH /api/tasks/:id', () => {
  it('updates title and status', async () => {
    const project = await createProject()
    const task = await createTask(project.id)
    const res = await as(OWNER).patch(`/api/tasks/${task.id}`, { title: 'Renamed', status: 'DONE' })
    expect(res.status).toBe(200)
    expect(res.body.data.title).toBe('Renamed')
    expect(res.body.data.status).toBe('DONE')
  })

  it('assigns and then unassigns via assigneeId', async () => {
    const project = await createProject()
    await addActiveMember(project, MEMBER)
    const task = await createTask(project.id)

    const assignRes = await as(OWNER).patch(`/api/tasks/${task.id}`, { assigneeId: MEMBER })
    expect(assignRes.status).toBe(200)
    expect(assignRes.body.data.assigneeId).toBe(MEMBER)

    const unassignRes = await as(OWNER).patch(`/api/tasks/${task.id}`, { assigneeId: null })
    expect(unassignRes.status).toBe(200)
    expect(unassignRes.body.data.assigneeId).toBeNull()
  })

  it('allows any active project member to update the task', async () => {
    const project = await createProject()
    await addActiveMember(project, MEMBER)
    const task = await createTask(project.id)
    const res = await as(MEMBER).patch(`/api/tasks/${task.id}`, { status: 'IN_REVIEW' })
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('IN_REVIEW')
  })

  it('returns 400 when no fields are provided', async () => {
    const project = await createProject()
    const task = await createTask(project.id)
    const res = await as(OWNER).patch(`/api/tasks/${task.id}`, {})
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('returns 400 for an invalid assigneeId', async () => {
    const project = await createProject()
    const task = await createTask(project.id)
    const res = await as(OWNER).patch(`/api/tasks/${task.id}`, { assigneeId: OUTSIDER })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('notifies the new assignee when reassigned via PATCH', async () => {
    const project = await createProject()
    await addActiveMember(project, MEMBER)
    const task = await createTask(project.id)

    await as(OWNER).patch(`/api/tasks/${task.id}`, { assigneeId: MEMBER })

    const notifications = await prisma.notification.findMany({ where: { userId: MEMBER, type: 'TASK_ASSIGNED' } })
    expect(notifications).toHaveLength(1)
  })

  it('does not notify again when the assignee is unchanged', async () => {
    const project = await createProject()
    await addActiveMember(project, MEMBER)
    // Creating with an assignee already fires one TASK_ASSIGNED notification.
    const task = await createTask(project.id, OWNER, { title: 'Test Task', assigneeId: MEMBER })
    const countAfterCreate = await prisma.notification.count({ where: { userId: MEMBER, type: 'TASK_ASSIGNED' } })
    expect(countAfterCreate).toBe(1)

    await as(OWNER).patch(`/api/tasks/${task.id}`, { title: 'Renamed only' })

    const countAfterPatch = await prisma.notification.count({ where: { userId: MEMBER, type: 'TASK_ASSIGNED' } })
    expect(countAfterPatch).toBe(1)
  })

  it('returns 403 for a non-member', async () => {
    const project = await createProject()
    const task = await createTask(project.id)
    const res = await as(OUTSIDER).patch(`/api/tasks/${task.id}`, { title: 'Nope' })
    expect(res.status).toBe(403)
  })

  it('returns 404 for an unknown task', async () => {
    const res = await as(OWNER).patch('/api/tasks/does-not-exist', { title: 'X' })
    expect(res.status).toBe(404)
  })
})

// ── DELETE /api/tasks/:id ─────────────────────────────────────────────────────

describe('DELETE /api/tasks/:id', () => {
  it('allows the task creator to delete it', async () => {
    const project = await createProject()
    await addActiveMember(project, MEMBER)
    const task = await createTask(project.id, MEMBER)
    const res = await as(MEMBER).delete(`/api/tasks/${task.id}`)
    expect(res.status).toBe(204)
  })

  it('allows a project owner to delete a task created by someone else', async () => {
    const project = await createProject()
    await addActiveMember(project, MEMBER)
    const task = await createTask(project.id, MEMBER)
    const res = await as(OWNER).delete(`/api/tasks/${task.id}`)
    expect(res.status).toBe(204)
  })

  it('returns 403 when a non-creator plain member tries to delete', async () => {
    const project = await createProject()
    await addActiveMember(project, MEMBER)
    const task = await createTask(project.id, OWNER)
    const res = await as(MEMBER).delete(`/api/tasks/${task.id}`)
    expect(res.status).toBe(403)
  })

  it('returns 404 for an unknown task', async () => {
    const res = await as(OWNER).delete('/api/tasks/does-not-exist')
    expect(res.status).toBe(404)
  })
})

// ── POST /api/tasks/:id/comments ──────────────────────────────────────────────

describe('POST /api/tasks/:id/comments', () => {
  it('adds a comment', async () => {
    const project = await createProject()
    const task = await createTask(project.id)
    const res = await as(OWNER).post(`/api/tasks/${task.id}/comments`, { body: 'Looks good' })
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ taskId: task.id, authorId: OWNER, body: 'Looks good' })
    expect(res.body.data.author).toMatchObject({ id: OWNER })
  })

  it('returns 400 for an empty body', async () => {
    const project = await createProject()
    const task = await createTask(project.id)
    const res = await as(OWNER).post(`/api/tasks/${task.id}/comments`, { body: '   ' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when body exceeds 2000 characters', async () => {
    const project = await createProject()
    const task = await createTask(project.id)
    const res = await as(OWNER).post(`/api/tasks/${task.id}/comments`, { body: 'x'.repeat(2001) })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('returns 403 for a non-member', async () => {
    const project = await createProject()
    const task = await createTask(project.id)
    const res = await as(OUTSIDER).post(`/api/tasks/${task.id}/comments`, { body: 'Hi' })
    expect(res.status).toBe(403)
  })

  it('returns 404 for an unknown task', async () => {
    const res = await as(OWNER).post('/api/tasks/does-not-exist/comments', { body: 'Hi' })
    expect(res.status).toBe(404)
  })

  it('notifies the assignee and creator, excluding the commenter', async () => {
    const project = await createProject()
    await addActiveMember(project, MEMBER)
    const task = await createTask(project.id, OWNER, { title: 'Test Task', assigneeId: MEMBER })

    await as(MEMBER).post(`/api/tasks/${task.id}/comments`, { body: 'Assignee comments' })

    const ownerNotifs = await prisma.notification.findMany({ where: { userId: OWNER, type: 'TASK_COMMENTED' } })
    const assigneeNotifs = await prisma.notification.findMany({ where: { userId: MEMBER, type: 'TASK_COMMENTED' } })
    expect(ownerNotifs).toHaveLength(1)
    expect(assigneeNotifs).toHaveLength(0)
  })

  it('does not double-notify when the assignee and creator are the same person', async () => {
    const project = await createProject()
    await addActiveMember(project, MEMBER)
    const task = await createTask(project.id, OWNER, { title: 'Test Task', assigneeId: OWNER })

    await as(MEMBER).post(`/api/tasks/${task.id}/comments`, { body: 'Hi' })

    const ownerNotifs = await prisma.notification.findMany({ where: { userId: OWNER, type: 'TASK_COMMENTED' } })
    expect(ownerNotifs).toHaveLength(1)
  })
})

// ── GET /api/tasks/:id/comments ───────────────────────────────────────────────

describe('GET /api/tasks/:id/comments', () => {
  it('lists comments oldest first', async () => {
    const project = await createProject()
    const task = await createTask(project.id)
    await as(OWNER).post(`/api/tasks/${task.id}/comments`, { body: 'First' })
    await as(OWNER).post(`/api/tasks/${task.id}/comments`, { body: 'Second' })
    const res = await as(OWNER).get(`/api/tasks/${task.id}/comments`)
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(2)
    expect(res.body.data.map((c) => c.body)).toEqual(['First', 'Second'])
  })

  it('respects the limit query param', async () => {
    const project = await createProject()
    const task = await createTask(project.id)
    await as(OWNER).post(`/api/tasks/${task.id}/comments`, { body: 'First' })
    await as(OWNER).post(`/api/tasks/${task.id}/comments`, { body: 'Second' })
    const res = await as(OWNER).get(`/api/tasks/${task.id}/comments?limit=1`)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
  })

  it('returns 403 for a non-member', async () => {
    const project = await createProject()
    const task = await createTask(project.id)
    const res = await as(OUTSIDER).get(`/api/tasks/${task.id}/comments`)
    expect(res.status).toBe(403)
  })

  it('returns 404 for an unknown task', async () => {
    const res = await as(OWNER).get('/api/tasks/does-not-exist/comments')
    expect(res.status).toBe(404)
  })
})
