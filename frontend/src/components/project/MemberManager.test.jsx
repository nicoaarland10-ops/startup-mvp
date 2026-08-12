import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MemberManager from './MemberManager.jsx'

const owner = { id: 'mem_1', projectId: 'p1', userId: 'u1', email: 'owner@test.com', name: 'Owner Person', role: 'OWNER', status: 'ACTIVE', invitedAt: new Date().toISOString() }
const admin = { id: 'mem_2', projectId: 'p1', userId: 'u2', email: 'admin@test.com', name: 'Admin Person', role: 'ADMIN', status: 'ACTIVE', invitedAt: new Date().toISOString() }
const pending = { id: 'mem_3', projectId: 'p1', userId: null, email: 'pending@test.com', name: null, role: 'MEMBER', status: 'PENDING', invitedAt: new Date().toISOString() }

describe('MemberManager', () => {
  it('shows empty state when no members', () => {
    render(<MemberManager members={[]} onRoleChange={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByText(/no members yet/i)).toBeInTheDocument()
  })

  it('renders member name/email, role and status badges', () => {
    render(<MemberManager members={[owner, admin, pending]} onRoleChange={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByText('Owner Person')).toBeInTheDocument()
    expect(screen.getByText('Admin Person')).toBeInTheDocument()
    // pending member has no name, falls back to email
    expect(screen.getByText('pending@test.com')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getAllByText('Active')).toHaveLength(2)
  })

  it('does not render role-change or remove controls for the OWNER row', () => {
    render(<MemberManager members={[owner]} onRoleChange={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByText('Owner')).toBeInTheDocument()
    expect(screen.queryByLabelText(/change role for owner person/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/remove owner person/i)).not.toBeInTheDocument()
  })

  it('calls onRoleChange when a non-owner role select changes', async () => {
    const onRoleChange = vi.fn().mockResolvedValue({})
    const user = userEvent.setup()
    render(<MemberManager members={[owner, admin]} onRoleChange={onRoleChange} onRemove={vi.fn()} />)

    await user.selectOptions(screen.getByLabelText(/change role for admin person/i), 'MEMBER')
    expect(onRoleChange).toHaveBeenCalledWith('mem_2', 'MEMBER')
  })

  it('requires a confirm step before calling onRemove', async () => {
    const onRemove = vi.fn().mockResolvedValue({})
    const user = userEvent.setup()
    render(<MemberManager members={[owner, admin]} onRoleChange={vi.fn()} onRemove={onRemove} />)

    await user.click(screen.getByLabelText(/remove admin person/i))
    expect(onRemove).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /confirm/i }))
    expect(onRemove).toHaveBeenCalledWith('mem_2')
  })

  it('cancels removal without calling onRemove', async () => {
    const onRemove = vi.fn()
    const user = userEvent.setup()
    render(<MemberManager members={[owner, admin]} onRoleChange={vi.fn()} onRemove={onRemove} />)

    await user.click(screen.getByLabelText(/remove admin person/i))
    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onRemove).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/remove admin person/i)).toBeInTheDocument()
  })
})
