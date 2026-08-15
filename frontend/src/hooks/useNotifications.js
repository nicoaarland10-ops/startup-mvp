import { useState, useEffect, useCallback, useRef } from 'react'
import { apiFetch } from '../lib/api.js'

const BASE_URL = '/api/dashboard/notifications'
const POLL_INTERVAL_MS = 30000

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

  // The mock dashboard API has no push channel, so poll for new
  // notifications instead of holding open a WebSocket to a server that
  // doesn't serve one.
  useEffect(() => {
    const id = setInterval(fetchNotifications, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [fetchNotifications])

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
