import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import NotificationBell from './NotificationBell.jsx'
import { useNotifications } from '../hooks/useNotifications.js'

vi.mock('../hooks/useNotifications.js', () => ({
  useNotifications: vi.fn(),
}))

const baseNotifications = [
  {
    id: 'n1',
    userId: 'demo-user-1',
    type: 'TASK_ASSIGNED',
    title: 'You were assigned a task',
    body: 'Ship the release',
    link: '/tasks/abc123',
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'n2',
    userId: 'demo-user-1',
    type: 'MEMBER_INVITED',
    title: 'New member invited',
    body: null,
    link: null,
    read: true,
    createdAt: new Date().toISOString(),
  },
]

function mockHook(overrides = {}) {
  const defaults = {
    notifications: baseNotifications,
    unreadCount: 1,
    loading: false,
    error: null,
    markAsRead: vi.fn().mockResolvedValue({}),
    markAllAsRead: vi.fn().mockResolvedValue({}),
    refetch: vi.fn(),
  }
  const value = { ...defaults, ...overrides }
  useNotifications.mockReturnValue(value)
  return value
}

function renderBell() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<NotificationBell />} />
        <Route path="/tasks/:id" element={<div>Task Page</div>} />
        <Route path="/projects/:id" element={<div>Project Page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  mockHook()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('NotificationBell', () => {
  it('shows the unread count badge', () => {
    renderBell()
    expect(screen.getByLabelText('1 unread notifications')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('caps the badge at "9+" for large unread counts', () => {
    mockHook({ unreadCount: 14 })
    renderBell()
    expect(screen.getByText('9+')).toBeInTheDocument()
  })

  it('hides the badge when there are no unread notifications', () => {
    mockHook({ unreadCount: 0 })
    renderBell()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('toggles the dropdown open on click and lists notifications', async () => {
    const user = userEvent.setup()
    renderBell()

    expect(screen.queryByText('Notifications')).not.toBeInTheDocument()

    await user.click(screen.getByLabelText('1 unread notifications'))

    expect(screen.getByText('Notifications')).toBeInTheDocument()
    expect(screen.getByText('You were assigned a task')).toBeInTheDocument()
    expect(screen.getByText('Ship the release')).toBeInTheDocument()
    expect(screen.getByText('New member invited')).toBeInTheDocument()
  })

  it('shows an empty state when there are no notifications', async () => {
    mockHook({ notifications: [], unreadCount: 0 })
    const user = userEvent.setup()
    renderBell()

    await user.click(screen.getByLabelText('0 unread notifications'))
    expect(screen.getByText('No notifications yet')).toBeInTheDocument()
  })

  it('marks a notification read and navigates to its link on click', async () => {
    const { markAsRead } = mockHook()
    const user = userEvent.setup()
    renderBell()

    await user.click(screen.getByLabelText('1 unread notifications'))
    await user.click(screen.getByText('You were assigned a task'))

    expect(markAsRead).toHaveBeenCalledWith('n1')
    await waitFor(() => expect(screen.getByText('Task Page')).toBeInTheDocument())
  })

  it('does not call markAsRead again for an already-read notification, but still navigates', async () => {
    const { markAsRead } = mockHook({ unreadCount: 0 })
    const user = userEvent.setup()
    renderBell()

    await user.click(screen.getByLabelText('0 unread notifications'))
    await user.click(screen.getByText('New member invited'))

    expect(markAsRead).not.toHaveBeenCalled()
    // n2 has a null link, so no navigation occurs; dropdown should just close.
    await waitFor(() => expect(screen.queryByText('Notifications')).not.toBeInTheDocument())
  })

  it('calls markAllAsRead when "Mark all as read" is clicked', async () => {
    const { markAllAsRead } = mockHook()
    const user = userEvent.setup()
    renderBell()

    await user.click(screen.getByLabelText('1 unread notifications'))
    await user.click(screen.getByText('Mark all as read'))

    expect(markAllAsRead).toHaveBeenCalled()
  })

  it('does not show "Mark all as read" when there is nothing unread', async () => {
    mockHook({ unreadCount: 0 })
    const user = userEvent.setup()
    renderBell()

    await user.click(screen.getByLabelText('0 unread notifications'))
    expect(screen.queryByText('Mark all as read')).not.toBeInTheDocument()
  })

  it('closes the dropdown on outside click', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <div>
          <NotificationBell />
          <button type="button">Outside</button>
        </div>
      </MemoryRouter>
    )

    await user.click(screen.getByLabelText('1 unread notifications'))
    expect(screen.getByText('Notifications')).toBeInTheDocument()

    await user.click(screen.getByText('Outside'))
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument()
  })
})
