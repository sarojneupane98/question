'use client'

import { useState } from 'react'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ChevronDown,
  Copy,
  GripVertical,
  Library,
  Plus,
  Scale,
  Settings2,
  Trash2,
} from 'lucide-react'

import { QuestionCard } from './QuestionCard'
import { Button, IconButton } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/Modal'
import { Field, Input, NumberInput, Select, Toggle } from '@/components/ui/Primitives'
import { QuestionTypeIcon } from '@/components/ui/QuestionTypeIcon'
import { usePopover } from '@/components/ui/usePopover'
import { cn } from '@/lib/cn'
import { QUESTION_TYPES } from '@/lib/defaults'
import { marksWord, sectionMarks, suggestMarksNote } from '@/lib/marks'
import { NUMBER_STYLE_OPTIONS } from '@/lib/numbering'
import { useAppStore, useSettings } from '@/lib/store'
import type { Question, QuestionType, Section } from '@/lib/types'

/**
 * One section of the paper (spec §3).
 *
 * The section owns the confirm dialog for its own deletion *and* for its
 * questions' — a single dialog per section rather than one per card, which keeps
 * a 40-question paper from mounting 40 modals.
 */

function AddQuestionMenu({ sectionId }: { sectionId: string }) {
  const { open, setOpen, ref } = usePopover()
  const addQuestion = useAppStore((s) => s.addQuestion)

  return (
    <div className="relative" ref={ref}>
      <Button size="sm" variant="outline" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Plus className="h-4 w-4" />
        Add question
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </Button>

      {open ? (
        <div className="absolute bottom-10 left-0 z-30 w-72 animate-slide-up overflow-hidden rounded-xl border border-ink-200 bg-white py-1 shadow-lift dark:border-ink-700 dark:bg-ink-800">
          {QUESTION_TYPES.map((spec) => (
            <button
              key={spec.id}
              type="button"
              onClick={() => {
                addQuestion(sectionId, spec.id)
                setOpen(false)
              }}
              className="flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-ink-100 dark:hover:bg-ink-700"
            >
              <span className="mt-0.5 flex-none text-ink-500 dark:text-ink-400">
                <QuestionTypeIcon type={spec.id} className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-ink-800 dark:text-ink-100">
                  {spec.label}
                </span>
                <span className="block text-[11px] leading-snug text-ink-400">{spec.description}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function SectionCard({
  section,
  index,
  total,
  labels,
  onInsertFromBank,
}: {
  section: Section
  index: number
  total: number
  /** Printed question labels for the whole paper, keyed by question id. */
  labels: Map<string, string>
  onInsertFromBank: (sectionId: string) => void
}) {
  const settings = useSettings()
  const updateSection = useAppStore((s) => s.updateSection)
  const removeSection = useAppStore((s) => s.removeSection)
  const duplicateSection = useAppStore((s) => s.duplicateSection)
  const removeQuestion = useAppStore((s) => s.removeQuestion)
  const addQuestion = useAppStore((s) => s.addQuestion)
  const balanceSection = useAppStore((s) => s.balanceSection)

  const { confirm, dialog } = useConfirm(settings.confirmBeforeDelete)
  const [showSettings, setShowSettings] = useState(false)
  const [balanceTarget, setBalanceTarget] = useState<number | null>(null)

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id })

  const marks = sectionMarks(section)
  const questionIds = section.questions.map((question) => question.id)
  const suggestion = suggestMarksNote(section)
  const lastType: QuestionType =
    section.questions.length > 0 ? section.questions[section.questions.length - 1].type : 'short'

  const requestQuestionDelete = (question: Question) => {
    confirm({
      title: 'Delete this question?',
      message: `${labels.get(question.id) ?? 'This question'} and everything in it — options, images, marks — will be removed. Undo brings it back.`,
      onConfirm: () => removeQuestion(question.id),
    })
  }

  const requestSectionDelete = () => {
    confirm({
      title: `Delete "${section.title || 'this section'}"?`,
      message:
        section.questions.length > 0
          ? `Its ${section.questions.length} question${
              section.questions.length === 1 ? '' : 's'
            } (${marksWord(marks)}) will be deleted too.`
          : 'The section is empty, so nothing else is lost.',
      onConfirm: () => removeSection(section.id),
    })
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'rounded-2xl border bg-white shadow-card dark:bg-ink-900',
        isDragging
          ? 'relative z-10 border-brand-400 opacity-95 shadow-lift'
          : 'border-ink-200 dark:border-ink-700',
      )}
    >
      {/* ---- header ------------------------------------------------------- */}
      <div className="flex items-center gap-1 px-2 py-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          aria-label={`Reorder ${section.title || 'section'}`}
          className="flex h-8 w-5 flex-none cursor-grab touch-none items-center justify-center rounded text-ink-300 hover:text-ink-500 active:cursor-grabbing dark:text-ink-600 dark:hover:text-ink-400"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <IconButton
          label={section.collapsed ? 'Expand section' : 'Collapse section'}
          onClick={() => updateSection(section.id, { collapsed: !section.collapsed })}
        >
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', section.collapsed && '-rotate-90')}
          />
        </IconButton>

        <input
          value={section.title}
          aria-label="Section title"
          placeholder={`Section ${index + 1}`}
          onChange={(event) => updateSection(section.id, { title: event.target.value })}
          className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-ink-900 transition-colors hover:border-ink-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:text-white dark:hover:border-ink-700"
        />

        <span className="flex-none whitespace-nowrap px-1 text-[11px] font-medium tabular-nums text-ink-400">
          {section.questions.length} q · {marks} m
        </span>

        <IconButton
          label="Section options"
          active={showSettings}
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings2 className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton label="Duplicate section" onClick={() => duplicateSection(section.id)}>
          <Copy className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton
          label="Delete section"
          disabled={total <= 1}
          // Spread order inside IconButton means an explicit `title` replaces the
          // label-derived one — so both branches have to supply text.
          title={total <= 1 ? 'A paper needs at least one section' : 'Delete section'}
          onClick={requestSectionDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </IconButton>
      </div>

      {section.collapsed ? null : (
        <div className="space-y-3 border-t border-ink-200 px-3 py-3 dark:border-ink-700">
          {/* ---- section settings ----------------------------------------- */}
          {showSettings ? (
            <div className="space-y-3 rounded-xl bg-ink-50 p-3 dark:bg-ink-800/50">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Note under the heading">
                  <Input
                    fieldSize="sm"
                    value={section.note}
                    placeholder="Attempt all questions."
                    onChange={(event) => updateSection(section.id, { note: event.target.value })}
                  />
                </Field>

                <Field
                  label="Marks note"
                  hint={
                    suggestion && suggestion !== section.marksNote
                      ? `Suggested: ${suggestion}`
                      : 'Printed beside the heading.'
                  }
                >
                  <div className="flex gap-1.5">
                    <Input
                      fieldSize="sm"
                      value={section.marksNote}
                      placeholder="(10 × 1 = 10)"
                      onChange={(event) => updateSection(section.id, { marksNote: event.target.value })}
                    />
                    {suggestion ? (
                      <Button
                        size="sm"
                        variant="subtle"
                        className="flex-none"
                        disabled={suggestion === section.marksNote}
                        onClick={() => updateSection(section.id, { marksNote: suggestion })}
                      >
                        Use
                      </Button>
                    ) : null}
                  </div>
                </Field>

                <Field label="Question numbering">
                  <Select
                    fieldSize="sm"
                    value={section.numberStyle}
                    onChange={(event) =>
                      updateSection(section.id, {
                        numberStyle: event.target.value as Section['numberStyle'],
                      })
                    }
                    options={NUMBER_STYLE_OPTIONS.map((option) => ({
                      value: option.value,
                      label: `${option.label} — ${option.sample}`,
                    }))}
                  />
                </Field>

                <Field label="Balance this section to" hint="Spreads the total evenly across its questions.">
                  <div className="flex gap-1.5">
                    <NumberInput
                      fieldSize="sm"
                      value={balanceTarget ?? marks}
                      onValueChange={setBalanceTarget}
                      min={0}
                      max={500}
                    />
                    <Button
                      size="sm"
                      variant="subtle"
                      className="flex-none"
                      disabled={section.questions.length === 0}
                      onClick={() => balanceSection(section.id, balanceTarget ?? marks)}
                    >
                      <Scale className="h-3.5 w-3.5" />
                      Apply
                    </Button>
                  </div>
                </Field>
              </div>

              <div className="space-y-2 border-t border-ink-200 pt-2.5 dark:border-ink-700">
                <Toggle
                  checked={section.restartNumbering}
                  onChange={(restartNumbering) => updateSection(section.id, { restartNumbering })}
                  label="Restart numbering at 1"
                  hint="Off means numbering continues from the previous section."
                />
                <Toggle
                  checked={section.showSectionMarks}
                  onChange={(showSectionMarks) => updateSection(section.id, { showSectionMarks })}
                  label="Print the section total"
                />
                <Toggle
                  checked={section.pageBreakBefore}
                  onChange={(pageBreakBefore) => updateSection(section.id, { pageBreakBefore })}
                  label="Start on a new page"
                  hint={index === 0 ? 'No effect on the first section.' : undefined}
                />
              </div>
            </div>
          ) : null}

          {/* ---- questions ------------------------------------------------ */}
          {section.questions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink-300 px-3 py-6 text-center text-xs text-ink-400 dark:border-ink-600">
              No questions in this section yet.
            </p>
          ) : (
            <SortableContext items={questionIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {section.questions.map((question) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    label={labels.get(question.id) ?? ''}
                    onRequestDelete={requestQuestionDelete}
                  />
                ))}
              </div>
            </SortableContext>
          )}

          {/* ---- footer --------------------------------------------------- */}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => addQuestion(section.id, lastType)}>
              <Plus className="h-4 w-4" />
              {section.questions.length > 0 ? 'Add another' : 'Add question'}
            </Button>
            <AddQuestionMenu sectionId={section.id} />
            <Button size="sm" variant="ghost" onClick={() => onInsertFromBank(section.id)}>
              <Library className="h-4 w-4" />
              From bank
            </Button>
          </div>
        </div>
      )}

      {dialog}
    </div>
  )
}
