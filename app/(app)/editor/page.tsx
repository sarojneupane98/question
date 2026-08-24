'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Maximize2, Minus, Plus } from 'lucide-react'

import { ExportBar } from '@/components/editor/ExportBar'
import { InstructionsEditor } from '@/components/editor/InstructionsEditor'
import { LayoutPanel } from '@/components/editor/LayoutPanel'
import { MarksMeter } from '@/components/editor/MarksMeter'
import { PaperMetaForm } from '@/components/editor/PaperMetaForm'
import { SectionList } from '@/components/editor/SectionList'
import { PaperPreview } from '@/components/preview/PaperPreview'
import { IconButton } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Primitives'
import { cn } from '@/lib/cn'
import { mmToPx } from '@/lib/geometry'
import { useAppStore, useCurrentPaper, useSettings } from '@/lib/store'
import { A4_WIDTH_MM } from '@/lib/types'

/**
 * The editor (spec §2–§6).
 *
 * Two panels: everything editable on the left, the live A4 paper on the right.
 * They are two scroll containers rather than one page-level scroll so that a long
 * question list never drags the paper out of view — the whole point of a live
 * preview is that it is still there when you look up.
 *
 * PRINT CONTRACT
 * --------------
 * Every wrapper between `<main>` and the sheets carries `print-shell`
 * (`display: contents` when printing) and the scroll container carries
 * `print-root`. Without that, the flex row and the `overflow: auto` box survive
 * into the print layout and the sheets come out shifted, scaled, or followed by a
 * blank page. The same classes also override the `hidden` used by the mobile
 * tabs, so printing works whichever tab happens to be showing.
 */

const ZOOM_MIN = 0.5
const ZOOM_MAX = 1.6
const ZOOM_STEP = 0.05

/* -------------------------------------------------------------------------- */
/*  Keyboard shortcuts                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z for the paper-level undo stack.
 *
 * The guards matter more than the handler. Tiptap keeps its own history, and a
 * plain text input has the browser's — undoing the whole paper because someone
 * wanted their last three characters back would be a genuinely destructive
 * surprise. So the shortcut steps aside whenever something closer to the cursor
 * has already dealt with the event.
 */
function useEditorShortcuts() {
  const undo = useAppStore((s) => s.undo)
  const redo = useAppStore((s) => s.redo)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return
      const key = event.key.toLowerCase()
      if (key !== 'z' && key !== 'y') return

      // ProseMirror's keymap calls preventDefault when it handles a key, so this
      // one check covers every mounted Tiptap editor.
      if (event.defaultPrevented) return

      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return

      event.preventDefault()
      if (key === 'y' || event.shiftKey) redo()
      else undo()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function EditorPage() {
  const paper = useCurrentPaper()
  const settings = useSettings()
  const ensurePaper = useAppStore((s) => s.ensurePaper)
  const updateSettings = useAppStore((s) => s.updateSettings)

  const [pageCount, setPageCount] = useState(0)
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEditorShortcuts()

  // Landing here from a bookmark — or after deleting the last paper — must still
  // give the teacher something to type into.
  useEffect(() => {
    ensurePaper()
  }, [ensurePaper])

  const setZoom = useCallback(
    (next: number) => {
      updateSettings({ previewZoom: Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next)) * 100) / 100 })
    },
    [updateSettings],
  )

  /** Scales the sheet to the width actually available, minus the padding. */
  const fitWidth = useCallback(() => {
    const box = scrollRef.current
    if (!box) return
    setZoom((box.clientWidth - 48) / mmToPx(A4_WIDTH_MM))
  }, [setZoom])

  const zoom = settings.previewZoom

  // `ensurePaper` runs in an effect, so the very first frame after a fresh
  // install has no paper yet.
  if (!paper) return null

  return (
    <div className="print-shell flex h-[calc(100vh-4rem)] min-w-0">
      {/* ---------------------------------------------------------- editor */}
      <div
        className={cn(
          'no-print min-w-0 flex-1 overflow-y-auto scroll-slim',
          tab === 'preview' && 'hidden lg:block',
        )}
      >
        <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
          {/* Mobile only: the preview cannot sit beside the editor on a phone. */}
          <Segmented
            className="lg:hidden"
            size="sm"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'edit', label: 'Edit' },
              { value: 'preview', label: 'Preview' },
            ]}
          />

          <PaperMetaForm />
          <InstructionsEditor />
          <MarksMeter />
          <SectionList />
          <LayoutPanel />

          <p className="pb-6 pt-2 text-center text-[11px] text-ink-400">
            Every change is saved to this browser as you type.
          </p>
        </div>
      </div>

      {/* --------------------------------------------------------- preview */}
      <div
        className={cn(
          'print-shell flex w-full min-w-0 flex-col border-ink-200 bg-ink-100 lg:w-[calc(50%-1rem)] lg:max-w-[52rem] lg:border-l xl:w-[46%] dark:border-ink-800 dark:bg-ink-950',
          tab === 'edit' && 'hidden lg:flex',
        )}
      >
        <div className="no-print flex flex-none flex-wrap items-center gap-2 border-b border-ink-200 bg-white px-3 py-2 dark:border-ink-800 dark:bg-ink-900">
          <Segmented
            className="lg:hidden"
            size="sm"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'edit', label: 'Edit' },
              { value: 'preview', label: 'Preview' },
            ]}
          />

          <div className="flex flex-none items-center gap-0.5">
            <IconButton
              label="Zoom out"
              disabled={zoom <= ZOOM_MIN}
              onClick={() => setZoom(zoom - ZOOM_STEP)}
            >
              <Minus className="h-3.5 w-3.5" />
            </IconButton>
            <button
              type="button"
              onClick={() => setZoom(1)}
              title="Reset to 100%"
              className="w-12 rounded-md py-1 text-xs font-semibold tabular-nums text-ink-600 transition-colors hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
            >
              {Math.round(zoom * 100)}%
            </button>
            <IconButton
              label="Zoom in"
              disabled={zoom >= ZOOM_MAX}
              onClick={() => setZoom(zoom + ZOOM_STEP)}
            >
              <Plus className="h-3.5 w-3.5" />
            </IconButton>
            <IconButton label="Fit to width" onClick={fitWidth}>
              <Maximize2 className="h-3.5 w-3.5" />
            </IconButton>
          </div>

          <ExportBar pageCount={pageCount} className="ml-auto" />
        </div>

        <div ref={scrollRef} className="print-root min-w-0 flex-1 overflow-auto scroll-slim p-4 sm:p-6">
          <PaperPreview paper={paper} zoom={zoom} onPageCountChange={setPageCount} />
        </div>
      </div>
    </div>
  )
}
