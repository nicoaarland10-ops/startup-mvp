import { createContext, useContext } from 'react'

// Default no-op shape so components using useSidebar() render safely even
// when mounted outside <AppShell> (e.g. in unit tests for individual pages).
export const SidebarContext = createContext({
  open: false,
  toggle: () => {},
  close: () => {},
})

export function useSidebar() {
  return useContext(SidebarContext)
}
