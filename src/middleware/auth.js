import { prisma } from '../lib/prisma.js'

/**
 * Stand-in for Feature 1 (JWT auth), which isn't wired into requests yet.
 * Trusts an `x-user-id` header and auto-provisions a matching User row so
 * downstream routes can rely on `req.userId` pointing at a real user.
 */
export async function requireUser(req, res, next) {
  const userId = req.headers['x-user-id']
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing required "x-user-id" header.' })
  }

  try {
    const user = await prisma.user.upsert({
      where: { id: userId },
      create: { id: userId, email: `${userId}@example.local`, name: userId },
      update: {},
    })
    req.userId = user.id
    next()
  } catch (err) {
    next(err)
  }
}
