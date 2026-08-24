'use client'

import Link from 'next/link'
import { FileText, Menu } from 'lucide-react'
import { useState } from 'react'

import { ThemeToggle, useApplyTheme } from '@/components/layout/ThemeToggle'
import { cn } from '@/lib/cn'

const LINKS = [
  { href: '#features', label: 'Features' },
  { href: '/templates', label: 'Templates' },
  { href: '/bank', label: 'Question Bank' },
  { href: '/papers', label: 'My Papers' },
]

export function LandingHeader() {
  useApplyTheme()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/80 bg-white/85 backdrop-blur-md dark:border-ink-800 dark:bg-ink-950/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <FileText className="h-5 w-5" />
          </span>
          <span className="text-sm font-bold leading-tight text-ink-900 dark:text-white">
            Question Paper
            <span className="block text-[11px] font-medium text-ink-400 dark:text-ink-500">Generator</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle compact className="hidden sm:inline-flex" />
          <Link
            href="/editor"
            className="hidden h-9 items-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 sm:inline-flex"
          >
            Create Paper
          </Link>
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-600 hover:bg-ink-100 md:hidden dark:text-ink-300 dark:hover:bg-ink-800"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        className={cn(
          'overflow-hidden border-t border-ink-200 md:hidden dark:border-ink-800',
          open ? 'block' : 'hidden',
        )}
      >
        <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-3 sm:px-8">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
            >
              {link.label}
            </Link>
          ))}
          <div className="flex items-center justify-between gap-3 pt-2">
            <ThemeToggle />
            <Link
              href="/editor"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 items-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white"
            >
              Create Paper
            </Link>
          </div>
        </nav>
      </div>
    </header>
  )
}
