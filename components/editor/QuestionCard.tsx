'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { BookmarkPlus, ChevronDown, Copy, GripVertical, Trash2 } from 'lucide-react'

import { QuestionEditor } from './QuestionEditor'
import { IconButton, Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Field, Input, Select } from '@/components/ui/Primitives'
import { QuestionTypeBadge } from '@/components/ui/QuestionTypeIcon'
import { cn } from '@/lib/cn'
import { DIFFICULTY_OPTIONS } from '@/lib/defaults'
import { isHtmlEmpty, richTextExcerpt } from '@/lib/html'
import { marksWord } from '@/lib/marks'
import { useAppStore, useCurrentPaper } from '@/lib/store'
import { toast } from '@/lib/toast'
import type { Difficulty, Question } from '@/lib/types'

/**
 * One question in the editor list (spec §3).
 *
 * Only the question the teacher is working on is expanded. That is not just
 * tidiness: an expanded card mounts a Tiptap instance per rich-text field, and a
 * 40-question paper with every card open would mount well over a hundred
 * editors. Collapsed cards render a plain-text excerpt instead.
 */

/* -------------------------------------------------------------------------- */
/*  Save-to-bank dialog                                                       */
/* -------------------------------------------------------------------------- */

function AddToBankDialog({
  question,
  open,
  onClose,
}: {
  question: Question
  open: boolean
  onClose: () => void
}) {
  const paper = useCurrentPaper()
  const addToBank = useAppStore((s) => s.addToBank)
  const updateQuestion = useAppStore((s) => s.updateQuestion)

  const [subject, setSubject] = useState(paper?.exam.subject ?? '')
  const [className, setClassName] = useState(paper?.exam.className ?? '')
  const [chapter, setChapter] = useState(question.meta.chapter)
  const [difficulty, setDifficulty] = useState<Difficulty>(question.meta.difficulty)

  const save = () => {
    addToBank(question, { subject, className, chapter, difficulty })
    // Keep the question in the paper in step with what was filed, so the same
    // question is not re-tagged from scratch next time.
    if (chapter !== question.meta.chapter || difficulty !== question.meta.difficulty) {
      updateQuestion(question.id, { meta: { ...question.meta, chapter, difficulty } })
    }
    onClose()
    toast.success('Saved to question bank', 'Find it under Question Bank, filtered by these details.')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Save to question bank"
      description="A copy is filed away. Editing the question in this paper will not change the copy."
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>
            <BookmarkPlus className="h-4 w-4" />
            Save copy
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Subject">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Science" />
        </Field>
        <Field label="Class / Grade">
          <Input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="Grade 10" />
        </Field>
        <Field label="Chapter">
          <Input
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
            placeholder="Force and Motion"
          />
        </Field>
        <Field label="Difficulty">
          <Select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            options={DIFFICULTY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
        </Field>
      </div>
    </Modal>
  )
}

/* -------------------------------------------------------------------------- */
/*  Card                                                                      */
/* -------------------------------------------------------------------------- */

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
  const [bankOpen, setBankOpen] = useState(false)

  const expanded = activeQuestionId === question.id

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: question.id })

  const empty = isHtmlEmpty(question.html)
  const excerpt = empty ? 'Empty question' : richTextExcerpt(question.html, 150)

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
          onClick={() => setActiveQuestion(expanded ? null : question.id)}
          aria-expanded={expanded}
          className="min-w-0 flex-1 rounded-lg px-1 py-1 text-left"
        >
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold tabular-nums text-ink-500 dark:text-ink-400">{label}</span>
            <QuestionTypeBadge type={question.type} />
            <span className="text-[11px] font-medium text-ink-400">{marksWord(question.marks)}</span>
            {question.meta.chapter ? (
              <span className="truncate text-[11px] text-ink-400">· {question.meta.chapter}</span>
            ) : null}
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

        <div className="flex flex-none items-center">
          <IconButton label="Save to question bank" onClick={() => setBankOpen(true)}>
            <BookmarkPlus className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label="Duplicate question" onClick={() => duplicateQuestion(question.id)}>
            <Copy className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label="Delete question" onClick={() => onRequestDelete(question)}>
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-ink-200 px-3 py-3 dark:border-ink-700">
          <QuestionEditor question={question} />
        </div>
      ) : null}

      {bankOpen ? (
        <AddToBankDialog question={question} open={bankOpen} onClose={() => setBankOpen(false)} />
      ) : null}
    </div>
  )
}
