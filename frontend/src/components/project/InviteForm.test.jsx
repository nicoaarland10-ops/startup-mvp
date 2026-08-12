import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InviteForm from './InviteForm.jsx'

describe('InviteForm', () => {
  it('renders email input, role select, and submit button', () => {
    render(<InviteForm onInvite={vi.fn()} />)
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/role/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send invite/i })).toBeInTheDocument()
  })

  it('shows validation error when email is empty', async () => {
    const user = userEvent.setup()
    render(<InviteForm onInvite={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /send invite/i }))
    expect(screen.getByRole('alert')).toHaveTextContent('Email is required')
  })

  it('shows validation error for malformed email', async () => {
    const user = userEvent.setup()
    render(<InviteForm onInvite={vi.fn()} />)
    await user.type(screen.getByLabelText(/email address/i), 'not-an-email')
    await user.click(screen.getByRole('button', { name: /send invite/i }))
    expect(screen.getByRole('alert')).toHaveTextContent('valid email')
  })

  it('calls onInvite with email and role, then clears the form on success', async () => {
    const onInvite = vi.fn().mockResolvedValue({})
    const user = userEvent.setup()
    render(<InviteForm onInvite={onInvite} />)

    await user.type(screen.getByLabelText(/email address/i), 'teammate@test.com')
    await user.selectOptions(screen.getByLabelText(/role/i), 'ADMIN')
    await user.click(screen.getByRole('button', { name: /send invite/i }))

    await waitFor(() => expect(onInvite).toHaveBeenCalledWith({ email: 'teammate@test.com', role: 'ADMIN' }))
    await waitFor(() => expect(screen.getByLabelText(/email address/i)).toHaveValue(''))
  })

  it('surfaces a friendly conflict message on 409', async () => {
    const err = new Error('Conflict')
    err.code = 'CONFLICT'
    const onInvite = vi.fn().mockRejectedValue(err)
    const user = userEvent.setup()
    render(<InviteForm onInvite={onInvite} />)

    await user.type(screen.getByLabelText(/email address/i), 'dup@test.com')
    await user.click(screen.getByRole('button', { name: /send invite/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/already invited/i))
  })

  it('surfaces the server error message for non-conflict failures', async () => {
    const err = new Error('Something went wrong')
    err.code = 'VALIDATION_ERROR'
    const onInvite = vi.fn().mockRejectedValue(err)
    const user = userEvent.setup()
    render(<InviteForm onInvite={onInvite} />)

    await user.type(screen.getByLabelText(/email address/i), 'bad@test.com')
    await user.click(screen.getByRole('button', { name: /send invite/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong'))
  })
})
