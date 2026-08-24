'use client'

import { Search, X } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Primitives'
import { EMPTY_BANK_FILTERS, bankFacets, hasActiveFilters } from '@/lib/bank'
import { cn } from '@/lib/cn'
import { DIFFICULTY_OPTIONS, QUESTION_TYPES } from '@/lib/defaults'
import type { BankEntry, BankFilters, Difficulty, QuestionType } from '@/lib/types'

/**
 * The search box and five filter dropdowns from spec §8.
 *
 * Shared by the Question Bank page and the "insert from bank" dialog so the two
 * cannot drift apart. The dropdown options are built from *all* entries, not the
 * filtered ones — otherwise choosing a subject would empty the chapter list and
 * strand the teacher with no way back.
 */
export function BankFilterBar({
  filters,
  onChange,
  entries,
  className,
}: {
  filters: BankFilters
  onChange: (patch: Partial<BankFilters>) => void
  entries: BankEntry[]
  className?: string
}) {
  const facets = bankFacets(entries)
  const active = hasActiveFilters(filters)

  const anyOption = (label: string) => ({ value: '', label })

  return (
    <div className={cn('space-y-2.5', className)}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
          aria-hidden
        />
        <Input
          fieldSize="sm"
          value={filters.search}
          placeholder="Search questions, chapters, options…"
          aria-label="Search the question bank"
          onChange={(event) => onChange({ search: event.target.value })}
          // Inline padding rather than a `pl-9` class: `cn` is plain clsx, so
          // `pl-9` would sit alongside the base `px-3` and let stylesheet order
          // pick the winner. A style attribute is unambiguous.
          style={{ paddingLeft: '2.25rem', paddingRight: filters.search ? '2.25rem' : undefined }}
        />
        {filters.search ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onChange({ search: '' })}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-700 dark:hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <Select
          fieldSize="sm"
          value={filters.subject}
          aria-label="Filter by subject"
          onChange={(event) => onChange({ subject: event.target.value })}
          options={[
            anyOption('All subjects'),
            ...facets.subjects.map((value) => ({ value, label: value })),
          ]}
        />
        <Select
          fieldSize="sm"
          value={filters.className}
          aria-label="Filter by class"
          onChange={(event) => onChange({ className: event.target.value })}
          options={[
            anyOption('All classes'),
            ...facets.classNames.map((value) => ({ value, label: value })),
          ]}
        />
        <Select
          fieldSize="sm"
          value={filters.chapter}
          aria-label="Filter by chapter"
          onChange={(event) => onChange({ chapter: event.target.value })}
          options={[
            anyOption('All chapters'),
            ...facets.chapters.map((value) => ({ value, label: value })),
          ]}
        />
        <Select
          fieldSize="sm"
          value={filters.difficulty}
          aria-label="Filter by difficulty"
          onChange={(event) =>
            onChange({ difficulty: event.target.value as Difficulty | 'all' })
          }
          options={[
            { value: 'all', label: 'Any difficulty' },
            ...DIFFICULTY_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
          ]}
        />
        <Select
          fieldSize="sm"
          value={filters.type}
          aria-label="Filter by question type"
          onChange={(event) => onChange({ type: event.target.value as QuestionType | 'all' })}
          options={[
            { value: 'all', label: 'Any type' },
            ...QUESTION_TYPES.map((spec) => ({ value: spec.id, label: spec.label })),
          ]}
        />
      </div>

      {active ? (
        <Button size="xs" variant="ghost" onClick={() => onChange({ ...EMPTY_BANK_FILTERS })}>
          <X className="h-3.5 w-3.5" />
          Clear filters
        </Button>
      ) : null}
    </div>
  )
}
