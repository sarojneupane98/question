'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookMarked,
  FileStack,
  FileText,
  LayoutDashboard,
  LayoutTemplate,
  PenLine,
  Settings,
  X,
} from 'lucide-react'

import { cn } from '@/lib/cn'
import { useAppStore, useSettings } from '@/lib/store'

export interface NavItem {
  href: string
  label: string
  Icon: React.ComponentType<{ className?: string }>
  /** Shown as a small count chip. */
  countKey?: 'papers' | 'bank'
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/editor', label: 'Create Question Paper', Icon: PenLine },
  { href: '/papers', label: 'My Question Papers', Icon: FileStack, countKey: 'papers' },
  { href: '/bank', label: 'Question Bank', Icon: BookMarked, countKey: 'bank' },
  { href: '/templates', label: 'Templates', Icon: LayoutTemplate },
  { href: '/settings', label: 'Settings', Icon: Settings },
]

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'T'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Sidebar({
  mobileOpen,
  onCloseMobile,
}: {
  mobileOpen: boolean
  onCloseMobile: () => void
}) {
  const pathname = usePathname()
  const settings = useSettings()
  const paperCount = useAppStore((state) => state.papers.length)
  const bankCount = useAppStore((state) => state.bank.length)
  const counts = { papers: paperCount, bank: bankCount }

  const body = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 flex-none items-center justify-between gap-2 px-4">
        <Link href="/" className="flex items-center gap-2.5" onClick={onCloseMobile}>
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <FileText className="h-5 w-5" />
          </span>
          <span className="text-sm font-bold leading-tight text-ink-900 dark:text-white">
            Question Paper
            <span className="block text-[11px] font-medium text-ink-400 dark:text-ink-500">Generator</span>
          </span>
        </Link>
        <button
          type="button"
          aria-label="Close menu"
          onClick={onCloseMobile}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 lg:hidden dark:hover:bg-ink-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto scroll-slim px-3 py-2">
        {NAV_ITEMS.map(({ href, label, Icon, countKey }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          const count = countKey ? counts[countKey] : null
          return (
            <Link
              key={href}
              href={href}
              onClick={onCloseMobile}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/70 dark:text-brand-200'
                  : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-white',
              )}
            >
              <Icon
                className={cn(
                  'h-4.5 w-4.5 flex-none',
                  active ? 'text-brand-600 dark:text-brand-300' : 'text-ink-400 group-hover:text-ink-600 dark:group-hover:text-ink-200',
                )}
              />
              <span className="flex-1 truncate">{label}</span>
              {count !== null && count > 0 ? (
                <span
                  className={cn(
                    'rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                    active
                      ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-200'
                      : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400',
                  )}
                >
                  {count}
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      {/* ------------------------------------------------ user profile area */}
      <div className="flex-none border-t border-ink-200 p-3 dark:border-ink-700">
        <Link
          href="/settings"
          onClick={onCloseMobile}
          className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-ink-100 dark:hover:bg-ink-800"
        >
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
            {initials(settings.teacherName)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink-800 dark:text-ink-100">
              {settings.teacherName.trim() || 'Add your name'}
            </span>
            <span className="block truncate text-[11px] text-ink-400 dark:text-ink-500">
              {settings.teacherEmail.trim() || settings.schoolPreset.name.trim() || 'Teacher'}
            </span>
          </span>
          <Settings className="h-4 w-4 flex-none text-ink-400" />
        </Link>
      </div>
    </div>
  )

  return (
    <>
      {/* desktop rail */}
      <aside className="no-print hidden w-64 flex-none border-r border-ink-200 bg-white lg:block dark:border-ink-800 dark:bg-ink-900">
        {body}
      </aside>

      {/* mobile drawer */}
      <div
        className={cn(
          'no-print fixed inset-0 z-50 lg:hidden',
          mobileOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!mobileOpen}
      >
        <div
          className={cn(
            'absolute inset-0 bg-ink-950/50 transition-opacity',
            mobileOpen ? 'opacity-100' : 'opacity-0',
          )}
          onClick={onCloseMobile}
        />
        <aside
          className={cn(
            'absolute inset-y-0 left-0 w-72 border-r border-ink-200 bg-white transition-transform duration-200 dark:border-ink-800 dark:bg-ink-900',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {body}
        </aside>
      </div>
    </>
  )
}
