import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireUser } from '../middleware/auth.js'
import { serializeNotification } from '../lib/notifications.js'
import { buildDailyDigest, sendDailyDigest } from '../lib/emailDigest.js'

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

router.use(requireUser)

// ── Route handlers ────────────────────────────────────────────────────────────

/**
 * GET /api/notifications?unreadOnly=&limit=
 */
router.get('/', wrap(async (req, res) => {
  const unreadOnly = req.query.unreadOnly === 'true'
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '50', 10)))

  const where = { userId: req.userId, ...(unreadOnly ? { read: false } : {}) }

  const [total, unreadCount, notifications] = await Promise.all([
    prisma.notification.count({ where: { userId: req.userId } }),
    prisma.notification.count({ where: { userId: req.userId, read: false } }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
  ])

  res.json({
    data: notifications.map(serializeNotification),
    unreadCount,
    total,
  })
}))

/**
 * PATCH /api/notifications/:id/read
 */
router.patch('/:id/read', wrap(async (req, res) => {
  const notification = await prisma.notification.findUnique({ where: { id: req.params.id } })
  if (!notification || notification.userId !== req.userId) {
    throw new AppError('Notification not found.', 404, 'NOT_FOUND')
  }

  const updated = await prisma.notification.update({
    where: { id: notification.id },
    data: { read: true },
  })

  res.json({ data: serializeNotification(updated) })
}))

/**
 * POST /api/notifications/read-all
 */
router.post('/read-all', wrap(async (req, res) => {
  const { count } = await prisma.notification.updateMany({
    where: { userId: req.userId, read: false },
    data: { read: true },
  })

  res.json({ data: { count } })
}))

/**
 * GET /api/notifications/digest — preview the current user's daily digest without sending it.
 */
router.get('/digest', wrap(async (req, res) => {
  const digest = await buildDailyDigest(req.userId)
  res.json({ data: digest })
}))

/**
 * POST /api/notifications/digest/send — mock-sends (logs) the current user's daily digest.
 */
router.post('/digest/send', wrap(async (req, res) => {
  const digest = await sendDailyDigest(req.userId)
  res.json({ data: digest })
}))

export default router
