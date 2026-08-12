import { describe, it, expect, beforeEach } from 'vitest'
import {
  registerConnection,
  unregisterConnection,
  pushToUser,
  connectionCount,
  _resetForTests,
} from './wsRegistry.js'

function fakeSocket(readyState = 1) {
  return { readyState, sent: [], send(msg) { this.sent.push(msg) } }
}

beforeEach(() => {
  _resetForTests()
})

describe('wsRegistry', () => {
  it('delivers a push to a registered open connection', () => {
    const socket = fakeSocket()
    registerConnection('u1', socket)

    const delivered = pushToUser('u1', { type: 'notification', data: { id: 'n1' } })

    expect(delivered).toBe(1)
    expect(socket.sent).toHaveLength(1)
    expect(JSON.parse(socket.sent[0])).toMatchObject({ type: 'notification', data: { id: 'n1' } })
  })

  it('returns 0 and sends nothing for a user with no connections', () => {
    const delivered = pushToUser('nobody', { type: 'notification' })
    expect(delivered).toBe(0)
  })

  it('supports multiple connections for the same user', () => {
    const a = fakeSocket()
    const b = fakeSocket()
    registerConnection('u1', a)
    registerConnection('u1', b)

    const delivered = pushToUser('u1', { type: 'notification' })

    expect(delivered).toBe(2)
    expect(a.sent).toHaveLength(1)
    expect(b.sent).toHaveLength(1)
  })

  it('skips sockets that are not open', () => {
    const open = fakeSocket(1)
    const closed = fakeSocket(3) // CLOSED
    registerConnection('u1', open)
    registerConnection('u1', closed)

    const delivered = pushToUser('u1', { type: 'notification' })

    expect(delivered).toBe(1)
    expect(open.sent).toHaveLength(1)
    expect(closed.sent).toHaveLength(0)
  })

  it('stops delivering after unregisterConnection', () => {
    const socket = fakeSocket()
    registerConnection('u1', socket)
    unregisterConnection('u1', socket)

    const delivered = pushToUser('u1', { type: 'notification' })

    expect(delivered).toBe(0)
    expect(connectionCount('u1')).toBe(0)
  })

  it('unregisterConnection is a no-op for an unknown user', () => {
    expect(() => unregisterConnection('ghost', fakeSocket())).not.toThrow()
  })

  it('connectionCount reflects the number of registered sockets', () => {
    registerConnection('u1', fakeSocket())
    registerConnection('u1', fakeSocket())
    expect(connectionCount('u1')).toBe(2)
    expect(connectionCount('u2')).toBe(0)
  })
})
