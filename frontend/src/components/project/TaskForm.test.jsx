import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TaskForm from './TaskForm.jsx'

const members = [
  { id: 'mem_1', projectId: 'p1', userId: 'u1', email: 'owner@test.com', name: 'Owner Person', role: 'OWNER', status: 'ACTIVE' },
  { id: 'mem_2', projectId: 'p1', userId: 'u2', email: 'member@test.com', name: 'Member Person', role: 'MEMBER', status: 'ACTIVE' },
  { id: 'mem_3', projectId: 'p1', userId: null, email: 'pending@test.com', name: null, role: 'MEMBER', status: 'PENDING' },
]

describe('TaskForm', () => {
  it('renders fields with default values for a new task', () => {
    render(<TaskForm members={members} onSubmit={vi.fn()} onCancel={vi.fn()} submitLabel="Create task" />)
    expect(screen.getByLabelText(/title/i)).toHaveValue('')
    expect(screen.getByLabelText(/status/i)).toHaveValue('TODO')
    expect(screen.getByLabelText(/priority/i)).toHaveValue('MEDIUM')
    expect(screen.getByLabelText(/assignee/i)).toHaveValue('')
    expect(screen.getByRole('button', { name: /create task/i })).toBeInTheDocument()
  })

  it('only lists ACTIVE members as assignee options', () => {
    render(<TaskForm members={members} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('option', { name: 'Owner Person' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Member Person' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'pending@test.com' })).not.toBeInTheDocument()
  })

  it('falls back to member id when a member record has no userId', () => {
    const membersWithoutUserId = [
      { id: 'mem_9', projectId: 'p1', userId: undefined, email: 'noid@test.com', name: 'No Id', role: 'MEMBER', status: 'ACTIVE' },
    ]
    render(<TaskForm members={membersWithoutUserId} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('option', { name: 'No Id' })).toHaveValue('mem_9')
  })

  it('prefills fields from initialValues when editing', () => {
    render(
      <TaskForm
        members={members}
        initialValues={{ title: 'Existing task', description: 'Some detail', status: 'IN_REVIEW', priority: 'HIGH', assigneeId: 'u2' }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        submitLabel="Save"
      />
    )
    expect(screen.getByLabelText(/title/i)).toHaveValue('Existing task')
    expect(screen.getByLabelText(/description/i)).toHaveValue('Some detail')
    expect(screen.getByLabelText(/status/i)).toHaveValue('IN_REVIEW')
    expect(screen.getByLabelText(/priority/i)).toHaveValue('HIGH')
    expect(screen.getByLabelText(/assignee/i)).toHaveValue('u2')
  })

  it('shows a validation error when title is empty', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<TaskForm members={members} onSubmit={onSubmit} onCancel={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/title is required/i)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows a validation error when title exceeds 200 characters', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<TaskForm members={members} onSubmit={onSubmit} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText(/title/i), 'a'.repeat(201))
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/200 characters or fewer/i)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits the trimmed payload and includes null for unassigned', async () => {
    const onSubmit = vi.fn().mockResolvedValue({})
    const user = userEvent.setup()
    render(<TaskForm members={members} onSubmit={onSubmit} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText(/title/i), '  New task  ')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'New task',
      description: '',
      status: 'TODO',
      priority: 'MEDIUM',
      assigneeId: null,
    })
  })

  it('lets the user change description, status, and priority fields', async () => {
    const onSubmit = vi.fn().mockResolvedValue({})
    const user = userEvent.setup()
    render(<TaskForm members={members} onSubmit={onSubmit} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText(/title/i), 'Task with details')
    await user.type(screen.getByLabelText(/description/i), 'Some extra detail')
    await user.selectOptions(screen.getByLabelText(/status/i), 'IN_REVIEW')
    await user.selectOptions(screen.getByLabelText(/priority/i), 'URGENT')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Task with details',
      description: 'Some extra detail',
      status: 'IN_REVIEW',
      priority: 'URGENT',
      assigneeId: null,
    })
  })

  it('falls back to a generic message when the rejected error has no message', async () => {
    const onSubmit = vi.fn().mockRejectedValue({})
    const user = userEvent.setup()
    render(<TaskForm members={members} onSubmit={onSubmit} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText(/title/i), 'New task')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByText('Failed to save task')).toBeInTheDocument()
  })

  it('submits the selected assignee id', async () => {
    const onSubmit = vi.fn().mockResolvedValue({})
    const user = userEvent.setup()
    render(<TaskForm members={members} onSubmit={onSubmit} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText(/title/i), 'Assigned task')
    await user.selectOptions(screen.getByLabelText(/assignee/i), 'u2')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ assigneeId: 'u2' }))
  })

  it('surfaces a server error when onSubmit rejects', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Assignee is not an active member'))
    const user = userEvent.setup()
    render(<TaskForm members={members} onSubmit={onSubmit} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText(/title/i), 'New task')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByText('Assignee is not an active member')).toBeInTheDocument()
  })

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(<TaskForm members={members} onSubmit={vi.fn()} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalled()
  })
})
