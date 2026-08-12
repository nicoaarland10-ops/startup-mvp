import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AIInsightsPanel from './AIInsightsPanel.jsx'

const mockInsights = [
  {
    id: 'ins_1',
    title: 'Review Cycle Bottleneck',
    description: 'PR review latency increased 38% this week.',
    type: 'collaboration',
    priority: 'high',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ins_2',
    title: 'Security Alert',
    description: 'Seven new jailbreak vectors logged.',
    type: 'security',
    priority: 'critical',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ins_3',
    title: 'Low Priority Note',
    description: 'Minor optimization opportunity.',
    type: 'productivity',
    priority: 'low',
    createdAt: new Date().toISOString(),
  },
]

describe('AIInsightsPanel', () => {
  it('renders section heading', () => {
    render(<AIInsightsPanel insights={mockInsights} />)
    expect(screen.getByText('AI Insights')).toBeInTheDocument()
  })

  it('renders all insight titles', () => {
    render(<AIInsightsPanel insights={mockInsights} />)
    expect(screen.getByText('Review Cycle Bottleneck')).toBeInTheDocument()
    expect(screen.getByText('Security Alert')).toBeInTheDocument()
    expect(screen.getByText('Low Priority Note')).toBeInTheDocument()
  })

  it('renders descriptions', () => {
    render(<AIInsightsPanel insights={mockInsights} />)
    expect(screen.getByText('PR review latency increased 38% this week.')).toBeInTheDocument()
  })

  it('shows priority badges', () => {
    render(<AIInsightsPanel insights={mockInsights} />)
    expect(screen.getByLabelText('Priority: High')).toBeInTheDocument()
    expect(screen.getByLabelText('Priority: Critical')).toBeInTheDocument()
    expect(screen.getByLabelText('Priority: Low')).toBeInTheDocument()
  })

  it('shows "View All" link', () => {
    render(<AIInsightsPanel insights={mockInsights} />)
    expect(screen.getByText(/View All/i)).toBeInTheDocument()
  })

  it('shows empty state when no insights', () => {
    render(<AIInsightsPanel insights={[]} />)
    expect(screen.getByText(/No insights generated yet/i)).toBeInTheDocument()
  })

  it('shows empty state when prop omitted', () => {
    render(<AIInsightsPanel />)
    expect(screen.getByText(/No insights generated yet/i)).toBeInTheDocument()
  })

  it('critical priority badge has red styling class', () => {
    render(<AIInsightsPanel insights={mockInsights} />)
    const badge = screen.getByLabelText('Priority: Critical')
    expect(badge.className).toMatch(/red/)
  })
})
