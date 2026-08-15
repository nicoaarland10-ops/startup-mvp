import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Settings from './Settings.jsx'

describe('Settings', () => {
  it('renders the integrations list, all not connected', () => {
    render(<Settings />)
    expect(screen.getByText('GitHub')).toBeInTheDocument()
    expect(screen.getByText('Jira')).toBeInTheDocument()
    expect(screen.getByText('Slack')).toBeInTheDocument()
    expect(screen.getByText('Model APIs')).toBeInTheDocument()
    expect(screen.getAllByText('Not connected')).toHaveLength(4)
  })

  it('disables every Connect button', () => {
    render(<Settings />)
    for (const button of screen.getAllByText('Connect')) {
      expect(button).toBeDisabled()
    }
  })

  it('discloses that the dashboard runs on demo data', () => {
    render(<Settings />)
    expect(screen.getByText(/Running on demo data/i)).toBeInTheDocument()
  })
})
