'use client'

import { useEffect } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'

import { cn } from '@/lib/cn'
import { useAppStore, usePersistHydrated, useSettings } from '@/lib/store'
import type { ThemeMode } from '@/lib/types'

/**
 * Applies `settings.theme` to <html> and keeps it in step with the OS when the
 * teacher has chosen "System".
 *
 * The initial class is set by `ThemeScript` before paint, so this effect waits
 * for localStorage to be read back before touching anything — otherwise the
 * default `system` value would briefly overwrite a saved `dark` preference and
 * the page would flash. Note that the paper preview is unaffected either way:
 * see the `.paper-sheet` rules in `app/globals.css`.
 */
export function useApplyTheme() {
  const theme = useSettings().theme
  const ready = usePersistHydrated()

  useEffect(() => {
    if (!ready) return
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      root.classList.toggle('dark', dark)
      root.style.colorScheme = dark ? 'dark' : 'light'
    }

    apply()
    if (theme !== 'system') return
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme, ready])
}

const OPTIONS: Array<{ value: ThemeMode; label: string; Icon: React.ComponentType<{ className?: string }> }> = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
]

export function ThemeToggle({ className, compact = false }: { className?: string; compact?: boolean }) {
  const theme = useSettings().theme
  const setTheme = useAppStore((state) => state.setTheme)

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn('inline-flex rounded-lg bg-ink-100 p-0.5 dark:bg-ink-800', className)}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              'flex items-center gap-1.5 rounded-[0.4rem] px-2 py-1.5 text-xs font-medium transition-colors',
              active
                ? 'bg-white text-ink-900 shadow-sm dark:bg-ink-600 dark:text-white'
                : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {compact ? null : label}
          </button>
        )
      })}
    </div>
  )
}
