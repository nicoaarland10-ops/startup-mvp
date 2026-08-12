import { useState, useEffect, useCallback, useRef } from 'react'
import { apiFetch, getCurrentUserId } from '../lib/api.js'

const BASE_URL = '/api/notifications'
const RECONNECT_DELAY_MS = 3000

export function useNotifications() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Mirrors `notifications` for synchronous reads inside callbacks (e.g.
  // markAsRead needs to know whether an item was unread before patching it,
  // without adding `notifications` to a useCallback dependency list or
  // nesting a second setState inside the setNotifications updater).
  const notificationsRef = useRef([])
  useEffect(() => {
    notificationsRef.current = notifications
  }, [notifications])

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, unreadCount: count } = await apiFetch(BASE_URL)
      setNotifications(data ?? [])
      setUnreadCount(count ?? 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Live push over WebSocket, with a simple fixed-delay reconnect.
  useEffect(() => {
    let mounted = true
    let ws = null
    let reconnectTimer = null

    function connect() {
      if (!mounted) return
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      ws = new WebSocket(`${protocol}//${window.location.host}/ws/notifications?userId=${getCurrentUserId()}`)

      ws.onmessage = (event) => {
        let msg
        try {
          msg = JSON.parse(event.data)
        } catch {
          return
        }
        if (msg?.type === 'notification' && msg.data) {
          setNotifications((prev) => [msg.data, ...prev])
          setUnreadCount((prev) => prev + 1)
        }
      }

      ws.onclose = () => {
        if (mounted) {
          reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS)
        }
      }
    }

    connect()

    return () => {
      mounted = false
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (ws) ws.close()
    }
  }, [])

  const markAsRead = useCallback(async (id) => {
    const { data } = await apiFetch(`${BASE_URL}/${id}/read`, { method: 'PATCH' })
    const wasUnread = notificationsRef.current.some((n) => n.id === id && !n.read)
    setNotifications((prev) => prev.map((n) => (n.id === id ? data : n)))
    if (wasUnread) {
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
    return data
  }, [])

  const markAllAsRead = useCallback(async () => {
    const { data } = await apiFetch(`${BASE_URL}/read-all`, { method: 'POST' })
    setNotifications((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })))
    setUnreadCount(0)
    return data
  }, [])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  }
}
