'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, X } from 'lucide-react'

import { cn } from '@/lib/cn'
import { Button, IconButton, type ButtonVariant } from './Button'

/* -------------------------------------------------------------------------- */
/*  Modal                                                                      */
/* -------------------------------------------------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
}: {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}) {
  const [mounted, setMounted] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Move focus into the dialog so Tab is trapped in a sensible place.
    const raf = window.requestAnimationFrame(() => panelRef.current?.focus())
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      window.cancelAnimationFrame(raf)
    }
  }, [open, onClose])

  if (!mounted || !open) return null

  const widths: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-5xl',
  }

  return createPortal(
    <div className="no-print fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-6">
      <div
        className="fixed inset-0 bg-ink-950/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          'relative z-10 w-full animate-slide-up rounded-2xl border border-ink-200 bg-white shadow-sheet outline-none dark:border-ink-700 dark:bg-ink-900',
          widths[size],
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-200 px-5 py-4 dark:border-ink-700">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink-900 dark:text-white">{title}</h2>
            {description ? (
              <p className="mt-1 text-xs leading-relaxed text-ink-500 dark:text-ink-400">{description}</p>
            ) : null}
          </div>
          <IconButton label="Close" onClick={onClose} className="-mr-1.5 -mt-1">
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        <div className="max-h-[70vh] overflow-y-auto scroll-slim px-5 py-4">{children}</div>

        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-ink-200 px-5 py-3.5 dark:border-ink-700">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

/* -------------------------------------------------------------------------- */
/*  Confirm dialog                                                             */
/* -------------------------------------------------------------------------- */

export interface ConfirmRequest {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ButtonVariant
  onConfirm: () => void
}

/**
 * Imperative confirm dialog.
 *
 * Deletions are the only genuinely destructive action in the app, and the
 * teacher can switch the guard off in Settings — so the hook takes the setting
 * into account and simply runs the action when confirmation is disabled.
 */
export function useConfirm(enabled: boolean) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null)

  const confirm = useCallback(
    (next: ConfirmRequest) => {
      if (!enabled) {
        next.onConfirm()
        return
      }
      setRequest(next)
    },
    [enabled],
  )

  const dialog = (
    <Modal
      open={request !== null}
      onClose={() => setRequest(null)}
      title={request?.title ?? ''}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={() => setRequest(null)}>
            {request?.cancelLabel ?? 'Cancel'}
          </Button>
          <Button
            variant={request?.variant ?? 'danger'}
            onClick={() => {
              request?.onConfirm()
              setRequest(null)
            }}
          >
            {request?.confirmLabel ?? 'Delete'}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <p className="text-sm leading-relaxed text-ink-600 dark:text-ink-300">{request?.message}</p>
      </div>
    </Modal>
  )

  return { confirm, dialog }
}
