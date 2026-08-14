import express from 'express'
import cors from 'cors'
import crypto from 'crypto'
import dashboardRouter from './routes/dashboard.js'

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'x-user-id'],
}))

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

app.use((req, _res, next) => {
  req.correlationId = req.headers['x-correlation-id'] ?? crypto.randomUUID()
  next()
})

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ai-collab-platform-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

app.use('/api/dashboard', dashboardRouter)

app.use((_req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: 'The requested resource does not exist.',
  })
})

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

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[server] Listening on http://localhost:${PORT}`)
  })
}

export default app
