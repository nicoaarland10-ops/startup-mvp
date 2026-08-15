import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { SidebarContext } from './SidebarContext.js'
import Sidebar from './Sidebar.jsx'
import MobileMenuButton from './MobileMenuButton.jsx'

export default function AppShell() {
  const [open, setOpen] = useState(false)
  const value = {
    open,
    toggle: () => setOpen((prev) => !prev),
    close: () => setOpen(false),
  }

  return (
    <SidebarContext.Provider value={value}>
      <div className="min-h-screen lg:flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block lg:w-64 lg:shrink-0 lg:border-r lg:border-gray-100">
          <div className="lg:fixed lg:h-screen lg:w-64">
            <Sidebar />
          </div>
        </aside>

        {/* Mobile drawer */}
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-gray-900/40"
              aria-hidden="true"
              onClick={value.close}
            />
            <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-xl">
              <Sidebar onNavigate={value.close} />
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Mobile top bar — the only way to reach nav below the lg breakpoint */}
          <div className="lg:hidden sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-2">
            <MobileMenuButton />
            <span className="text-sm font-semibold text-gray-900">AI Collab Platform</span>
          </div>
          <Outlet />
        </div>
      </div>
    </SidebarContext.Provider>
  )
}
