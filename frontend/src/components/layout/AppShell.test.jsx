import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import AppShell from './AppShell.jsx'

function renderShell(initialPath = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<div>Dashboard content</div>} />
          <Route path="/team" element={<div>Team content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AppShell', () => {
  it('renders the nav links and routed content', () => {
    renderShell()
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)
    expect(screen.getByText('Team')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Dashboard content')).toBeInTheDocument()
  })

  it('mobile drawer is closed by default', () => {
    renderShell()
    // Nav links exist once (desktop sidebar) when the drawer is closed
    expect(screen.getAllByLabelText('Main navigation')).toHaveLength(1)
  })

  it('opens the mobile drawer when the hamburger button is clicked', () => {
    renderShell()
    fireEvent.click(screen.getByLabelText('Open navigation menu'))
    // Drawer renders a second nav landmark alongside the desktop one
    expect(screen.getAllByLabelText('Main navigation')).toHaveLength(2)
  })

  it('closes the mobile drawer when a nav link is clicked', () => {
    renderShell()
    fireEvent.click(screen.getByLabelText('Open navigation menu'))
    const teamLinks = screen.getAllByText('Team')
    fireEvent.click(teamLinks[teamLinks.length - 1])
    expect(screen.getAllByLabelText('Main navigation')).toHaveLength(1)
  })
})
