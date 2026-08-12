import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ActivityFeed from './ActivityFeed.jsx'

const mockActivities = [
  {
    id: 'act_1',
    type: 'document_created',
    user: { id: 'u1', name: 'Alice Chen' },
    action: 'created a document',
    target: 'Market Analysis',
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(), // 5 min ago
  },
  {
    id: 'act_2',
    type: 'ai_analysis_run',
    user: { id: 'u2', name: 'Bob Ramirez' },
    action: 'ran AI analysis',
    target: 'Q3 Report',
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), // 2h ago
  },
]

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ActivityFeed', () => {
  it('renders section heading', () => {
    render(<ActivityFeed activities={mockActivities} />)
    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
  })

  it('renders all activity items', () => {
    render(<ActivityFeed activities={mockActivities} />)
    expect(screen.getByText('Alice Chen')).toBeInTheDocument()
    expect(screen.getByText('Bob Ramirez')).toBeInTheDocument()
    expect(screen.getByText('Market Analysis')).toBeInTheDocument()
    expect(screen.getByText('Q3 Report')).toBeInTheDocument()
  })

  it('shows action text for each item', () => {
    render(<ActivityFeed activities={mockActivities} />)
    expect(screen.getByText('created a document')).toBeInTheDocument()
    expect(screen.getByText('ran AI analysis')).toBeInTheDocument()
  })

  it('shows empty state when activities is empty array', () => {
    render(<ActivityFeed activities={[]} />)
    expect(screen.getByText(/No activity yet/i)).toBeInTheDocument()
  })

  it('shows empty state when activities prop is omitted', () => {
    render(<ActivityFeed />)
    expect(screen.getByText(/No activity yet/i)).toBeInTheDocument()
  })

  it('renders time elements with dateTime attribute', () => {
    const { container } = render(<ActivityFeed activities={mockActivities} />)
    const times = container.querySelectorAll('time')
    expect(times).toHaveLength(2)
    expect(times[0]).toHaveAttribute('dateTime')
  })

  it('shows relative time like "5m ago"', () => {
    render(<ActivityFeed activities={mockActivities} />)
    expect(screen.getByText('5m ago')).toBeInTheDocument()
  })
})
