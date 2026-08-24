'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useApplyTheme } from './ThemeToggle'
import { useAppStore, usePersistHydrated } from '@/lib/store'

/**
 * The dashboard frame: sidebar, top bar, and the one place where seed data gets
 * installed.
 *
 * Order matters here. `persist` reads localStorage asynchronously, so bootstrap
 * must not run until that finishes — otherwise it would see an empty paper list,
 * decide the app is brand new, and seed sample papers over the teacher's real
 * work.
 *
 * The two wrappers carry `print-shell` (`display: contents` when printing) so
 * that nothing between `<body>` and the sheets contributes a box: a flex row with
 * a fixed-width sidebar column left in the print flow shifts every sheet right
 * and can emit a blank trailing page.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  useApplyTheme()
  const ready = usePersistHydrated()
  const bootstrap = useAppStore((state) => state.bootstrap)
  const hydrated = useAppStore((state) => state.hydrated)
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (ready) bootstrap()
  }, [ready, bootstrap])

  // Close the drawer whenever the route changes.
  useEffect(() => setMobileOpen(false), [pathname])

  return (
    <div className="print-shell flex min-h-screen bg-ink-50 dark:bg-ink-950">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="print-shell flex min-w-0 flex-1 flex-col">
        <TopBar onOpenMobileMenu={() => setMobileOpen(true)} />
        <main className="print-root min-w-0 flex-1">
          {hydrated ? children : <ShellSkeleton />}
        </main>
      </div>
    </div>
  )
}

/**
 * Shown for the one or two frames before localStorage has been read.
 *
 * Rendering the real UI here would mean rendering it against default state and
 * then immediately replacing it, which produces a visible flicker on every
 * navigation and risks hydration mismatches in anything date-related.
 */
function ShellSkeleton() {
  return (
    <div className="no-print mx-auto max-w-7xl animate-pulse space-y-5 p-5 sm:p-8">
      <div className="h-8 w-64 rounded-lg bg-ink-200 dark:bg-ink-800" />
      <div className="h-4 w-96 rounded bg-ink-200/70 dark:bg-ink-800/70" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-ink-200/70 dark:bg-ink-800/70" />
        ))}
      </div>
      <div className="h-72 rounded-2xl bg-ink-200/70 dark:bg-ink-800/70" />
    </div>
  )
}
