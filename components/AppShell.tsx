'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'

interface AppShellProps {
  children: React.ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      {/* ── Mobile backdrop ─────────────────────────────────────────────────── */}
      {isMobileOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <Sidebar
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        onToggleCollapse={() => setIsCollapsed((c) => !c)}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* ── Right panel ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="flex h-14 items-center gap-3 border-b border-white/5 bg-zinc-900 px-4 lg:hidden">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-semibold text-white">ContractGuard AI</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

