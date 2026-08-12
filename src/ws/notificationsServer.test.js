import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import http from 'node:http'
import WebSocket from 'ws'
import app from '../app.js'
import { prisma } from '../lib/prisma.js'
import { createNotification } from '../lib/notifications.js'
import { attachNotificationsWebSocketServer } from './notificationsServer.js'
import { _resetForTests } from '../lib/wsRegistry.js'

const USER_ID = 'usr_ws_test'

let server
let wss
let port

beforeEach(async () => {
  _resetForTests()
  await prisma.notification.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.task.deleteMany()
  await prisma.projectMember.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()
  await prisma.user.create({ data: { id: USER_ID, email: `${USER_ID}@example.local`, name: USER_ID } })

  server = http.createServer(app)
  wss = attachNotificationsWebSocketServer(server)
  await new Promise((resolve) => server.listen(0, resolve))
  port = server.address().port
})

afterEach(async () => {
  for (const client of wss.clients) client.terminate()
  await new Promise((resolve) => wss.close(resolve))
  await new Promise((resolve) => server.close(resolve))
})

function connect(userId) {
  const qs = userId ? `?userId=${userId}` : ''
  return new WebSocket(`ws://localhost:${port}/ws/notifications${qs}`)
}

describe('notifications WebSocket server', () => {
  it('delivers a live notification to a connected client', async () => {
    const ws = connect(USER_ID)
    await new Promise((resolve, reject) => {
      ws.on('open', resolve)
      ws.on('error', reject)
    })

    const messagePromise = new Promise((resolve) => {
      ws.on('message', (data) => resolve(JSON.parse(data.toString())))
    })

    const notification = await createNotification({ userId: USER_ID, type: 'TASK_ASSIGNED', title: 'Live push' })

    const message = await messagePromise
    // JSON round-trips Dates to strings, so normalize before comparing.
    expect(message).toEqual(JSON.parse(JSON.stringify({ type: 'notification', data: notification })))

    ws.terminate()
  })

  it('closes the connection with code 4001 when no userId is provided', async () => {
    const ws = connect(null)
    const closeCode = await new Promise((resolve) => {
      ws.on('close', (code) => resolve(code))
    })
    expect(closeCode).toBe(4001)
  })

  it("does not deliver notifications to a different user's connection", async () => {
    const ws = connect('someone_else')
    await new Promise((resolve) => ws.on('open', resolve))

    let received = false
    ws.on('message', () => { received = true })

    await createNotification({ userId: USER_ID, type: 'TASK_ASSIGNED', title: 'Not for you' })
    await new Promise((r) => setTimeout(r, 50))

    expect(received).toBe(false)
    ws.terminate()
  })
})
