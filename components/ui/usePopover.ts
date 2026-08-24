'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Open/close state for a small anchored popover, with the two dismissals people
 * expect: a click anywhere outside, and Escape.
 *
 * Listeners are attached only while the popover is open — a dozen collapsed
 * popovers on a long paper would otherwise all be watching every document click.
 */
export function usePopover<T extends HTMLElement = HTMLDivElement>() {
  const [open, setOpen] = useState(false)
  const ref = useRef<T | null>(null)

  useEffect(() => {
    if (!open) return

    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as globalThis.Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return { open, setOpen, ref }
}
