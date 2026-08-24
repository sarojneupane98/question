'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import Table from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'

import { RichTextToolbar, type ToolbarMode } from './RichTextToolbar'
import { cn } from '@/lib/cn'

/**
 * ============================================================================
 *  Rich text editor
 * ============================================================================
 *  One Tiptap instance, used for question stems, MCQ options, matching cells and
 *  section notes. Everything the toolbar can produce is in `RICH_TEXT_TAGS`
 *  (`lib/types.ts`) and is handled by `lib/export/htmlToDocx.ts`, so anything a
 *  teacher types survives into Word.
 *
 *  THREE THINGS HERE ARE LOAD-BEARING
 *  ----------------------------------
 *  1. WRITES ARE DEBOUNCED. Every store write pushes an undo entry, so sending
 *     one per keystroke would make Ctrl+Z undo a single letter and would blow
 *     through the 50-step history in one sentence. Changes are batched on a
 *     ~350 ms idle timer and flushed on blur and on unmount, which makes an undo
 *     step roughly "a phrase" — the granularity a word processor gives you.
 *
 *  2. THE EDITOR IS NOT THE SOURCE OF TRUTH. The store is. When `value` changes
 *     from the outside (undo, redo, loading another paper, inserting from the
 *     bank) the document is replaced — but only when it genuinely differs, or
 *     every keystroke would reset the cursor to the start of the line.
 *
 *  3. NO SSR. Tiptap needs a DOM to build its schema, and the App Router renders
 *     components on the server first. The editor is therefore created only after
 *     mount, with a static preview rendered in its place so the layout does not
 *     jump.
 */

const DEBOUNCE_MS = 350

/**
 * Tiptap serialises an empty document as `<p></p>`. The data model stores empty
 * rich text as `''` (that is what `isHtmlEmpty` and the block flattener expect),
 * so the two representations are folded together here.
 */
function normalizeHtml(html: string): string {
  const trimmed = (html ?? '').trim()
  if (!trimmed) return ''
  if (/^<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>$/i.test(trimmed)) return ''
  return trimmed
}

export interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  /**
   * `block` is a multi-paragraph question stem. `inline` is a one-line field
   * (an MCQ option, a matching cell) where Enter must not start a paragraph.
   */
  variant?: 'block' | 'inline'
  toolbar?: ToolbarMode
  /** Tailwind min-height for the writing area. */
  minHeightClass?: string
  className?: string
  autoFocus?: boolean
  ariaLabel?: string
  onFocus?: () => void
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Type here…',
  variant = 'block',
  toolbar = 'full',
  minHeightClass,
  className,
  autoFocus = false,
  ariaLabel,
  onFocus,
}: RichTextEditorProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  /* ---- debounced write-back -------------------------------------------- */

  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const timerRef = useRef<number | null>(null)
  const pendingRef = useRef<string | null>(null)

  const flush = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const pending = pendingRef.current
    pendingRef.current = null
    if (pending !== null) onChangeRef.current(pending)
  }, [])

  const schedule = useCallback(
    (html: string) => {
      pendingRef.current = normalizeHtml(html)
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(flush, DEBOUNCE_MS)
    },
    [flush],
  )

  // A pending edit must not be lost when the card collapses or the question is
  // deselected, both of which unmount this component.
  useEffect(() => () => flush(), [flush])

  /* ---- the editor ------------------------------------------------------ */

  const inline = variant === 'inline'

  const editor = useEditor(
    {
      // The App Router renders this on the server; Tiptap must not run there.
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          // A question paper has no headings, block quotes or thematic breaks,
          // and every node offered here has to be translatable into DOCX.
          heading: false,
          blockquote: false,
          horizontalRule: false,
          // Per-editor undo is fine and feels natural inside a text box; the
          // store's own history covers structural edits.
          history: { depth: 60 },
        }),
        Underline,
        Superscript,
        Subscript,
        TextAlign.configure({ types: ['paragraph'] }),
        Image.configure({ inline: false, allowBase64: true }),
        Table.configure({ resizable: false }),
        TableRow,
        TableHeader,
        TableCell,
        Placeholder.configure({ placeholder }),
      ],
      content: value || '',
      editorProps: {
        attributes: {
          class: cn('rich-content focus:outline-none', minHeightClass ?? (inline ? 'min-h-[1.5rem]' : 'min-h-[4.5rem]')),
          ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
        },
        handleKeyDown: (_view, event) => {
          // In a one-line field Enter would create a second paragraph that the
          // preview has nowhere to put. Shift+Enter still inserts a line break.
          if (inline && event.key === 'Enter' && !event.shiftKey) return true
          return false
        },
      },
      onUpdate: ({ editor: instance }) => schedule(instance.getHTML()),
      onBlur: () => flush(),
      autofocus: autoFocus ? 'end' : false,
    },
    // Created once. Prop changes are handled by the effects below, because
    // re-creating the editor would destroy the selection and the undo stack.
    [],
  )

  /* ---- outside-in synchronisation -------------------------------------- */

  useEffect(() => {
    if (!editor) return
    // Our own un-flushed keystrokes are not an outside change.
    if (pendingRef.current !== null) return
    if (normalizeHtml(editor.getHTML()) === normalizeHtml(value)) return
    editor.commands.setContent(value || '', false)
  }, [editor, value])

  useEffect(() => {
    if (!editor) return
    const placeholderExtension = editor.extensionManager.extensions.find(
      (extension) => extension.name === 'placeholder',
    )
    if (placeholderExtension && placeholderExtension.options.placeholder !== placeholder) {
      placeholderExtension.options.placeholder = placeholder
      editor.view.dispatch(editor.state.tr)
    }
  }, [editor, placeholder])

  /* ---- render ---------------------------------------------------------- */

  const frame = cn(
    'tiptap-surface rounded-lg border border-ink-300 bg-white transition-shadow dark:border-ink-600 dark:bg-ink-800',
    'focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/25',
    className,
  )

  if (!mounted || !editor) {
    return (
      <div className={frame} aria-busy>
        {toolbar === 'none' ? null : (
          <div className="h-9 rounded-t-lg border-b border-ink-200 bg-ink-50 dark:border-ink-700 dark:bg-ink-900/60" />
        )}
        <div
          className={cn(
            'rich-content px-3 py-2 text-sm text-ink-400 dark:text-ink-500',
            minHeightClass ?? (inline ? 'min-h-[1.5rem]' : 'min-h-[4.5rem]'),
          )}
          // Shows the existing content while Tiptap boots so the card does not
          // flash empty. Sanitised on the way into the store, never editable.
          dangerouslySetInnerHTML={{ __html: value || '' }}
        />
      </div>
    )
  }

  return (
    <div className={frame} onFocus={onFocus}>
      {toolbar === 'none' ? null : <RichTextToolbar editor={editor} mode={toolbar} />}
      <EditorContent editor={editor} className="px-3 py-2 text-sm text-ink-900 dark:text-ink-100" />
    </div>
  )
}

export type { Editor }
