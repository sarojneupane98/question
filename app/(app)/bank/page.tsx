'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  BookMarked,
  CheckCheck,
  CheckSquare,
  CornerDownRight,
  Pencil,
  Plus,
  Square,
  Trash2,
} from 'lucide-react'

import { BankCreateDialog, BankEditDialog } from '@/components/bank/BankEntryDialog'
import { BankFilterBar } from '@/components/bank/BankFilterBar'
import { Button, IconButton } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/Modal'
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
import { formatTimestamp } from '@/lib/ids'
import { marksWord } from '@/lib/marks'
import { useAppStore, useCurrentPaper, useSettings } from '@/lib/store'
import { toast } from '@/lib/toast'
import type { BankEntry, BankFilters } from '@/lib/types'

/**
 * Question Bank (spec §8).
 *
 * Insertion targets a specific section of the *current* paper, so the section
 * dropdown is part of the action bar rather than a hidden default — dropping ten
 * questions into whichever section happened to be first is exactly the kind of
 * silent mistake that costs a teacher ten minutes of dragging.
 *
 * Filtering is shared with the editor's "insert from bank" dialog via
 * `lib/bank.ts` and `BankFilterBar`, so a filter combination that finds a question
 * in one place finds it in the other.
 */
export default function BankPage() {
  const bank = useAppStore((state) => state.bank)
  const removeBankEntry = useAppStore((state) => state.removeBankEntry)
  const insertFromBank = useAppStore((state) => state.insertFromBank)
  const paper = useCurrentPaper()
  const settings = useSettings()
  const { confirm, dialog } = useConfirm(settings.confirmBeforeDelete)

  const [filters, setFilters] = useState<BankFilters>(EMPTY_BANK_FILTERS)
  const [sort, setSort] = useState<BankSort>('recent')
  const [selected, setSelected] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<BankEntry | null>(null)
  const [sectionId, setSectionId] = useState('')

  const facets = useMemo(() => bankFacets(bank), [bank])
  const visible = useMemo(
    () => sortBankEntries(filterBankEntries(bank, filters), sort),
    [bank, filters, sort],
  )

  const selectedSet = new Set(selected)
  // Insert in the order shown, and ignore anything the filters have hidden — a
  // selection made before filtering must not smuggle in invisible questions.
  const ordered = visible.filter((entry) => selectedSet.has(entry.id)).map((entry) => entry.id)
  const allShownSelected = visible.length > 0 && ordered.length === visible.length

  const sections = paper?.sections ?? []
  const targetId = sections.some((section) => section.id === sectionId)
    ? sectionId
    : (sections[0]?.id ?? '')

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )

  const insert = (ids: string[]) => {
    if (ids.length === 0 || !targetId) return
    const section = sections.find((item) => item.id === targetId)
    insertFromBank(ids, targetId)
    setSelected([])
    toast.success(
      `${ids.length} question${ids.length === 1 ? '' : 's'} inserted`,
      `Added to the end of ${section?.title || 'the section'} in “${paper?.name ?? 'your paper'}”.`,
    )
  }

  const askDelete = (entry: BankEntry) =>
    confirm({
      title: 'Remove from the bank?',
      message:
        'This deletes the banked copy only. Questions already inserted into your papers are not affected.',
      confirmLabel: 'Remove',
      onConfirm: () => {
        removeBankEntry(entry.id)
        setSelected((current) => current.filter((id) => id !== entry.id))
        toast.info('Removed from the bank')
      },
    })

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-white">
            Question bank
          </h2>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            {bank.length} reusable question{bank.length === 1 ? '' : 's'}. Insert them into any paper —
            the banked copy stays as it is.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Add a question
        </Button>
      </div>

      {bank.length === 0 ? (
        <EmptyState
          icon={<BookMarked className="h-5 w-5" />}
          title="Your question bank is empty"
          description="Write one here, or use the bookmark icon on any question card in the editor to file a copy."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" />
                Add a question
              </Button>
              <Link
                href="/editor"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-ink-300 px-4 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50 dark:border-ink-600 dark:text-ink-200 dark:hover:bg-ink-800"
              >
                Go to the editor
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <BankFilterBar
            filters={filters}
            entries={bank}
            onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="xs"
              variant="ghost"
              disabled={visible.length === 0}
              onClick={() => setSelected(allShownSelected ? [] : visible.map((entry) => entry.id))}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {allShownSelected ? 'Clear selection' : 'Select all shown'}
            </Button>
            <span className="text-xs text-ink-400">
              {visible.length} of {bank.length} shown
            </span>
            <div className="ml-auto w-48">
              <Select
                fieldSize="sm"
                aria-label="Sort the question bank"
                value={sort}
                onChange={(event) => setSort(event.target.value as BankSort)}
                options={BANK_SORT_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
              />
            </div>
          </div>

          {/* ------------------------------------------------------ action bar */}
          {ordered.length > 0 ? (
            <div className="sticky top-16 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 p-2.5 shadow-card dark:border-brand-800 dark:bg-brand-950/80">
              <span className="px-1 text-sm font-semibold text-brand-800 dark:text-brand-200">
                {ordered.length} selected
              </span>

              {paper && sections.length > 0 ? (
                <>
                  <span className="text-xs text-brand-700 dark:text-brand-300">insert into</span>
                  <div className="w-56">
                    <Select
                      fieldSize="sm"
                      aria-label="Section to insert into"
                      value={targetId}
                      onChange={(event) => setSectionId(event.target.value)}
                      options={sections.map((section) => ({
                        value: section.id,
                        label: `${section.title || 'Untitled section'} (${section.questions.length})`,
                      }))}
                    />
                  </div>
                  <Button size="sm" onClick={() => insert(ordered)}>
                    <CornerDownRight className="h-3.5 w-3.5" />
                    Insert
                  </Button>
                </>
              ) : (
                <span className="text-xs text-brand-700 dark:text-brand-300">
                  Open a paper with at least one section to insert into.
                </span>
              )}

              <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected([])}>
                Clear
              </Button>
            </div>
          ) : null}

          {visible.length === 0 ? (
            <EmptyState
              icon={<BookMarked className="h-5 w-5" />}
              title="No questions match those filters"
              description="Try clearing a filter, or search for a different word."
              action={
                <Button variant="outline" onClick={() => setFilters(EMPTY_BANK_FILTERS)}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <ul className="space-y-2">
              {visible.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  selected={selectedSet.has(entry.id)}
                  canInsert={Boolean(targetId)}
                  onToggle={() => toggle(entry.id)}
                  onInsert={() => insert([entry.id])}
                  onEdit={() => setEditing(entry)}
                  onDelete={() => askDelete(entry)}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {creating ? (
        <BankCreateDialog
          onClose={() => setCreating(false)}
          subjects={facets.subjects}
          classNames={facets.classNames}
        />
      ) : null}

      {editing ? (
        <BankEditDialog
          entry={editing}
          onClose={() => setEditing(null)}
          subjects={facets.subjects}
          classNames={facets.classNames}
        />
      ) : null}

      {dialog}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function EntryRow({
  entry,
  selected,
  canInsert,
  onToggle,
  onInsert,
  onEdit,
  onDelete,
}: {
  entry: BankEntry
  selected: boolean
  canInsert: boolean
  onToggle: () => void
  onInsert: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const empty = isHtmlEmpty(entry.question.html)
  const Box = selected ? CheckSquare : Square

  return (
    <li
      className={cn(
        'flex items-start gap-3 rounded-xl border bg-white p-3 transition-colors dark:bg-ink-900',
        selected
          ? 'border-brand-500 dark:border-brand-600'
          : 'border-ink-200 hover:border-ink-300 dark:border-ink-700 dark:hover:border-ink-600',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        role="checkbox"
        aria-checked={selected}
        aria-label={selected ? 'Deselect question' : 'Select question'}
        className="mt-0.5 flex-none rounded p-0.5 transition-colors hover:bg-ink-100 dark:hover:bg-ink-800"
      >
        <Box
          className={cn(
            'h-4 w-4',
            selected ? 'text-brand-600 dark:text-brand-300' : 'text-ink-300 dark:text-ink-600',
          )}
        />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <QuestionTypeBadge type={entry.question.type} />
          <DifficultyBadge difficulty={entry.difficulty} />
          <span className="text-[11px] font-medium text-ink-500 dark:text-ink-400">
            {marksWord(entry.question.marks)}
          </span>
          {entry.usageCount > 0 ? (
            <span className="rounded-md bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold text-ink-500 dark:bg-ink-800 dark:text-ink-400">
              used {entry.usageCount}×
            </span>
          ) : null}
        </div>

        <p
          className={cn(
            'mt-1.5 text-sm leading-relaxed',
            empty ? 'italic text-ink-400' : 'text-ink-800 dark:text-ink-100',
          )}
        >
          {empty ? 'Empty question' : richTextExcerpt(entry.question.html, 260)}
        </p>

        <p className="mt-1.5 truncate text-[11px] text-ink-400 dark:text-ink-500">
          {[entry.subject, entry.className, entry.chapter].filter(Boolean).join(' · ') ||
            'Not filed — add a subject so the filters can find it'}
          <span className="mx-1.5">·</span>
          added {formatTimestamp(entry.createdAt)}
        </p>
      </div>

      <div className="flex flex-none items-center">
        <IconButton
          label={canInsert ? 'Insert into the current paper' : 'Open a paper first'}
          size="xs"
          disabled={!canInsert}
          onClick={onInsert}
        >
          <CornerDownRight className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton label="Edit filing" size="xs" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton
          label="Remove from the bank"
          size="xs"
          className="text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </IconButton>
      </div>
    </li>
  )
}
