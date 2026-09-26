'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  LayoutTemplate,
  PenLine,
  Plus,
} from 'lucide-react'

import { useCreatePaper, useLoadExample, useOpenPaper } from '@/components/papers/usePaperNavigation'
import { Button } from '@/components/ui/Button'
import { Badge, Card, CardBody, CardHeader } from '@/components/ui/Primitives'
import { cn } from '@/lib/cn'
import { relativeTime } from '@/lib/ids'
import { computeMarks, describeMarksStatus } from '@/lib/marks'
import { TEMPLATES } from '@/lib/templates'
import { useAppStore, useCurrentPaper, useSettings } from '@/lib/store'
import type { Paper } from '@/lib/types'

/**
 * The overview page.
 *
 * There is one thing a teacher comes here to do — get a question paper started
 * or finished — so the page has exactly one primary button, and everything else
 * is either the paper they were already writing or a short list of the ones they
 * wrote before.
 *
 * WHAT IS DELIBERATELY NOT HERE
 * -----------------------------
 * Counters. An earlier version opened with four large numbers: papers, questions
 * written, bank size, and "Templates: 6" — which was simply the length of a
 * hard-coded array dressed up as a statistic. None of them told a teacher
 * anything they could act on, and the first thing a new user saw was four
 * zeroes. Counts that matter are next to the thing they count: the sidebar
 * carries the paper and bank totals, and each row below shows its own.
 */

const TONE_BAR: Record<string, string> = {
  neutral: 'bg-ink-300 dark:bg-ink-600',
  good: 'bg-emerald-500',
  warn: 'bg-amber-500',
  bad: 'bg-rose-500',
}

const TONE_TEXT: Record<string, string> = {
  neutral: 'text-ink-500 dark:text-ink-400',
  good: 'text-emerald-600 dark:text-emerald-400',
  warn: 'text-amber-600 dark:text-amber-400',
  bad: 'text-rose-600 dark:text-rose-400',
}

export default function DashboardPage() {
  const papers = useAppStore((state) => state.papers)
  const settings = useSettings()
  const current = useCurrentPaper()
  const openPaper = useOpenPaper()
  const createPaper = useCreatePaper()
  const loadExample = useLoadExample()

  // Newest edit first. `papers` is not sorted by the store — `newPaper` prepends
  // but `updatePaper` leaves position alone — so sort on a copy here.
  const recent = useMemo(
    () =>
      [...papers]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .filter((paper) => paper.id !== current?.id)
        .slice(0, 5),
    [papers, current?.id],
  )

  const summary = current ? computeMarks(current) : null
  const status = summary ? describeMarksStatus(summary) : null
  const firstName = settings.teacherName.trim().split(/\s+/)[0]
  const isFirstVisit = papers.length === 0

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-5 sm:p-8">
      {/* ------------------------------------------------------------ header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-white">
          {firstName ? `Welcome back, ${firstName}.` : 'Question papers'}
        </h2>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          {isFirstVisit
            ? 'Write a question paper, see it laid out on A4 as you type, then download it as a PDF or a Word file.'
            : 'Carry on with the paper you were writing, or start a new one.'}
        </p>
      </div>

      {/* --------------------------------------------------- primary action */}
      <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card dark:border-ink-700 dark:bg-ink-900">
        <Button size="lg" className="w-full sm:w-auto" onClick={() => createPaper(null)}>
          <Plus className="h-4.5 w-4.5" />
          Create question paper
        </Button>
        <p className="mt-3 text-xs leading-relaxed text-ink-500 dark:text-ink-400">
          Starts a blank paper using your school details.{' '}
          {isFirstVisit ? (
            <>
              Never made one before?{' '}
              <button
                type="button"
                onClick={loadExample}
                className="font-semibold text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
              >
                See an example paper
              </button>{' '}
              — it is a finished Class 8 Science paper you can change or delete.
            </>
          ) : (
            <>
              To start with the sections already laid out, pick a{' '}
              <Link
                href="/templates"
                className="font-semibold text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
              >
                ready-made exam format
              </Link>
              .
            </>
          )}
        </p>
      </div>

      {/* ------------------------------------------------- continue editing */}
      {current && summary && status ? (
        <Card>
          <CardHeader
            icon={<PenLine className="h-4 w-4" />}
            title="Carry on writing"
            description={`Last saved ${relativeTime(current.updatedAt)}`}
            actions={
              <Button size="sm" onClick={() => openPaper(current.id)}>
                Open
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            }
          />
          <CardBody className="space-y-4">
            <div>
              <p className="flex items-center gap-2 truncate text-base font-semibold text-ink-900 dark:text-white">
                <span className="truncate">{current.name || 'Untitled question paper'}</span>
                {current.isExample ? <Badge tone="neutral">Example</Badge> : null}
              </p>
              <p className="mt-0.5 truncate text-xs text-ink-500 dark:text-ink-400">
                {[current.exam.title, current.exam.className, current.exam.subject]
                  .filter(Boolean)
                  .join(' · ') || 'No exam details filled in yet'}
              </p>
            </div>

            {/* The same numbers the editor's marks meter shows, so the two can
              * never tell the teacher different things. */}
            <div>
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className={cn('text-xs font-semibold', TONE_TEXT[status.tone])}>
                  {status.title}
                </span>
                <span className="text-xs tabular-nums text-ink-500 dark:text-ink-400">
                  {summary.total} of {summary.fullMarks} marks
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                <div
                  className={cn('h-full rounded-full transition-all', TONE_BAR[status.tone])}
                  style={{ width: `${Math.round(summary.ratio * 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-ink-400 dark:text-ink-500">{status.detail}</p>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {/* ------------------------------------------------------ recent list */}
      {recent.length > 0 ? (
        <Card>
          <CardHeader
            icon={<CalendarDays className="h-4 w-4" />}
            title="Your other papers"
            description="Click one to open it."
            actions={
              papers.length > recent.length + (current ? 1 : 0) ? (
                <Link
                  href="/papers"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
                >
                  See all {papers.length}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              ) : null
            }
          />
          <CardBody className="pt-0">
            <ul className="space-y-1">
              {recent.map((paper) => (
                <RecentRow key={paper.id} paper={paper} onOpen={() => openPaper(paper.id)} />
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      {/* ---------------------------------------------------------- formats */}
      <Card>
        <CardHeader
          icon={<LayoutTemplate className="h-4 w-4" />}
          title="Ready-made exam formats"
          description="Sections, question types and marks already laid out — you only type the questions."
          actions={
            <Link
              href="/templates"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              See all {TEMPLATES.length}
              <ArrowRight className="h-3 w-3" />
            </Link>
          }
        />
        <CardBody className="pt-0">
          <div className="grid gap-2 sm:grid-cols-3">
            {TEMPLATES.slice(0, 3).map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => createPaper(template.id)}
                className="group flex flex-col items-start gap-1 rounded-xl border border-ink-200 p-3 text-left transition-colors hover:border-brand-400 hover:bg-brand-50/50 dark:border-ink-700 dark:hover:border-brand-600 dark:hover:bg-brand-950/30"
              >
                <span className={cn('h-1 w-8 rounded-full bg-gradient-to-r', template.accent)} />
                <span className="mt-0.5 text-sm font-semibold text-ink-900 dark:text-white">
                  {template.name}
                </span>
                <span className="text-xs leading-relaxed text-ink-500 dark:text-ink-400">
                  {template.description}
                </span>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* An example is worth offering at any time, but only shouts about itself
        * on a first visit — above, inside the primary card. */}
      {isFirstVisit ? null : (
        <button
          type="button"
          onClick={loadExample}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 transition-colors hover:text-brand-600 dark:text-ink-400 dark:hover:text-brand-400"
        >
          <BookOpen className="h-3.5 w-3.5" />
          See an example paper
        </button>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function RecentRow({ paper, onOpen }: { paper: Paper; onOpen: () => void }) {
  const questions = paper.sections.reduce((sum, section) => sum + section.questions.length, 0)
  const marks = paper.sections.reduce(
    (sum, section) => sum + section.questions.reduce((n, q) => n + q.marks, 0),
    0,
  )

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-ink-100 dark:hover:bg-ink-800"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-ink-800 dark:text-ink-100">
              {paper.name || 'Untitled question paper'}
            </span>
            {paper.isExample ? <Badge tone="neutral">Example</Badge> : null}
          </span>
          <span className="block truncate text-[11px] text-ink-400 dark:text-ink-500">
            {questions} question{questions === 1 ? '' : 's'} · {marks} marks · edited{' '}
            {relativeTime(paper.updatedAt)}
          </span>
        </span>
        <ArrowRight className="h-3.5 w-3.5 flex-none text-ink-300 dark:text-ink-600" />
      </button>
    </li>
  )
}
