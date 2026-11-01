'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Shield,
  LayoutDashboard,
  FileText,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: '/',          label: 'Dashboard', icon: LayoutDashboard },
  { href: '/contracts', label: 'Contracts', icon: FileText        },
  { href: '/reports',   label: 'Reports',   icon: BarChart2       },
  { href: '/settings',  label: 'Settings',  icon: Settings        },
] as const

// ─── Props ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  isCollapsed:      boolean
  isMobileOpen:     boolean
  onToggleCollapse: () => void
  onCloseMobile:    () => void
}

// ─── Shared nav list ──────────────────────────────────────────────────────────

function NavList({
  collapsed,
  onItemClick,
}: {
  collapsed: boolean
  onItemClick?: () => void
}) {
  const pathname = usePathname()

  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto py-4 px-2">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href
        return (
          <Link
            key={href}
            href={href}
            onClick={onItemClick}
            title={collapsed ? label : undefined}
            aria-current={isActive ? 'page' : undefined}
            className={[
              'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
              collapsed ? 'justify-center' : '',
              isActive
                ? 'border border-indigo-500/20 bg-indigo-500/10 text-indigo-300'
                : 'border border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-white',
            ].join(' ')}
          >
            <Icon
              size={18}
              aria-hidden="true"
              className={[
                'flex-shrink-0 transition-colors',
                isActive ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300',
              ].join(' ')}
            />
            {!collapsed && <span>{label}</span>}
          </Link>
        )
      })}
    </nav>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Sidebar({
  isCollapsed,
  isMobileOpen,
  onToggleCollapse,
  onCloseMobile,
}: SidebarProps) {
  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────────── */}
      <aside
        className={[
          'hidden lg:flex flex-col flex-shrink-0',
          'border-r border-white/[0.06] bg-zinc-900',
          'transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-[72px]' : 'w-64',
        ].join(' ')}
      >
        {/* Logo */}
        <div
          className={[
            'flex h-16 flex-shrink-0 items-center border-b border-white/[0.06] px-4',
            isCollapsed ? 'justify-center' : 'gap-3',
          ].join(' ')}
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600 shadow-lg shadow-indigo-600/20">
            <Shield size={16} className="text-white" aria-hidden="true" />
          </div>
          {!isCollapsed && (
            <span className="truncate text-sm font-semibold text-white">
              ContractGuard AI
            </span>
          )}
        </div>

        <NavList collapsed={isCollapsed} />

        {/* Collapse toggle */}
        <div className="border-t border-white/[0.06] p-3">
          <button
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={[
              'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-500',
              'transition-colors hover:bg-white/[0.04] hover:text-zinc-300',
              isCollapsed ? 'justify-center' : '',
            ].join(' ')}
          >
            {isCollapsed ? <ChevronRight size={16} /> : (
              <>
                <ChevronLeft size={16} />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ── Mobile drawer ───────────────────────────────────────────────────── */}
      <aside
        aria-label="Navigation drawer"
        className={[
          'fixed inset-y-0 left-0 z-30 flex w-64 flex-col',
          'border-r border-white/[0.06] bg-zinc-900',
          'transition-transform duration-300 ease-in-out lg:hidden',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Logo + close */}
        <div className="flex h-14 items-center justify-between border-b border-white/[0.06] px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shadow-lg shadow-indigo-600/20">
              <Shield size={16} className="text-white" aria-hidden="true" />
            </div>
            <span className="text-sm font-semibold text-white">ContractGuard AI</span>
          </div>
          <button
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <NavList collapsed={false} onItemClick={onCloseMobile} />
      </aside>
    </>
  )
}

