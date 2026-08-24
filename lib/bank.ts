import { htmlToPlainText } from './html'
import type { BankEntry, BankFilters } from './types'

/**
 * Searching and filtering the question bank (spec §8).
 *
 * Both the Question Bank page and the "insert from bank" dialog inside the editor
 * run through these functions, so a filter combination that finds a question in
 * one place finds it in the other.
 */

export const EMPTY_BANK_FILTERS: BankFilters = {
  search: '',
  subject: '',
  className: '',
  chapter: '',
  difficulty: 'all',
  type: 'all',
}

/** Distinct values for the filter dropdowns, in alphabetical order. */
export function bankFacets(entries: BankEntry[]): {
  subjects: string[]
  classNames: string[]
  chapters: string[]
} {
  const subjects = new Set<string>()
  const classNames = new Set<string>()
  const chapters = new Set<string>()
  entries.forEach((entry) => {
    if (entry.subject) subjects.add(entry.subject)
    if (entry.className) classNames.add(entry.className)
    if (entry.chapter) chapters.add(entry.chapter)
  })
  const sort = (set: Set<string>) => Array.from(set).sort((a, b) => a.localeCompare(b))
  return { subjects: sort(subjects), classNames: sort(classNames), chapters: sort(chapters) }
}

/**
 * The haystack one entry is searched against.
 *
 * The question stem is rich text, so it is flattened first — otherwise a search
 * for "force" would also match the word inside a tag attribute, and a search for
 * "p" would match every paragraph in the bank.
 */
function haystack(entry: BankEntry): string {
  return [
    htmlToPlainText(entry.question.html),
    entry.subject,
    entry.className,
    entry.chapter,
    entry.question.meta.tags.join(' '),
    // MCQ options are part of the question a teacher remembers, so they are
    // searchable too.
    entry.question.options.map((option) => htmlToPlainText(option.html)).join(' '),
  ]
    .join(' ')
    .toLowerCase()
}

export function filterBankEntries(entries: BankEntry[], filters: BankFilters): BankEntry[] {
  // Every term must appear somewhere, in any order: "force grade10" finds a
  // question about force filed under Grade 10.
  const terms = filters.search.trim().toLowerCase().split(/\s+/).filter(Boolean)

  return entries.filter((entry) => {
    if (filters.subject && entry.subject !== filters.subject) return false
    if (filters.className && entry.className !== filters.className) return false
    if (filters.chapter && entry.chapter !== filters.chapter) return false
    if (filters.difficulty !== 'all' && entry.difficulty !== filters.difficulty) return false
    if (filters.type !== 'all' && entry.question.type !== filters.type) return false
    if (terms.length === 0) return true
    const text = haystack(entry)
    return terms.every((term) => text.includes(term))
  })
}

export type BankSort = 'recent' | 'used' | 'marks'

export const BANK_SORT_OPTIONS: Array<{ value: BankSort; label: string }> = [
  { value: 'recent', label: 'Newest first' },
  { value: 'used', label: 'Most used' },
  { value: 'marks', label: 'Marks: high to low' },
]

/** Returns a new array; never sorts the store's own list in place. */
export function sortBankEntries(entries: BankEntry[], sort: BankSort): BankEntry[] {
  const next = entries.slice()
  switch (sort) {
    case 'used':
      return next.sort(
        (a, b) => b.usageCount - a.usageCount || b.createdAt.localeCompare(a.createdAt),
      )
    case 'marks':
      return next.sort(
        (a, b) => b.question.marks - a.question.marks || b.createdAt.localeCompare(a.createdAt),
      )
    case 'recent':
    default:
      return next.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
}

/** True when anything is narrowing the list — drives the "Clear filters" button. */
export function hasActiveFilters(filters: BankFilters): boolean {
  return (
    filters.search.trim() !== '' ||
    filters.subject !== '' ||
    filters.className !== '' ||
    filters.chapter !== '' ||
    filters.difficulty !== 'all' ||
    filters.type !== 'all'
  )
}
