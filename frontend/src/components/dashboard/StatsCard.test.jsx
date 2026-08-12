import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatsCard from './StatsCard.jsx'

describe('StatsCard', () => {
  it('renders title and value', () => {
    render(<StatsCard title="Total Projects" value={42} />)
    expect(screen.getByText('Total Projects')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('renders icon with aria-label', () => {
    render(<StatsCard title="AI Insights" value={100} icon="🧠" />)
    expect(screen.getByLabelText('AI Insights')).toBeInTheDocument()
  })

  it('shows positive trend with up arrow', () => {
    render(<StatsCard title="Projects" value={10} change={15} />)
    expect(screen.getByLabelText('up 15%')).toBeInTheDocument()
  })

  it('shows negative trend with down arrow', () => {
    render(<StatsCard title="Tasks" value={5} change={-7} />)
    expect(screen.getByLabelText('down 7%')).toBeInTheDocument()
  })

  it('does not show trend when change is undefined', () => {
    render(<StatsCard title="Projects" value={10} />)
    expect(screen.queryByLabelText(/up|down/)).not.toBeInTheDocument()
  })

  it('formats large numbers with locale separators', () => {
    render(<StatsCard title="Users" value={1234567} />)
    // toLocaleString produces locale-specific separator, just check it renders
    expect(screen.getByText(/1.234.567|1,234,567/)).toBeInTheDocument()
  })

  it('renders with zero change (positive)', () => {
    render(<StatsCard title="Zero" value={5} change={0} />)
    expect(screen.getByLabelText('up 0%')).toBeInTheDocument()
  })
})
