'use client'

import { useState } from 'react'
import { BookMarked, Plus } from 'lucide-react'

import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Field, Input, NumberInput, Select } from '@/components/ui/Primitives'
import { DIFFICULTY_OPTIONS, QUESTION_TYPES, createQuestion, questionTypeSpec } from '@/lib/defaults'
import { isHtmlEmpty, richTextExcerpt } from '@/lib/html'
import { useAppStore, useCurrentPaper } from '@/lib/store'
import { toast } from '@/lib/toast'
import type { BankEntry, Difficulty, QuestionType } from '@/lib/types'

/**
 * The two question-bank dialogs (spec §8).
 *
 * They are deliberately different shapes, because the store draws a hard line:
 * `updateBankEntry` can change an entry's filing (subject, class, chapter,
 * difficulty) but never its question. A banked question is a fixed copy — that is
 * what makes it safe to insert into ten papers and edit each one separately. So
 * "Edit" here means "re-file", and re-wording happens in a paper.
 */

interface Meta {
  subject: string
  className: string
  chapter: string
  difficulty: Difficulty
}

/** The four filing fields, shared by both dialogs so they cannot drift. */
function MetaFields({
  meta,
  onChange,
  subjects,
  classNames,
}: {
  meta: Meta
  onChange: (patch: Partial<Meta>) => void
  subjects: string[]
  classNames: string[]
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field
        label="Subject"
        hint={subjects.length > 0 ? `Already used: ${subjects.slice(0, 3).join(', ')}` : undefined}
      >
        <Input
          value={meta.subject}
          placeholder="Science"
          list="bank-subjects"
          onChange={(event) => onChange({ subject: event.target.value })}
        />
        {/* A datalist rather than a select: the teacher must be able to file a
          * subject the bank has never seen, and still get one-tap reuse of the
          * ones they have. */}
        <datalist id="bank-subjects">
          {subjects.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      </Field>

      <Field label="Class / grade">
        <Input
          value={meta.className}
          placeholder="Grade 10"
          list="bank-classes"
          onChange={(event) => onChange({ className: event.target.value })}
        />
        <datalist id="bank-classes">
          {classNames.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      </Field>

      <Field label="Chapter / unit">
        <Input
          value={meta.chapter}
          placeholder="Force and Motion"
          onChange={(event) => onChange({ chapter: event.target.value })}
        />
      </Field>

      <Field label="Difficulty">
        <Select
          value={meta.difficulty}
          onChange={(event) => onChange({ difficulty: event.target.value as Difficulty })}
          options={DIFFICULTY_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
        />
      </Field>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Create                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Writes a question straight into the bank, without going through a paper.
 *
 * Only the stem, type and marks are offered. MCQ options and matching pairs are
 * created empty and are filled in on a question card, where the dedicated editors
 * for them live — duplicating those here would be a second place for the same
 * thing to go subtly wrong.
 */
export function BankCreateDialog({
  onClose,
  subjects,
  classNames,
}: {
  onClose: () => void
  subjects: string[]
  classNames: string[]
}) {
  const paper = useCurrentPaper()
  const addToBank = useAppStore((state) => state.addToBank)

  const [html, setHtml] = useState('')
  const [type, setType] = useState<QuestionType>('short')
  const [marks, setMarks] = useState(() => questionTypeSpec('short').defaultMarks)
  const [meta, setMeta] = useState<Meta>({
    // Pre-filled from the paper being worked on, which is nearly always what the
    // new question belongs to.
    subject: paper?.exam.subject ?? '',
    className: paper?.exam.className ?? '',
    chapter: '',
    difficulty: 'medium',
  })

  const spec = questionTypeSpec(type)
  const empty = isHtmlEmpty(html)

  const save = () => {
    if (empty) return
    addToBank(createQuestion(type, { html, marks }), {
      subject: meta.subject.trim(),
      className: meta.className.trim(),
      chapter: meta.chapter.trim(),
      difficulty: meta.difficulty,
    })
    toast.success(
      'Added to your question bank',
      spec.hasOptions || spec.hasPairs
        ? `${spec.label} saved. Insert it into a paper to fill in its ${spec.hasOptions ? 'options' : 'pairs'}.`
        : 'Insert it into any paper from the section menu.',
    )
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Add a question to the bank"
      description="Banked questions are reusable copies — inserting one never changes the original."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={empty} onClick={save} title={empty ? 'Write the question first' : undefined}>
            <Plus className="h-4 w-4" />
            Add to bank
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Question" hint="Bold, symbols, superscript, tables and images all survive into Word and PDF.">
          <RichTextEditor
            value={html}
            onChange={setHtml}
            autoFocus
            ariaLabel="Question text"
            placeholder="Type the question…"
            minHeightClass="min-h-[6rem]"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-[2fr,1fr]">
          <Field label="Question type">
            <Select
              value={type}
              onChange={(event) => {
                const next = event.target.value as QuestionType
                setType(next)
                // Follow the new type's default marks, since nothing here has
                // been deliberately tuned yet.
                setMarks(questionTypeSpec(next).defaultMarks)
              }}
              options={QUESTION_TYPES.map((item) => ({ value: item.id, label: item.label }))}
            />
          </Field>
          <Field label="Marks">
            <NumberInput value={marks} onValueChange={setMarks} min={0} max={100} step={0.5} />
          </Field>
        </div>

        <div className="border-t border-ink-200 pt-4 dark:border-ink-700">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
            Filing — used by the bank filters
          </p>
          <MetaFields
            meta={meta}
            onChange={(patch) => setMeta((current) => ({ ...current, ...patch }))}
            subjects={subjects}
            classNames={classNames}
          />
        </div>
      </div>
    </Modal>
  )
}

/* -------------------------------------------------------------------------- */
/*  Re-file                                                                   */
/* -------------------------------------------------------------------------- */

export function BankEditDialog({
  entry,
  onClose,
  subjects,
  classNames,
}: {
  entry: BankEntry
  onClose: () => void
  subjects: string[]
  classNames: string[]
}) {
  const updateBankEntry = useAppStore((state) => state.updateBankEntry)

  const [meta, setMeta] = useState<Meta>({
    subject: entry.subject,
    className: entry.className,
    chapter: entry.chapter,
    difficulty: entry.difficulty,
  })

  const save = () => {
    updateBankEntry(entry.id, {
      subject: meta.subject.trim(),
      className: meta.className.trim(),
      chapter: meta.chapter.trim(),
      difficulty: meta.difficulty,
    })
    toast.success('Filing updated', 'The bank filters will pick this up straight away.')
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Edit filing"
      description="Change how this question is filed. The wording itself is edited inside a paper."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-3 rounded-xl bg-ink-50 p-3 dark:bg-ink-800">
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-white text-ink-500 dark:bg-ink-900 dark:text-ink-400">
            <BookMarked className="h-4 w-4" />
          </span>
          <p className="min-w-0 text-xs leading-relaxed text-ink-600 dark:text-ink-300">
            {isHtmlEmpty(entry.question.html)
              ? 'This banked question has no text.'
              : richTextExcerpt(entry.question.html, 240)}
          </p>
        </div>

        <MetaFields
          meta={meta}
          onChange={(patch) => setMeta((current) => ({ ...current, ...patch }))}
          subjects={subjects}
          classNames={classNames}
        />
      </div>
    </Modal>
  )
}
