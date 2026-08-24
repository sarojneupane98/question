/**
 * Stable-ish unique ids.
 *
 * IMPORTANT: never call `uid()` at module scope in code that also runs on the
 * server (it would produce a different value during SSR than during hydration
 * and React would throw a mismatch). Sample/seed data therefore uses
 * hard-coded literal ids — see `lib/sample.ts`. `uid()` is for user actions and
 * for template `create()` factories, which only ever run in the browser.
 */

let counter = 0

export function uid(prefix = 'id'): string {
  counter += 1
  let rand: string
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    rand = crypto.randomUUID().replace(/-/g, '').slice(0, 10)
  } else {
    rand = Math.random().toString(36).slice(2, 12)
  }
  return `${prefix}_${counter.toString(36)}${rand}`
}

export function nowIso(): string {
  return new Date().toISOString()
}

/** "22 Aug 2026, 4:05 pm" — locale-stable enough for a card subtitle. */
export function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const diff = Date.now() - then
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  return formatTimestamp(iso)
}

/** Deep clone that is safe for our JSON-only data model. */
export function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value)
    } catch {
      /* fall through to JSON */
    }
  }
  return JSON.parse(JSON.stringify(value)) as T
}

/** Filename-safe slug for export filenames. */
export function slugify(input: string, fallback = 'question-paper'): string {
  const slug = input
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
  return slug.length ? slug : fallback
}
