'use client'

/**
 * A deliberately tiny toast bus.
 *
 * Exports and storage failures happen outside React (inside async exporter
 * functions), so they need a way to surface a message without threading a
 * setState down through every call site.
 */

export type ToastTone = 'success' | 'error' | 'info' | 'warning'

export interface ToastMessage {
  id: number
  tone: ToastTone
  title: string
  detail?: string
  /** ms; 0 keeps it until dismissed. */
  duration: number
}

type Listener = (toast: ToastMessage) => void

const listeners = new Set<Listener>()
let counter = 0

function push(tone: ToastTone, title: string, detail?: string, duration = 4200) {
  counter += 1
  const message: ToastMessage = { id: counter, tone, title, detail, duration }
  listeners.forEach((listener) => listener(message))
  return message.id
}

export const toast = {
  success: (title: string, detail?: string) => push('success', title, detail),
  error: (title: string, detail?: string) => push('error', title, detail, 8000),
  info: (title: string, detail?: string) => push('info', title, detail),
  warning: (title: string, detail?: string) => push('warning', title, detail, 6000),
  /** Sticky toast — caller dismisses it by id. */
  pending: (title: string, detail?: string) => push('info', title, detail, 0),
}

export function onToast(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const dismissListeners = new Set<(id: number) => void>()

export function dismissToast(id: number) {
  dismissListeners.forEach((listener) => listener(id))
}

export function onDismissToast(listener: (id: number) => void): () => void {
  dismissListeners.add(listener)
  return () => {
    dismissListeners.delete(listener)
  }
}
