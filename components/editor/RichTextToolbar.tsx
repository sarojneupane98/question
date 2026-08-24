'use client'

import { useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
  Code,
  Columns3,
  Eraser,
  Image as ImageIcon,
  Italic,
  List,
  ListOrdered,
  Rows3,
  Sigma,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table as TableIcon,
  Trash2,
  Underline as UnderlineIcon,
} from 'lucide-react'

import { cn } from '@/lib/cn'
import { usePopover } from '@/components/ui/usePopover'
import { QUESTION_IMAGE_LIMITS, ACCEPTED_IMAGE_TYPES, prepareImageFile } from '@/lib/imageUtils'
import { toast } from '@/lib/toast'

export type ToolbarMode = 'full' | 'mini' | 'none'

/* -------------------------------------------------------------------------- */
/*  Symbols and equation snippets                                             */
/* -------------------------------------------------------------------------- */

/**
 * WHY UNICODE INSTEAD OF A MATH ENGINE
 * ------------------------------------
 * KaTeX or MathML would render beautifully on screen and then be lost on the way
 * into Word — Word cannot read either, and the rasterised PDF would turn a
 * formula into pixels. Real Unicode characters plus real superscript/subscript
 * runs survive the whole chain: they are selectable in the PDF, editable in the
 * DOCX and searchable in both. It covers everything a school paper actually
 * needs (indices, roots, sums, ions, units) at the cost of not being able to set
 * a stacked fraction or a matrix.
 */
const SYMBOL_GROUPS: Array<{ label: string; symbols: string[] }> = [
  {
    label: 'Operators',
    symbols: ['+', '−', '×', '÷', '±', '∓', '=', '≠', '≈', '≡', '<', '>', '≤', '≥', '∝', '∞'],
  },
  {
    label: 'Maths',
    symbols: ['√', '∛', '∑', '∏', '∫', '∂', '∇', '∴', '∵', '∠', '⊥', '∥', '°', '′', '″', '%'],
  },
  {
    label: 'Greek',
    symbols: ['α', 'β', 'γ', 'δ', 'ε', 'θ', 'λ', 'μ', 'π', 'ρ', 'σ', 'τ', 'φ', 'ω', 'Δ', 'Ω'],
  },
  {
    label: 'Sets & logic',
    symbols: ['∈', '∉', '⊂', '⊆', '⊃', '∪', '∩', '∅', '∀', '∃', '¬', '∧', '∨', '⇒', '⇔', '∵'],
  },
  {
    label: 'Arrows',
    symbols: ['→', '←', '↑', '↓', '↔', '⇌', '⇒', '⇐', '↦', '⟶', '⇀', '↻'],
  },
  {
    label: 'Fractions',
    symbols: ['½', '⅓', '⅔', '¼', '¾', '⅕', '⅖', '⅗', '⅘', '⅙', '⅛', '⅜', '⅝', '⅞'],
  },
  {
    label: 'Marks & punctuation',
    symbols: ['✓', '✗', '★', '☆', '•', '‣', '–', '—', '…', '“', '”', '‘', '’', '§', '¶', '†'],
  },
  {
    label: 'Units & currency',
    symbols: ['₹', '$', '€', '£', '¥', '¢', '℃', '℉', 'Ω', 'µ', 'Å', 'ℓ', '㎏', '㎡', '㎥', '‰'],
  },
]

/** Inserted as HTML so the sup/sub marks come through as real marks. */
const EQUATION_SNIPPETS: Array<{ label: string; html: string; title: string }> = [
  { label: 'x²', html: 'x<sup>2</sup>', title: 'Square' },
  { label: 'x³', html: 'x<sup>3</sup>', title: 'Cube' },
  { label: 'xⁿ', html: 'x<sup>n</sup>', title: 'Power of n' },
  { label: 'x₁', html: 'x<sub>1</sub>', title: 'Subscript index' },
  { label: 'a⁄b', html: '<sup>a</sup>&frasl;<sub>b</sub>', title: 'Fraction' },
  { label: '√x', html: '√x&#773;', title: 'Square root' },
  { label: 'H₂O', html: 'H<sub>2</sub>O', title: 'Water' },
  { label: 'CO₂', html: 'CO<sub>2</sub>', title: 'Carbon dioxide' },
  { label: 'm/s²', html: 'm/s<sup>2</sup>', title: 'Acceleration' },
  { label: '∑ⁿᵢ₌₁', html: '∑<sub>i=1</sub><sup>n</sup>', title: 'Summation' },
]

/* -------------------------------------------------------------------------- */
/*  Small building blocks                                                     */
/* -------------------------------------------------------------------------- */

function ToolButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      // `onMouseDown` + preventDefault keeps the editor selection alive; a plain
      // click would blur the document first and the command would apply to
      // nothing.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        'inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-md px-1 text-ink-600 transition-colors',
        'hover:bg-ink-200/70 hover:text-ink-900 disabled:cursor-not-allowed disabled:opacity-40',
        'dark:text-ink-300 dark:hover:bg-ink-700 dark:hover:text-white',
        active && 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-100',
      )}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <span className="mx-0.5 h-5 w-px flex-none bg-ink-200 dark:bg-ink-700" aria-hidden />
}

/** Click-outside + Escape dismissal for the two popovers: `usePopover`. */

/* -------------------------------------------------------------------------- */
/*  Symbol / equation popover                                                 */
/* -------------------------------------------------------------------------- */

function SymbolPicker({ editor }: { editor: Editor }) {
  const { open, setOpen, ref } = usePopover()

  const insertText = (symbol: string) => {
    editor.chain().focus().insertContent(symbol).run()
  }
  const insertHtml = (html: string) => {
    editor.chain().focus().insertContent(html).run()
  }

  return (
    <div className="relative" ref={ref}>
      <ToolButton label="Symbols and equations" active={open} onClick={() => setOpen(!open)}>
        <Sigma className="h-3.5 w-3.5" />
      </ToolButton>

      {open ? (
        <div className="absolute left-0 top-8 z-40 w-[19rem] animate-slide-down rounded-xl border border-ink-200 bg-white p-3 shadow-lift dark:border-ink-700 dark:bg-ink-800">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
            Equations
          </p>
          <div className="mb-3 flex flex-wrap gap-1">
            {EQUATION_SNIPPETS.map((snippet) => (
              <button
                key={snippet.label}
                type="button"
                title={snippet.title}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => insertHtml(snippet.html)}
                className="rounded-md border border-ink-200 px-1.5 py-1 text-xs text-ink-700 hover:border-brand-400 hover:bg-brand-50 dark:border-ink-600 dark:text-ink-200 dark:hover:bg-ink-700"
              >
                {snippet.label}
              </button>
            ))}
          </div>

          <div className="max-h-64 space-y-3 overflow-y-auto scroll-slim pr-1">
            {SYMBOL_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                  {group.label}
                </p>
                <div className="grid grid-cols-8 gap-1">
                  {group.symbols.map((symbol, index) => (
                    <button
                      key={`${group.label}-${index}`}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => insertText(symbol)}
                      className="h-7 rounded-md text-sm text-ink-800 hover:bg-brand-50 hover:text-brand-700 dark:text-ink-100 dark:hover:bg-ink-700"
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Table popover                                                             */
/* -------------------------------------------------------------------------- */

function TableMenu({ editor }: { editor: Editor }) {
  const { open, setOpen, ref } = usePopover()
  const inTable = editor.isActive('table')

  const actions: Array<{ label: string; icon: React.ReactNode; run: () => void; danger?: boolean }> = [
    {
      label: 'Insert 3 × 3 table',
      icon: <TableIcon className="h-3.5 w-3.5" />,
      run: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
      label: 'Add row below',
      icon: <Rows3 className="h-3.5 w-3.5" />,
      run: () => editor.chain().focus().addRowAfter().run(),
    },
    {
      label: 'Add column right',
      icon: <Columns3 className="h-3.5 w-3.5" />,
      run: () => editor.chain().focus().addColumnAfter().run(),
    },
    {
      label: 'Delete row',
      icon: <Rows3 className="h-3.5 w-3.5" />,
      run: () => editor.chain().focus().deleteRow().run(),
    },
    {
      label: 'Delete column',
      icon: <Columns3 className="h-3.5 w-3.5" />,
      run: () => editor.chain().focus().deleteColumn().run(),
    },
    {
      label: 'Delete table',
      icon: <Trash2 className="h-3.5 w-3.5" />,
      run: () => editor.chain().focus().deleteTable().run(),
      danger: true,
    },
  ]

  return (
    <div className="relative" ref={ref}>
      <ToolButton label="Table" active={open || inTable} onClick={() => setOpen(!open)}>
        <TableIcon className="h-3.5 w-3.5" />
      </ToolButton>

      {open ? (
        <div className="absolute left-0 top-8 z-40 w-52 animate-slide-down overflow-hidden rounded-xl border border-ink-200 bg-white py-1 shadow-lift dark:border-ink-700 dark:bg-ink-800">
          {actions.map((action, index) => {
            // Everything except "insert" needs the cursor to be inside a table.
            const disabled = index > 0 && !inTable
            return (
              <button
                key={action.label}
                type="button"
                disabled={disabled}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  action.run()
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                  action.danger
                    ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950'
                    : 'text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-700',
                )}
              >
                {action.icon}
                {action.label}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Image button                                                              */
/* -------------------------------------------------------------------------- */

function ImageButton({ editor }: { editor: Editor }) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)

  const pick = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      // Downscaled and re-encoded before it ever reaches the document: a raw
      // phone photo would blow the localStorage quota and slow html2canvas to a
      // crawl.
      const src = await prepareImageFile(file, QUESTION_IMAGE_LIMITS)
      editor.chain().focus().setImage({ src, alt: file.name }).run()
    } catch {
      toast.error('That image could not be added', 'Try a PNG, JPEG or WebP file.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <>
      <ToolButton
        label="Insert image"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <ImageIcon className="h-3.5 w-3.5" />
      </ToolButton>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        className="hidden"
        onChange={(event) => void pick(event.target.files?.[0])}
      />
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Toolbar                                                                   */
/* -------------------------------------------------------------------------- */

export function RichTextToolbar({ editor, mode = 'full' }: { editor: Editor; mode?: ToolbarMode }) {
  if (mode === 'none') return null
  const full = mode === 'full'

  return (
    <div
      className="flex flex-wrap items-center gap-0.5 rounded-t-lg border-b border-ink-200 bg-ink-50 px-1.5 py-1 dark:border-ink-700 dark:bg-ink-900/60"
      role="toolbar"
      aria-label="Text formatting"
    >
      <ToolButton
        label="Bold (Ctrl+B)"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolButton>
      <ToolButton
        label="Italic (Ctrl+I)"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolButton>
      <ToolButton
        label="Underline (Ctrl+U)"
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="h-3.5 w-3.5" />
      </ToolButton>
      {full ? (
        <ToolButton
          label="Strikethrough"
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolButton>
      ) : null}

      <Sep />

      <ToolButton
        label="Superscript"
        active={editor.isActive('superscript')}
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
      >
        <SuperscriptIcon className="h-3.5 w-3.5" />
      </ToolButton>
      <ToolButton
        label="Subscript"
        active={editor.isActive('subscript')}
        onClick={() => editor.chain().focus().toggleSubscript().run()}
      >
        <SubscriptIcon className="h-3.5 w-3.5" />
      </ToolButton>
      <SymbolPicker editor={editor} />

      {full ? (
        <>
          <Sep />
          <ToolButton
            label="Bullet list"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-3.5 w-3.5" />
          </ToolButton>
          <ToolButton
            label="Numbered list"
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolButton>

          <Sep />
          <ToolButton
            label="Inline code"
            active={editor.isActive('code')}
            onClick={() => editor.chain().focus().toggleCode().run()}
          >
            <Code className="h-3.5 w-3.5" />
          </ToolButton>
          <ToolButton
            label="Code block"
            active={editor.isActive('codeBlock')}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            <Braces className="h-3.5 w-3.5" />
          </ToolButton>

          <Sep />
          <ImageButton editor={editor} />
          <TableMenu editor={editor} />

          <Sep />
          <ToolButton
            label="Align left"
            active={editor.isActive({ textAlign: 'left' })}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </ToolButton>
          <ToolButton
            label="Align centre"
            active={editor.isActive({ textAlign: 'center' })}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </ToolButton>
          <ToolButton
            label="Align right"
            active={editor.isActive({ textAlign: 'right' })}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
          >
            <AlignRight className="h-3.5 w-3.5" />
          </ToolButton>

          <Sep />
          <ToolButton
            label="Clear formatting"
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          >
            <Eraser className="h-3.5 w-3.5" />
          </ToolButton>
        </>
      ) : null}
    </div>
  )
}
