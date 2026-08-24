'use client'

import { Plus, Trash2 } from 'lucide-react'

import { RichTextEditor } from './RichTextEditor'
import { Button, IconButton } from '@/components/ui/Button'
import { Field, Input, NumberInput, Segmented, Select } from '@/components/ui/Primitives'
import { DIFFICULTY_OPTIONS, QUESTION_TYPES, questionTypeSpec } from '@/lib/defaults'
import { cn } from '@/lib/cn'
import { matchLeftLabel, matchRightLabel, optionLetter } from '@/lib/numbering'
import { useAppStore } from '@/lib/store'
import type { Difficulty, Question } from '@/lib/types'

/**
 * The expanded body of a question card.
 *
 * Every control writes straight to the store — there is no local draft state, so
 * the live preview on the right updates as the teacher types and there is no
 * "unsaved" state that could be lost. Rich text is the exception: those writes are
 * debounced inside `RichTextEditor` so one undo step is a phrase rather than a
 * letter.
 */
export function QuestionEditor({ question }: { question: Question }) {
  const spec = questionTypeSpec(question.type)

  const setQuestionType = useAppStore((s) => s.setQuestionType)
  const updateQuestion = useAppStore((s) => s.updateQuestion)
  const addOption = useAppStore((s) => s.addOption)
  const updateOption = useAppStore((s) => s.updateOption)
  const removeOption = useAppStore((s) => s.removeOption)
  const setCorrectOption = useAppStore((s) => s.setCorrectOption)
  const addMatchPair = useAppStore((s) => s.addMatchPair)
  const updateMatchPair = useAppStore((s) => s.updateMatchPair)
  const removeMatchPair = useAppStore((s) => s.removeMatchPair)

  return (
    <div className="space-y-4">
      {/* ---- stem --------------------------------------------------------- */}
      <RichTextEditor
        value={question.html}
        onChange={(html) => updateQuestion(question.id, { html })}
        placeholder={
          question.type === 'fillblank'
            ? 'Type the sentence and use ____ for each blank…'
            : 'Type the question…'
        }
        ariaLabel="Question text"
        minHeightClass={question.type === 'long' ? 'min-h-[6rem]' : 'min-h-[4rem]'}
      />

      {/* ---- MCQ options -------------------------------------------------- */}
      {spec.hasOptions ? (
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Options</p>
            <label className="flex items-center gap-2 text-xs text-ink-500 dark:text-ink-400">
              Per row
              <span className="block w-16">
                <Select
                  fieldSize="sm"
                  value={String(question.optionColumns)}
                  onChange={(event) =>
                    updateQuestion(question.id, {
                      optionColumns: Number(event.target.value) as 1 | 2 | 4,
                    })
                  }
                  options={[
                    { value: '1', label: '1' },
                    { value: '2', label: '2' },
                    { value: '4', label: '4' },
                  ]}
                />
              </span>
            </label>
          </div>

          <div className="space-y-2">
            {question.options.map((option, index) => {
              const correct = question.correctOptionId === option.id
              return (
                <div key={option.id} className="flex items-start gap-2">
                  {/*
                   * A button rather than a radio input: clicking the marked
                   * option again clears it, because "no answer key yet" is a
                   * normal state for a paper the teacher is still drafting and a
                   * radio group cannot be un-selected.
                   */}
                  <button
                    type="button"
                    onClick={() => setCorrectOption(question.id, option.id)}
                    aria-pressed={correct}
                    title={correct ? 'Correct answer — click to clear' : 'Mark as correct answer'}
                    className={cn(
                      'mt-1.5 flex h-6 w-6 flex-none items-center justify-center rounded-full border text-[11px] font-semibold transition-colors',
                      correct
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-ink-300 text-ink-500 hover:border-brand-400 hover:text-brand-600 dark:border-ink-600 dark:text-ink-400',
                    )}
                  >
                    {optionLetter(index)}
                  </button>

                  <RichTextEditor
                    value={option.html}
                    onChange={(html) => updateOption(question.id, option.id, html)}
                    placeholder={`Option ${optionLetter(index)}`}
                    variant="inline"
                    toolbar="mini"
                    className="flex-1"
                    ariaLabel={`Option ${optionLetter(index)}`}
                  />

                  <IconButton
                    label={`Delete option ${optionLetter(index)}`}
                    className="mt-1"
                    disabled={question.options.length <= 2}
                    onClick={() => removeOption(question.id, option.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconButton>
                </div>
              )
            })}
          </div>

          <div className="mt-2 flex items-center gap-3">
            <Button
              size="xs"
              variant="subtle"
              onClick={() => addOption(question.id)}
              disabled={question.options.length >= 12}
            >
              <Plus className="h-3.5 w-3.5" />
              Add option
            </Button>
            <span className="text-xs text-ink-400">
              {question.correctOptionId
                ? 'Correct answer marked'
                : 'Click a letter to mark the correct answer (optional)'}
            </span>
          </div>
        </div>
      ) : null}

      {/* ---- True / False ------------------------------------------------- */}
      {question.type === 'truefalse' ? (
        <Field label="Correct answer (optional)">
          <Segmented
            size="sm"
            className="max-w-xs"
            value={question.tfAnswer === null ? 'none' : question.tfAnswer ? 'true' : 'false'}
            onChange={(next) =>
              updateQuestion(question.id, {
                tfAnswer: next === 'none' ? null : next === 'true',
              })
            }
            options={[
              { value: 'none', label: 'Not set' },
              { value: 'true', label: 'True' },
              { value: 'false', label: 'False' },
            ]}
          />
        </Field>
      ) : null}

      {/* ---- Matching pairs ----------------------------------------------- */}
      {spec.hasPairs ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
            Match the following
          </p>
          <div className="space-y-2">
            {question.matchPairs.map((pair, index) => (
              <div key={pair.id} className="flex items-start gap-2">
                <span className="mt-2 w-6 flex-none text-xs font-medium tabular-nums text-ink-400">
                  {matchLeftLabel(index)}
                </span>
                <RichTextEditor
                  value={pair.left}
                  onChange={(left) => updateMatchPair(question.id, pair.id, { left })}
                  placeholder="Column A"
                  variant="inline"
                  toolbar="mini"
                  className="flex-1"
                  ariaLabel={`Column A row ${index + 1}`}
                />
                <span className="mt-2 w-6 flex-none text-center text-xs text-ink-400">→</span>
                <RichTextEditor
                  value={pair.right}
                  onChange={(right) => updateMatchPair(question.id, pair.id, { right })}
                  placeholder={`Column B (${matchRightLabel(index)})`}
                  variant="inline"
                  toolbar="mini"
                  className="flex-1"
                  ariaLabel={`Column B row ${index + 1}`}
                />
                <IconButton
                  label={`Delete pair ${index + 1}`}
                  className="mt-1"
                  disabled={question.matchPairs.length <= 2}
                  onClick={() => removeMatchPair(question.id, pair.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              </div>
            ))}
          </div>
          <Button
            size="xs"
            variant="subtle"
            className="mt-2"
            onClick={() => addMatchPair(question.id)}
            disabled={question.matchPairs.length >= 30}
          >
            <Plus className="h-3.5 w-3.5" />
            Add pair
          </Button>
          <p className="mt-2 text-xs text-ink-400">
            Column B is printed in the order you enter it. Shuffle it yourself if the answers should
            not line up.
          </p>
        </div>
      ) : null}

      {/* ---- settings row ------------------------------------------------- */}
      <div className="grid gap-3 border-t border-ink-200 pt-3.5 dark:border-ink-700 sm:grid-cols-3">
        <Field label="Question type">
          <Select
            fieldSize="sm"
            value={question.type}
            onChange={(event) =>
              setQuestionType(question.id, event.target.value as Question['type'])
            }
            options={QUESTION_TYPES.map((type) => ({ value: type.id, label: type.label }))}
          />
        </Field>

        <Field label="Marks">
          <NumberInput
            fieldSize="sm"
            value={question.marks}
            onValueChange={(marks) => updateQuestion(question.id, { marks })}
            min={0}
            max={100}
          />
        </Field>

        <Field label="Answer lines" hint="Ruled writing space printed below.">
          <NumberInput
            fieldSize="sm"
            value={question.answerLines}
            onValueChange={(answerLines) => updateQuestion(question.id, { answerLines })}
            min={0}
            max={40}
          />
        </Field>

        {/*
         * Chapter and difficulty are never printed — they exist so the question
         * bank can be filtered later (§8). Editing them here rather than only in
         * the "save to bank" dialog means a paper built today is still findable
         * when the teacher searches the bank next term.
         */}
        <Field label="Chapter" className="sm:col-span-2" hint="Not printed — used to filter the question bank.">
          <Input
            fieldSize="sm"
            value={question.meta.chapter}
            placeholder="e.g. Force and Motion"
            onChange={(event) =>
              updateQuestion(question.id, {
                meta: { ...question.meta, chapter: event.target.value },
              })
            }
          />
        </Field>

        <Field label="Difficulty">
          <Select
            fieldSize="sm"
            value={question.meta.difficulty}
            onChange={(event) =>
              updateQuestion(question.id, {
                meta: { ...question.meta, difficulty: event.target.value as Difficulty },
              })
            }
            options={DIFFICULTY_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          />
        </Field>
      </div>
    </div>
  )
}
