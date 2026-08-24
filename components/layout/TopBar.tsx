'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Plus, Redo2, Undo2 } from 'lucide-react'

import { NAV_ITEMS } from './Sidebar'
import { ThemeToggle } from './ThemeToggle'
import { IconButton } from '@/components/ui/Button'
import { relativeTime } from '@/lib/ids'
import { useAppStore, useCurrentPaper } from '@/lib/store'

/**
 * "New paper" affordance.
 *
 * It has to both create a paper in the store and navigate to the editor, so it
 * is a Link with a click handler rather than a Button — that keeps middle-click,
 * ctrl-click and keyboard activation behaving like a real link.
 */
function NewPaperButton() {
  const newPaper = useAppStore((state) => state.newPaper)
  return (
    <Link
      href="/editor"
      onClick={() => newPaper(null)}
      className="inline-flex h-9 flex-none items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
    >
      <Plus className="h-4 w-4" />
      <span className="hidden sm:inline">New paper</span>
    </Link>
  )
}

export function TopBar({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const pathname = usePathname()
  const paper = useCurrentPaper()
  const undo = useAppStore((state) => state.undo)
  const redo = useAppStore((state) => state.redo)
  const pastCount = useAppStore((state) => state.past.length)
  const futureCount = useAppStore((state) => state.future.length)

  const active = NAV_ITEMS.find(
    (item) => pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)),
  )
  const onEditor = pathname.startsWith('/editor')

  return (
    <header className="no-print sticky top-0 z-30 flex h-16 flex-none items-center gap-3 border-b border-ink-200 bg-white/90 px-4 backdrop-blur-md sm:px-6 dark:border-ink-800 dark:bg-ink-900/90">
      <button
        type="button"
        aria-label="Open menu"
        onClick={onOpenMobileMenu}
        className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg text-ink-600 hover:bg-ink-100 lg:hidden dark:text-ink-300 dark:hover:bg-ink-800"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold text-ink-900 dark:text-white">
          {onEditor && paper ? paper.name : (active?.label ?? 'Dashboard')}
        </h1>
        {onEditor && paper ? (
          <p className="truncate text-[11px] text-ink-400 dark:text-ink-500">
            {[paper.exam.className, paper.exam.subject].filter(Boolean).join(' • ') || 'Untitled'}
            <span className="mx-1.5">·</span>
            Saved {relativeTime(paper.updatedAt)}
          </p>
        ) : null}
      </div>

      {onEditor ? (
        <div className="flex flex-none items-center gap-1">
          <IconButton label="Undo (Ctrl+Z)" onClick={undo} disabled={pastCount === 0}>
            <Undo2 className="h-4 w-4" />
          </IconButton>
          <IconButton label="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={futureCount === 0}>
            <Redo2 className="h-4 w-4" />
          </IconButton>
        </div>
      ) : null}

      <ThemeToggle compact className="hidden flex-none sm:inline-flex" />

      {onEditor ? null : <NewPaperButton />}
    </header>
  )
}
