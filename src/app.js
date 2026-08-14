import express from 'express'
import cors from 'cors'
import crypto from 'crypto'
import dashboardRouter from './routes/dashboard.js'
import projectsRouter from './routes/projects.js'
import tasksRouter from './routes/tasks.js'
import notificationsRouter from './routes/notifications.js'
import { attachNotificationsWebSocketServer } from './ws/notificationsServer.js'
import { checkTaskDeadlines } from './lib/deadlineCheck.js'

const app = express()
const PORT = process.env.PORT || 5000

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'x-user-id'],
}))

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

// Attach a correlation ID to every request for distributed tracing
app.use((req, _res, next) => {
  req.correlationId = req.headers['x-correlation-id'] ?? crypto.randomUUID()
  next()
})

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ai-collab-platform-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/dashboard', dashboardRouter)
app.use('/api/projects', projectsRouter)
app.use('/api/tasks', tasksRouter)
app.use('/api/notifications', notificationsRouter)

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: 'The requested resource does not exist.',
  })
})

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const statusCode = err.statusCode ?? 500
  const isOperational = statusCode < 500

  console.error({
    correlationId: req.correlationId,
    statusCode,
    message: err.message,
    stack: isOperational ? undefined : err.stack,
  })

  res.status(statusCode).json({
    error: err.code ?? 'INTERNAL_SERVER_ERROR',
    message: isOperational
      ? err.message
      : 'An unexpected error occurred. Please try again later.',
    correlationId: req.correlationId,
  })
})

// ── Start ─────────────────────────────────────────────────────────────────────
const DEADLINE_CHECK_INTERVAL_MS = 60 * 60 * 1000 // hourly

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`[server] Listening on http://localhost:${PORT}`)
  })

  attachNotificationsWebSocketServer(server)

  checkTaskDeadlines().catch((err) => console.error('[deadline-check]', err))
  setInterval(() => {
    checkTaskDeadlines().catch((err) => console.error('[deadline-check]', err))
  }, DEADLINE_CHECK_INTERVAL_MS)
}

export default app
