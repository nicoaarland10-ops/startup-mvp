import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CommentThread from './CommentThread.jsx'

const comment1 = {
  id: 'comment_1',
  taskId: 'task_1',
  authorId: 'u1',
  author: { id: 'u1', name: 'Owner Person', email: 'owner@test.com' },
  body: 'First comment',
  createdAt: new Date('2026-01-01T12:00:00Z').toISOString(),
}

const comment2 = {
  id: 'comment_2',
  taskId: 'task_1',
  authorId: 'u2',
  author: { id: 'u2', name: null, email: 'noname@test.com' },
  body: 'Second comment',
  createdAt: new Date('2026-01-02T12:00:00Z').toISOString(),
}

describe('CommentThread', () => {
  it('shows an empty state when there are no comments', () => {
    render(<CommentThread comments={[]} onAddComment={vi.fn()} />)
    expect(screen.getByText(/no comments yet/i)).toBeInTheDocument()
  })

  it('renders comment author names and bodies in order, falling back to email', () => {
    render(<CommentThread comments={[comment1, comment2]} onAddComment={vi.fn()} />)
    expect(screen.getByText('Owner Person')).toBeInTheDocument()
    expect(screen.getByText('First comment')).toBeInTheDocument()
    expect(screen.getByText('noname@test.com')).toBeInTheDocument()
    expect(screen.getByText('Second comment')).toBeInTheDocument()
  })

  it('disables the submit button while the textarea is empty', () => {
    render(<CommentThread comments={[]} onAddComment={vi.fn()} />)
    expect(screen.getByRole('button', { name: /post comment/i })).toBeDisabled()
  })

  it('submits a new comment and clears the textarea', async () => {
    const onAddComment = vi.fn().mockResolvedValue({})
    const user = userEvent.setup()
    render(<CommentThread comments={[]} onAddComment={onAddComment} />)

    const textarea = screen.getByLabelText(/add a comment/i)
    await user.type(textarea, 'A new comment')
    await user.click(screen.getByRole('button', { name: /post comment/i }))

    expect(onAddComment).toHaveBeenCalledWith('A new comment')
    expect(textarea).toHaveValue('')
  })

  it('surfaces an error when submission fails', async () => {
    const onAddComment = vi.fn().mockRejectedValue(new Error('Comment body is required'))
    const user = userEvent.setup()
    render(<CommentThread comments={[]} onAddComment={onAddComment} />)

    await user.type(screen.getByLabelText(/add a comment/i), 'Oops')
    await user.click(screen.getByRole('button', { name: /post comment/i }))

    expect(await screen.findByText('Comment body is required')).toBeInTheDocument()
  })

  it('does not submit whitespace-only input', async () => {
    const onAddComment = vi.fn()
    const user = userEvent.setup()
    render(<CommentThread comments={[]} onAddComment={onAddComment} />)

    await user.type(screen.getByLabelText(/add a comment/i), '   ')
    expect(screen.getByRole('button', { name: /post comment/i })).toBeDisabled()
  })
})
