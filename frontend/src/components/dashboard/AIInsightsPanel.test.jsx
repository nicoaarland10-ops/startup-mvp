import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AIInsightsPanel from './AIInsightsPanel.jsx'

const mockInsights = [
  {
    id: 'ins_1',
    title: 'Review Cycle Bottleneck',
    description: 'PR review latency increased 38% this week.',
    type: 'collaboration',
    priority: 'high',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ins_2',
    title: 'Security Alert',
    description: 'Seven new jailbreak vectors logged.',
    type: 'security',
    priority: 'critical',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ins_3',
    title: 'Low Priority Note',
    description: 'Minor optimization opportunity.',
    type: 'productivity',
    priority: 'low',
    status: 'resolved',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

function renderPanel(props = {}) {
  return render(
    <MemoryRouter>
      <AIInsightsPanel insights={mockInsights} {...props} />
    </MemoryRouter>,
  )
}

describe('AIInsightsPanel', () => {
  it('renders section heading', () => {
    renderPanel()
    expect(screen.getByText('AI Insights')).toBeInTheDocument()
  })

  it('renders active insight titles by default and hides resolved ones', () => {
    renderPanel()
    expect(screen.getByText('Review Cycle Bottleneck')).toBeInTheDocument()
    expect(screen.getByText('Security Alert')).toBeInTheDocument()
    expect(screen.queryByText('Low Priority Note')).not.toBeInTheDocument()
  })

  it('renders descriptions', () => {
    renderPanel()
    expect(screen.getByText('PR review latency increased 38% this week.')).toBeInTheDocument()
  })

  it('shows priority badges', () => {
    renderPanel()
    expect(screen.getByLabelText('Priority: High')).toBeInTheDocument()
    expect(screen.getByLabelText('Priority: Critical')).toBeInTheDocument()
  })

  it('critical priority badge has red styling class', () => {
    renderPanel()
    const badge = screen.getByLabelText('Priority: Critical')
    expect(badge.className).toMatch(/red/)
  })

  it('shows empty state when no insights', () => {
    render(<MemoryRouter><AIInsightsPanel insights={[]} /></MemoryRouter>)
    expect(screen.getByText(/No insights generated yet/i)).toBeInTheDocument()
  })

  it('shows empty state when prop omitted', () => {
    render(<MemoryRouter><AIInsightsPanel /></MemoryRouter>)
    expect(screen.getByText(/No insights generated yet/i)).toBeInTheDocument()
  })

  it('links each insight title to its detail page', () => {
    renderPanel()
    const link = screen.getByRole('link', { name: 'Review Cycle Bottleneck' })
    expect(link).toHaveAttribute('href', '/insights/ins_1')
  })

  it('filters by status', () => {
    renderPanel()
    fireEvent.change(screen.getByLabelText('Filter by status'), { target: { value: 'resolved' } })
    expect(screen.getByText('Low Priority Note')).toBeInTheDocument()
    expect(screen.queryByText('Review Cycle Bottleneck')).not.toBeInTheDocument()
  })

  it('filters by priority', () => {
    renderPanel()
    fireEvent.change(screen.getByLabelText('Filter by priority'), { target: { value: 'critical' } })
    expect(screen.getByText('Security Alert')).toBeInTheDocument()
    expect(screen.queryByText('Review Cycle Bottleneck')).not.toBeInTheDocument()
  })

  it('filters by type', () => {
    renderPanel()
    fireEvent.change(screen.getByLabelText('Filter by type'), { target: { value: 'security' } })
    expect(screen.getByText('Security Alert')).toBeInTheDocument()
    expect(screen.queryByText('Review Cycle Bottleneck')).not.toBeInTheDocument()
  })

  it('shows a message when filters produce no matches', () => {
    renderPanel()
    fireEvent.change(screen.getByLabelText('Filter by type'), { target: { value: 'quality' } })
    expect(screen.getByText(/No insights match the current filters/i)).toBeInTheDocument()
  })

  it('does not render action buttons when onAction is omitted', () => {
    renderPanel()
    expect(screen.queryByText('Resolve')).not.toBeInTheDocument()
  })

  it('calls onAction with the insight id and action name', () => {
    const onAction = vi.fn()
    renderPanel({ onAction })
    const resolveButtons = screen.getAllByText('Resolve')
    fireEvent.click(resolveButtons[0])
    expect(onAction).toHaveBeenCalledWith('ins_1', 'resolve')
  })

  it('shows Reopen instead of Resolve/Snooze/Archive for resolved insights', () => {
    const onAction = vi.fn()
    renderPanel({ onAction })
    fireEvent.change(screen.getByLabelText('Filter by status'), { target: { value: 'resolved' } })
    expect(screen.getByText('Reopen')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Reopen'))
    expect(onAction).toHaveBeenCalledWith('ins_3', 'reopen')
  })
})
