'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'

import { cn } from '@/lib/cn'
import { onStorageError } from '@/lib/storage'
import { onDismissToast, onToast, toast, type ToastMessage, type ToastTone } from '@/lib/toast'

const ICONS: Record<ToastTone, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const TONES: Record<ToastTone, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100',
  error: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100',
  warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100',
  info: 'border-ink-200 bg-white text-ink-900 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100',
}

const ICON_TONES: Record<ToastTone, string> = {
  success: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-rose-600 dark:text-rose-400',
  warning: 'text-amber-600 dark:text-amber-400',
  info: 'text-brand-600 dark:text-brand-400',
}

/**
 * Renders the app-wide toast stack and forwards `lib/storage` failures into it.
 *
 * A silently failed save is the worst possible outcome for a teacher who has
 * just typed forty questions, so quota errors are shown as a sticky message
 * with an actionable explanation rather than a console warning.
 */
export function StorageErrorToast() {
  const [mounted, setMounted] = useState(false)
  const [items, setItems] = useState<ToastMessage[]>([])

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const off = onToast((message) => {
      setItems((current) => [...current.slice(-4), message])
      if (message.duration > 0) {
        window.setTimeout(() => {
          setItems((current) => current.filter((item) => item.id !== message.id))
        }, message.duration)
      }
    })
    const offDismiss = onDismissToast((id) => {
      setItems((current) => current.filter((item) => item.id !== id))
    })
    return () => {
      off()
      offDismiss()
    }
  }, [])

  useEffect(
    () =>
      onStorageError((error) => {
        if (error.kind === 'quota') {
          toast.error('This browser is out of storage', error.message)
        } else if (error.kind === 'unavailable') {
          toast.warning('Saving is unavailable', error.message)
        } else {
          toast.error('Could not save', error.message)
        }
      }),
    [],
  )

  if (!mounted || items.length === 0) return null

  return createPortal(
    <div className="no-print pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
      {items.map((item) => {
        const Icon = ICONS[item.tone]
        return (
          <div
            key={item.id}
            role="status"
            className={cn(
              'pointer-events-auto flex animate-slide-up items-start gap-3 rounded-xl border px-3.5 py-3 shadow-lift',
              TONES[item.tone],
            )}
          >
            <Icon className={cn('mt-0.5 h-4 w-4 flex-none', ICON_TONES[item.tone])} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug">{item.title}</p>
              {item.detail ? (
                <p className="mt-0.5 text-xs leading-relaxed opacity-80">{item.detail}</p>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}
              className="-mr-1 -mt-1 rounded p-1 opacity-50 transition-opacity hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>,
    document.body,
  )
}
