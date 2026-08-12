// Per-user registry of open notification WebSocket connections.
// Kept separate from the ws server module so route handlers (and tests) can
// push to a user without importing `ws` or standing up a real socket.

const connectionsByUser = new Map()

export function registerConnection(userId, socket) {
  if (!connectionsByUser.has(userId)) {
    connectionsByUser.set(userId, new Set())
  }
  connectionsByUser.get(userId).add(socket)
}

export function unregisterConnection(userId, socket) {
  const sockets = connectionsByUser.get(userId)
  if (!sockets) return
  sockets.delete(socket)
  if (sockets.size === 0) {
    connectionsByUser.delete(userId)
  }
}

export function pushToUser(userId, payload) {
  const sockets = connectionsByUser.get(userId)
  if (!sockets || sockets.size === 0) return 0

  const message = JSON.stringify(payload)
  let delivered = 0
  for (const socket of sockets) {
    // readyState 1 === OPEN, checked structurally so tests can pass plain
    // { readyState, send } stand-ins without depending on the `ws` package.
    if (socket.readyState === 1) {
      socket.send(message)
      delivered += 1
    }
  }
  return delivered
}

export function connectionCount(userId) {
  return connectionsByUser.get(userId)?.size ?? 0
}

// Test-only: reset all registered connections between test files/runs.
export function _resetForTests() {
  connectionsByUser.clear()
}
