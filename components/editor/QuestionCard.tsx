'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, Copy, GripVertical, Pencil, Trash2 } from 'lucide-react'

import { QuestionEditor } from './QuestionEditor'
import { IconButton, Button } from '@/components/ui/Button'
import { QuestionTypeBadge } from '@/components/ui/QuestionTypeIcon'
import { cn } from '@/lib/cn'
import { isHtmlEmpty, richTextExcerpt } from '@/lib/html'
import { marksWord } from '@/lib/marks'
import { useAppStore } from '@/lib/store'
import type { Question } from '@/lib/types'

/**
 * One question in the editor list (spec §3).
 *
 * Only the question the teacher is working on is expanded. That is not just
 * tidiness: an expanded card mounts a Tiptap instance per rich-text field, and a
 * 40-question paper with every card open would mount well over a hundred
 * editors. Collapsed cards render a plain-text excerpt instead.
 *
 * The row carries three actions and no more — Edit, Duplicate, Delete. Anything
 * rarer (answer lines, chapter, difficulty, filing a copy in the question bank)
 * lives under "More options" inside the expanded body, next to the question it
 * belongs to. A row of five icons on every one of forty questions is not a
 * feature list, it is noise.
 *
 * "Edit" is spelled out rather than left to the chevron. Clicking a row to open
 * it is obvious once you have seen it work and invisible until then, and the
 * teachers this is for should not have to discover it.
 */
export function QuestionCard({
  question,
  label,
  onRequestDelete,
}: {
  question: Question
  /** The printed label ("4.", "iv."), supplied so it matches the paper exactly. */
  label: string
  /** Raised to the section so one confirm dialog serves the whole list. */
  onRequestDelete: (question: Question) => void
}) {
  const activeQuestionId = useAppStore((s) => s.activeQuestionId)
  const setActiveQuestion = useAppStore((s) => s.setActiveQuestion)
  const duplicateQuestion = useAppStore((s) => s.duplicateQuestion)

  const expanded = activeQuestionId === question.id

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: question.id })

  const empty = isHtmlEmpty(question.html)
  const excerpt = empty ? 'Empty question' : richTextExcerpt(question.html, 150)

  const toggle = () => setActiveQuestion(expanded ? null : question.id)

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'rounded-xl border bg-white transition-shadow dark:bg-ink-900',
        expanded
          ? 'border-brand-300 shadow-card dark:border-brand-700'
          : 'border-ink-200 hover:border-ink-300 dark:border-ink-700 dark:hover:border-ink-600',
        // `relative` + a raised z-index while dragging keeps the lifted card above
        // its neighbours instead of sliding underneath them.
        isDragging && 'relative z-10 opacity-90 shadow-lift',
      )}
    >
      <div className="flex items-start gap-1.5 p-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          aria-label={`Reorder question ${label}`}
          className="mt-1 flex h-7 w-5 flex-none cursor-grab touch-none items-center justify-center rounded text-ink-300 hover:text-ink-500 active:cursor-grabbing dark:text-ink-600 dark:hover:text-ink-400"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={toggle}
          aria-expanded={expanded}
          className="min-w-0 flex-1 rounded-lg px-1 py-1 text-left"
        >
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold tabular-nums text-ink-500 dark:text-ink-400">{label}</span>
            <QuestionTypeBadge type={question.type} />
            <span className="text-[11px] font-medium text-ink-400">{marksWord(question.marks)}</span>
            <ChevronDown
              className={cn(
                'ml-auto h-3.5 w-3.5 flex-none text-ink-400 transition-transform',
                expanded && 'rotate-180',
              )}
              aria-hidden
            />
          </span>

          {expanded ? null : (
            <span
              className={cn(
                'mt-1 block text-xs leading-relaxed',
                empty ? 'italic text-ink-400' : 'text-ink-700 dark:text-ink-300',
              )}
            >
              {excerpt}
            </span>
          )}
        </button>

        <div className="flex flex-none items-center gap-0.5">
          <Button size="xs" variant={expanded ? 'subtle' : 'ghost'} onClick={toggle}>
            <Pencil className="h-3.5 w-3.5" />
            {expanded ? 'Close' : 'Edit'}
          </Button>
          <IconButton label={`Duplicate question ${label}`} onClick={() => duplicateQuestion(question.id)}>
            <Copy className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label={`Delete question ${label}`} onClick={() => onRequestDelete(question)}>
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-ink-200 px-3 py-3 dark:border-ink-700">
          <QuestionEditor question={question} />
        </div>
      ) : null}
    </div>
  )
}
