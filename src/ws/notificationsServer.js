import { WebSocketServer } from 'ws'
import { registerConnection, unregisterConnection } from '../lib/wsRegistry.js'

/**
 * Attaches a WebSocket server for live notification delivery to an existing
 * HTTP server (same port as the Express app, no separate listener).
 *
 * Auth is the same `x-user-id` stand-in used elsewhere in this API: the
 * browser WebSocket API can't set custom headers, so the client instead
 * connects to `/ws/notifications?userId=<id>`.
 */
export function attachNotificationsWebSocketServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/notifications' })

  wss.on('connection', (socket, req) => {
    const { searchParams } = new URL(req.url, 'http://localhost')
    const userId = searchParams.get('userId')

    if (!userId) {
      socket.close(4001, 'Missing userId query parameter')
      return
    }

    registerConnection(userId, socket)

    socket.on('close', () => unregisterConnection(userId, socket))
    socket.on('error', () => unregisterConnection(userId, socket))
  })

  return wss
}
