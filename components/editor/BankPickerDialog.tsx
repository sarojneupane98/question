'use client'

import { useMemo, useState } from 'react'
import { CheckCheck, CheckSquare, Library, Plus, Square } from 'lucide-react'

import { BankFilterBar } from '@/components/bank/BankFilterBar'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { EmptyState, Select } from '@/components/ui/Primitives'
import { DifficultyBadge, QuestionTypeBadge } from '@/components/ui/QuestionTypeIcon'
import {
  BANK_SORT_OPTIONS,
  EMPTY_BANK_FILTERS,
  bankFacets,
  filterBankEntries,
  sortBankEntries,
  type BankSort,
} from '@/lib/bank'
import { cn } from '@/lib/cn'
import { isHtmlEmpty, richTextExcerpt } from '@/lib/html'
import { marksWord } from '@/lib/marks'
import { useAppStore, useCurrentPaper } from '@/lib/store'
import { toast } from '@/lib/toast'
import type { BankEntry, BankFilters } from '@/lib/types'

/**
 * "Insert from bank" (spec §8).
 *
 * Mounted only while it is open, and keyed on the target section, so its filters
 * and selection start clean every time instead of showing whatever was left over
 * from the last section.
 *
 * The dialog never edits the bank: `insertFromBank` copies each question with
 * fresh ids, so a question inserted here and then rewritten in the paper leaves
 * the banked original untouched.
 */
export function BankPickerDialog({
  sectionId,
  onClose,
}: {
  /** The section the chosen questions are appended to. */
  sectionId: string
  onClose: () => void
}) {
  const paper = useCurrentPaper()
  const bank = useAppStore((s) => s.bank)
  const insertFromBank = useAppStore((s) => s.insertFromBank)

  // Start narrowed to the paper's own subject and class when the bank actually
  // has entries filed that way — the common case is "another question like the
  // ones I am already writing".
  const [filters, setFilters] = useState<BankFilters>(() => {
    const facets = bankFacets(bank)
    return {
      ...EMPTY_BANK_FILTERS,
      subject:
        paper && facets.subjects.includes(paper.exam.subject) ? paper.exam.subject : '',
      className:
        paper && facets.classNames.includes(paper.exam.className) ? paper.exam.className : '',
    }
  })
  const [sort, setSort] = useState<BankSort>('recent')
  const [selected, setSelected] = useState<string[]>([])

  const section = paper?.sections.find((item) => item.id === sectionId) ?? null

  const visible = useMemo(
    () => sortBankEntries(filterBankEntries(bank, filters), sort),
    [bank, filters, sort],
  )

  const selectedSet = new Set(selected)
  // Insert in the order the teacher is looking at, not the order they happened to
  // tick — and drop anything the current filters have hidden.
  const orderedSelection = visible.filter((entry) => selectedSet.has(entry.id)).map((e) => e.id)
  const allVisibleSelected = visible.length > 0 && orderedSelection.length === visible.length

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )

  const insert = () => {
    if (orderedSelection.length === 0) return
    insertFromBank(orderedSelection, sectionId)
    toast.success(
      `${orderedSelection.length} question${orderedSelection.length === 1 ? '' : 's'} inserted`,
      `Added to the end of ${section?.title || 'the section'}. Marks came across too — check the counter.`,
    )
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title="Insert from question bank"
      description={
        section
          ? `Chosen questions are copied to the end of ${section.title || 'this section'}.`
          : undefined
      }
      footer={
        <>
          <span className="mr-auto text-xs text-ink-400">
            {orderedSelection.length > 0
              ? `${orderedSelection.length} selected`
              : `${visible.length} of ${bank.length} shown`}
          </span>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={orderedSelection.length === 0} onClick={insert}>
            <Plus className="h-4 w-4" />
            Insert{orderedSelection.length > 0 ? ` ${orderedSelection.length}` : ''}
          </Button>
        </>
      }
    >
      {bank.length === 0 ? (
        <EmptyState
          icon={<Library className="h-5 w-5" />}
          title="Your question bank is empty"
          description="Use the bookmark icon on any question card to file a copy here. Banked questions can then be reused in any paper."
        />
      ) : (
        <div className="space-y-3">
          <BankFilterBar filters={filters} entries={bank} onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))} />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="xs"
              variant="ghost"
              disabled={visible.length === 0}
              onClick={() =>
                setSelected(allVisibleSelected ? [] : visible.map((entry) => entry.id))
              }
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {allVisibleSelected ? 'Clear selection' : 'Select all shown'}
            </Button>
            {/*
             * Wrapped rather than styled: `Select` renders its own positioning
             * div, so `ml-auto` has to go on the wrapper to push it right — and a
             * width class on the inner select would only fight the base `w-full`.
             */}
            <div className="ml-auto w-48">
              <Select
                fieldSize="sm"
                aria-label="Sort question bank"
                value={sort}
                onChange={(event) => setSort(event.target.value as BankSort)}
                options={BANK_SORT_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
              />
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={<Library className="h-5 w-5" />}
              title="No questions match those filters"
              description="Try clearing a filter or searching for a different word."
            />
          ) : (
            <ul className="max-h-[48vh] space-y-1.5 overflow-y-auto scroll-slim pr-1">
              {visible.map((entry) => (
                <BankRow
                  key={entry.id}
                  entry={entry}
                  selected={selectedSet.has(entry.id)}
                  onToggle={() => toggle(entry.id)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  )
}

function BankRow({
  entry,
  selected,
  onToggle,
}: {
  entry: BankEntry
  selected: boolean
  onToggle: () => void
}) {
  const empty = isHtmlEmpty(entry.question.html)
  const Icon = selected ? CheckSquare : Square

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        className={cn(
          'flex w-full items-start gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors',
          selected
            ? 'border-brand-500 bg-brand-50 dark:border-brand-600 dark:bg-brand-950/60'
            : 'border-ink-200 hover:border-ink-300 hover:bg-ink-50 dark:border-ink-700 dark:hover:border-ink-600 dark:hover:bg-ink-800',
        )}
      >
        <Icon
          className={cn(
            'mt-0.5 h-4 w-4 flex-none',
            selected ? 'text-brand-600 dark:text-brand-300' : 'text-ink-300 dark:text-ink-600',
          )}
          aria-hidden
        />

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <QuestionTypeBadge type={entry.question.type} />
            <DifficultyBadge difficulty={entry.difficulty} />
            <span className="text-[11px] font-medium text-ink-500 dark:text-ink-400">
              {marksWord(entry.question.marks)}
            </span>
            {entry.usageCount > 0 ? (
              <span className="text-[11px] text-ink-400">
                used {entry.usageCount}×
              </span>
            ) : null}
          </span>

          <span
            className={cn(
              'mt-1 block text-xs leading-relaxed',
              empty ? 'italic text-ink-400' : 'text-ink-800 dark:text-ink-100',
            )}
          >
            {empty ? 'Empty question' : richTextExcerpt(entry.question.html, 180)}
          </span>

          <span className="mt-1 block truncate text-[11px] text-ink-400">
            {[entry.subject, entry.className, entry.chapter].filter(Boolean).join(' · ') ||
              'No subject filed'}
          </span>
        </span>
      </button>
    </li>
  )
}
