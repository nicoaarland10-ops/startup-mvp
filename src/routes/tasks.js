import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireUser } from '../middleware/auth.js'
import { createNotification } from '../lib/notifications.js'

const router = Router()

// ── Helpers ───────────────────────────────────────────────────────────────────

class AppError extends Error {
  constructor(message, statusCode = 400, code = 'BAD_REQUEST') {
    super(message)
    this.statusCode = statusCode
    this.code = code
  }
}

const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']
const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

const TASK_INCLUDE = {
  assignee: true,
  createdBy: true,
  _count: { select: { comments: true } },
}

function serializeUserRef(user) {
  if (!user) return null
  return { id: user.id, name: user.name, email: user.email }
}

function serializeTask(task) {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assigneeId: task.assigneeId,
    assignee: serializeUserRef(task.assignee),
    createdById: task.createdById,
    createdBy: serializeUserRef(task.createdBy),
    commentCount: task._count?.comments ?? 0,
    dueDate: task.dueDate,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  }
}

function serializeComment(comment) {
  return {
    id: comment.id,
    taskId: comment.taskId,
    authorId: comment.authorId,
    author: serializeUserRef(comment.author),
    body: comment.body,
    createdAt: comment.createdAt,
  }
}

async function getActiveMembership(projectId, userId) {
  return prisma.projectMember.findFirst({ where: { projectId, userId, status: 'ACTIVE' } })
}

async function requireProjectMembership(projectId, userId) {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) {
    throw new AppError('Project not found.', 404, 'NOT_FOUND')
  }
  const membership = await getActiveMembership(projectId, userId)
  if (!membership) {
    throw new AppError('You are not a member of this project.', 403, 'FORBIDDEN')
  }
  return { project, membership }
}

// Validates + normalizes create/patch bodies into a Prisma `data` object.
// `partial: true` (PATCH) allows omitted fields and requires at least one present.
async function buildTaskData(body, projectId, { partial }) {
  const { title, description, status, priority, assigneeId, dueDate } = body ?? {}
  const data = {}

  if (title !== undefined || !partial) {
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      throw new AppError('Field "title" is required and must be a non-empty string.', 400, 'VALIDATION_ERROR')
    }
    if (title.trim().length > 200) {
      throw new AppError('Field "title" must not exceed 200 characters.', 400, 'VALIDATION_ERROR')
    }
    data.title = title.trim()
  }

  if (description !== undefined) {
    if (typeof description !== 'string') {
      throw new AppError('Field "description" must be a string when provided.', 400, 'VALIDATION_ERROR')
    }
    data.description = description.trim()
  } else if (!partial) {
    data.description = ''
  }

  if (status !== undefined) {
    if (!TASK_STATUSES.includes(status)) {
      throw new AppError(`Field "status" must be one of: ${TASK_STATUSES.join(', ')}.`, 400, 'VALIDATION_ERROR')
    }
    data.status = status
  }

  if (priority !== undefined) {
    if (!TASK_PRIORITIES.includes(priority)) {
      throw new AppError(`Field "priority" must be one of: ${TASK_PRIORITIES.join(', ')}.`, 400, 'VALIDATION_ERROR')
    }
    data.priority = priority
  }

  if (assigneeId !== undefined) {
    if (assigneeId === null) {
      data.assigneeId = null
    } else {
      if (typeof assigneeId !== 'string') {
        throw new AppError('Field "assigneeId" must be a string or null.', 400, 'VALIDATION_ERROR')
      }
      const assigneeMembership = await getActiveMembership(projectId, assigneeId)
      if (!assigneeMembership) {
        throw new AppError('The assignee must be an active member of the project.', 400, 'VALIDATION_ERROR')
      }
      data.assigneeId = assigneeId
    }
  }

  if (dueDate !== undefined) {
    if (dueDate === null) {
      data.dueDate = null
    } else {
      const parsed = new Date(dueDate)
      if (typeof dueDate !== 'string' || Number.isNaN(parsed.getTime())) {
        throw new AppError('Field "dueDate" must be an ISO date string or null.', 400, 'VALIDATION_ERROR')
      }
      data.dueDate = parsed
    }
  }

  if (partial && Object.keys(data).length === 0) {
    throw new AppError('At least one field must be provided.', 400, 'VALIDATION_ERROR')
  }

  return data
}

// Loads the task + caller's project membership for every /:id route (and nested comment routes).
async function loadTaskContext(req, _res, next) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: TASK_INCLUDE,
    })
    if (!task) {
      throw new AppError('Task not found.', 404, 'NOT_FOUND')
    }
    const membership = await getActiveMembership(task.projectId, req.userId)
    if (!membership) {
      throw new AppError("You are not a member of this task's project.", 403, 'FORBIDDEN')
    }
    req.task = task
    req.membership = membership
    next()
  } catch (err) {
    next(err)
  }
}

router.use(requireUser)

// ── Route handlers ────────────────────────────────────────────────────────────

/**
 * POST /api/tasks
 */
router.post('/', wrap(async (req, res) => {
  const { projectId } = req.body ?? {}
  if (!projectId || typeof projectId !== 'string') {
    throw new AppError('Field "projectId" is required.', 400, 'VALIDATION_ERROR')
  }
  await requireProjectMembership(projectId, req.userId)

  const data = await buildTaskData(req.body, projectId, { partial: false })

  const task = await prisma.task.create({
    data: { ...data, projectId, createdById: req.userId },
    include: TASK_INCLUDE,
  })

  if (task.assigneeId && task.assigneeId !== req.userId) {
    await createNotification({
      userId: task.assigneeId,
      type: 'TASK_ASSIGNED',
      title: `You were assigned to "${task.title}"`,
      body: task.description,
      link: `/tasks/${task.id}`,
    })
  }

  res.status(201).json({ data: serializeTask(task) })
}))

/**
 * GET /api/tasks?projectId=&status=&priority=&assigneeId=&page=&limit=
 */
router.get('/', wrap(async (req, res) => {
  const { projectId, status, priority, assigneeId } = req.query

  if (!projectId || typeof projectId !== 'string') {
    throw new AppError('Query parameter "projectId" is required.', 400, 'VALIDATION_ERROR')
  }
  await requireProjectMembership(projectId, req.userId)

  const where = { projectId }

  if (status !== undefined) {
    if (!TASK_STATUSES.includes(status)) {
      throw new AppError(`Invalid status filter. Allowed values: ${TASK_STATUSES.join(', ')}.`, 400, 'INVALID_QUERY_PARAM')
    }
    where.status = status
  }

  if (priority !== undefined) {
    if (!TASK_PRIORITIES.includes(priority)) {
      throw new AppError(`Invalid priority filter. Allowed values: ${TASK_PRIORITIES.join(', ')}.`, 400, 'INVALID_QUERY_PARAM')
    }
    where.priority = priority
  }

  if (assigneeId !== undefined) {
    if (typeof assigneeId !== 'string') {
      throw new AppError('Invalid "assigneeId" filter.', 400, 'INVALID_QUERY_PARAM')
    }
    where.assigneeId = assigneeId
  }

  const page = Math.max(1, parseInt(req.query.page ?? '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit ?? '20', 10)))

  const [total, tasks] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      include: TASK_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  const totalPages = Math.ceil(total / limit)
  res.json({
    data: tasks.map(serializeTask),
    pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
  })
}))

router.use('/:id', loadTaskContext)

/**
 * GET /api/tasks/:id
 */
router.get('/:id', wrap(async (req, res) => {
  res.json({ data: serializeTask(req.task) })
}))

/**
 * PATCH /api/tasks/:id
 */
router.patch('/:id', wrap(async (req, res) => {
  const previousAssigneeId = req.task.assigneeId
  const data = await buildTaskData(req.body, req.task.projectId, { partial: true })

  const updated = await prisma.task.update({
    where: { id: req.task.id },
    data,
    include: TASK_INCLUDE,
  })

  if (
    'assigneeId' in data &&
    updated.assigneeId &&
    updated.assigneeId !== previousAssigneeId &&
    updated.assigneeId !== req.userId
  ) {
    await createNotification({
      userId: updated.assigneeId,
      type: 'TASK_ASSIGNED',
      title: `You were assigned to "${updated.title}"`,
      body: updated.description,
      link: `/tasks/${updated.id}`,
    })
  }

  res.json({ data: serializeTask(updated) })
}))

/**
 * DELETE /api/tasks/:id
 */
router.delete('/:id', wrap(async (req, res) => {
  const isCreator = req.task.createdById === req.userId
  const isProjectManager = ['OWNER', 'ADMIN'].includes(req.membership.role)
  if (!isCreator && !isProjectManager) {
    throw new AppError('Only the task creator or a project owner/admin can delete this task.', 403, 'FORBIDDEN')
  }
  await prisma.task.delete({ where: { id: req.task.id } })
  res.status(204).send()
}))

/**
 * POST /api/tasks/:id/comments
 */
router.post('/:id/comments', wrap(async (req, res) => {
  const { body } = req.body ?? {}
  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    throw new AppError('Field "body" is required and must be a non-empty string.', 400, 'VALIDATION_ERROR')
  }
  if (body.trim().length > 2000) {
    throw new AppError('Field "body" must not exceed 2000 characters.', 400, 'VALIDATION_ERROR')
  }

  const comment = await prisma.comment.create({
    data: { taskId: req.task.id, authorId: req.userId, body: body.trim() },
    include: { author: true },
  })

  const recipients = new Set([req.task.assigneeId, req.task.createdById].filter(Boolean))
  recipients.delete(req.userId)
  for (const recipientId of recipients) {
    await createNotification({
      userId: recipientId,
      type: 'TASK_COMMENTED',
      title: `New comment on "${req.task.title}"`,
      body: comment.body,
      link: `/tasks/${req.task.id}`,
    })
  }

  res.status(201).json({ data: serializeComment(comment) })
}))

/**
 * GET /api/tasks/:id/comments?limit=
 */
router.get('/:id/comments', wrap(async (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '50', 10)))

  const [total, comments] = await Promise.all([
    prisma.comment.count({ where: { taskId: req.task.id } }),
    prisma.comment.findMany({
      where: { taskId: req.task.id },
      include: { author: true },
      orderBy: { createdAt: 'asc' },
      take: limit,
    }),
  ])

  res.json({ data: comments.map(serializeComment), total })
}))

export default router
