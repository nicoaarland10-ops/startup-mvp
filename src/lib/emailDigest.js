import { prisma } from './prisma.js'

const DIGEST_WINDOW_MS = 24 * 60 * 60 * 1000

/**
 * Builds a per-user summary of notifications from the last 24h, grouped by type.
 */
export async function buildDailyDigest(userId, now = new Date()) {
  const periodStart = new Date(now.getTime() - DIGEST_WINDOW_MS)

  const notifications = await prisma.notification.findMany({
    where: { userId, createdAt: { gte: periodStart, lte: now } },
    orderBy: { createdAt: 'asc' },
  })

  const groups = {}
  for (const n of notifications) {
    if (!groups[n.type]) groups[n.type] = []
    groups[n.type].push({ id: n.id, title: n.title, body: n.body, link: n.link, createdAt: n.createdAt })
  }

  return {
    userId,
    periodStart,
    periodEnd: now,
    totalCount: notifications.length,
    groups,
  }
}

/**
 * "Sends" the daily digest email. No real email provider is wired up this
 * sprint — the formatted digest is logged (clearly marked as a mock send)
 * and returned so callers/tests can inspect exactly what would have gone
 * out once a real provider (e.g. Resend/SendGrid/SMTP) replaces this.
 */
export async function sendDailyDigest(userId, now = new Date()) {
  const digest = await buildDailyDigest(userId, now)
  const user = await prisma.user.findUnique({ where: { id: userId } })

  const lines = [
    `[MOCK EMAIL] Daily digest for ${user?.email ?? userId}`,
    `Period: ${digest.periodStart.toISOString()} - ${digest.periodEnd.toISOString()}`,
    `Total notifications: ${digest.totalCount}`,
    ...Object.entries(digest.groups).map(([type, items]) => `  ${type}: ${items.length}`),
  ]
  console.log(lines.join('\n'))

  return { ...digest, mock: true, sentAt: new Date() }
}
