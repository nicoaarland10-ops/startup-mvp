import { useSidebar } from './SidebarContext.js'

export default function MobileMenuButton() {
  const { toggle } = useSidebar()
  return (
    <button
      type="button"
      aria-label="Open navigation menu"
      onClick={toggle}
      className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  )
}
