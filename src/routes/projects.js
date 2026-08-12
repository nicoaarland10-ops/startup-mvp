import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireUser } from '../middleware/auth.js'

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ASSIGNABLE_ROLES = ['ADMIN', 'MEMBER']

function serializeMember(member) {
  return {
    id: member.id,
    projectId: member.projectId,
    userId: member.userId,
    email: member.email,
    name: member.user?.name ?? null,
    role: member.role,
    status: member.status,
    invitedAt: member.invitedAt,
  }
}

function serializeProject(project) {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    ownerId: project.ownerId,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    members: project.members.map(serializeMember),
  }
}

function requireRole(req, roles) {
  if (!req.membership || !roles.includes(req.membership.role)) {
    throw new AppError('You do not have permission to perform this action.', 403, 'FORBIDDEN')
  }
}

// Loads the project + membership context for every /: id route (and nested member routes).
async function loadProjectContext(req, _res, next) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { members: { include: { user: true } } },
    })
    if (!project) {
      throw new AppError('Project not found.', 404, 'NOT_FOUND')
    }
    req.project = project
    req.membership = project.members.find((m) => m.userId === req.userId) ?? null
    next()
  } catch (err) {
    next(err)
  }
}

router.use(requireUser)

// ── Route handlers ────────────────────────────────────────────────────────────

/**
 * POST /api/projects
 */
router.post('/', wrap(async (req, res) => {
  const { name, description } = req.body ?? {}

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new AppError('Field "name" is required and must be a non-empty string.', 400, 'VALIDATION_ERROR')
  }
  if (name.trim().length > 120) {
    throw new AppError('Field "name" must not exceed 120 characters.', 400, 'VALIDATION_ERROR')
  }
  if (description !== undefined && typeof description !== 'string') {
    throw new AppError('Field "description" must be a string when provided.', 400, 'VALIDATION_ERROR')
  }

  const owner = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } })

  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      description: description?.trim() ?? '',
      ownerId: owner.id,
      members: {
        create: {
          userId: owner.id,
          email: owner.email,
          role: 'OWNER',
          status: 'ACTIVE',
        },
      },
    },
    include: { members: { include: { user: true } } },
  })

  res.status(201).json({ data: serializeProject(project) })
}))

router.use('/:id', loadProjectContext)

/**
 * GET /api/projects/:id
 */
router.get('/:id', wrap(async (req, res) => {
  if (!req.membership) {
    throw new AppError('You are not a member of this project.', 403, 'FORBIDDEN')
  }
  res.json({ data: serializeProject(req.project) })
}))

/**
 * PATCH /api/projects/:id
 */
router.patch('/:id', wrap(async (req, res) => {
  requireRole(req, ['OWNER', 'ADMIN'])

  const { name, description } = req.body ?? {}
  if (name === undefined && description === undefined) {
    throw new AppError('At least one of "name" or "description" must be provided.', 400, 'VALIDATION_ERROR')
  }

  const data = {}
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new AppError('Field "name" must be a non-empty string.', 400, 'VALIDATION_ERROR')
    }
    if (name.trim().length > 120) {
      throw new AppError('Field "name" must not exceed 120 characters.', 400, 'VALIDATION_ERROR')
    }
    data.name = name.trim()
  }
  if (description !== undefined) {
    if (typeof description !== 'string') {
      throw new AppError('Field "description" must be a string.', 400, 'VALIDATION_ERROR')
    }
    data.description = description.trim()
  }

  const updated = await prisma.project.update({
    where: { id: req.project.id },
    data,
    include: { members: { include: { user: true } } },
  })

  res.json({ data: serializeProject(updated) })
}))

/**
 * DELETE /api/projects/:id
 */
router.delete('/:id', wrap(async (req, res) => {
  if (!req.membership || req.membership.role !== 'OWNER') {
    throw new AppError('Only the project owner can delete this project.', 403, 'FORBIDDEN')
  }
  await prisma.project.delete({ where: { id: req.project.id } })
  res.status(204).send()
}))

/**
 * POST /api/projects/:id/members
 */
router.post('/:id/members', wrap(async (req, res) => {
  requireRole(req, ['OWNER', 'ADMIN'])

  const { email, role = 'MEMBER' } = req.body ?? {}
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    throw new AppError('A valid "email" is required.', 400, 'VALIDATION_ERROR')
  }
  if (!ASSIGNABLE_ROLES.includes(role)) {
    throw new AppError(`Field "role" must be one of: ${ASSIGNABLE_ROLES.join(', ')}.`, 400, 'VALIDATION_ERROR')
  }

  const normalizedEmail = email.trim().toLowerCase()
  const existing = await prisma.projectMember.findUnique({
    where: { projectId_email: { projectId: req.project.id, email: normalizedEmail } },
  })
  if (existing) {
    throw new AppError('This email has already been invited to the project.', 409, 'CONFLICT')
  }

  const invitedUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })

  const member = await prisma.projectMember.create({
    data: {
      projectId: req.project.id,
      email: normalizedEmail,
      role,
      status: invitedUser ? 'ACTIVE' : 'PENDING',
      userId: invitedUser?.id ?? null,
    },
    include: { user: true },
  })

  res.status(201).json({ data: serializeMember(member) })
}))

/**
 * PATCH /api/projects/:id/members/:memberId
 */
router.patch('/:id/members/:memberId', wrap(async (req, res) => {
  requireRole(req, ['OWNER', 'ADMIN'])

  const { role } = req.body ?? {}
  if (!ASSIGNABLE_ROLES.includes(role)) {
    throw new AppError(`Field "role" must be one of: ${ASSIGNABLE_ROLES.join(', ')}.`, 400, 'VALIDATION_ERROR')
  }

  const target = req.project.members.find((m) => m.id === req.params.memberId)
  if (!target) {
    throw new AppError('Member not found.', 404, 'NOT_FOUND')
  }
  if (target.role === 'OWNER') {
    throw new AppError("The project owner's role cannot be changed.", 400, 'CANNOT_MODIFY_OWNER')
  }

  const updated = await prisma.projectMember.update({
    where: { id: target.id },
    data: { role },
    include: { user: true },
  })

  res.json({ data: serializeMember(updated) })
}))

/**
 * DELETE /api/projects/:id/members/:memberId
 */
router.delete('/:id/members/:memberId', wrap(async (req, res) => {
  requireRole(req, ['OWNER', 'ADMIN'])

  const target = req.project.members.find((m) => m.id === req.params.memberId)
  if (!target) {
    throw new AppError('Member not found.', 404, 'NOT_FOUND')
  }
  if (target.role === 'OWNER') {
    throw new AppError('The project owner cannot be removed.', 400, 'CANNOT_REMOVE_OWNER')
  }

  await prisma.projectMember.delete({ where: { id: target.id } })
  res.status(204).send()
}))

export default router
