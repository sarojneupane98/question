'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BookMarked,
  CalendarDays,
  FileStack,
  LayoutTemplate,
  ListChecks,
  PenLine,
  Plus,
  Sparkles,
  Target,
} from 'lucide-react'

import { useCreatePaper, useOpenPaper } from '@/components/papers/usePaperNavigation'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, EmptyState } from '@/components/ui/Primitives'
import { cn } from '@/lib/cn'
import { relativeTime } from '@/lib/ids'
import { computeMarks, describeMarksStatus } from '@/lib/marks'
import { TEMPLATES, templateName } from '@/lib/templates'
import { useAppStore, useCurrentPaper, useSettings } from '@/lib/store'
import type { Paper } from '@/lib/types'

/**
 * The overview page.
 *
 * Its job is to get the teacher back to work in one click — so the paper they
 * were last editing gets the largest target on the page, with its live marks
 * total, and everything else is secondary.
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
  const bank = useAppStore((state) => state.bank)
  const settings = useSettings()
  const current = useCurrentPaper()
  const openPaper = useOpenPaper()
  const createPaper = useCreatePaper()

  // Newest edit first. `papers` is not sorted by the store — `newPaper` prepends
  // but `updatePaper` leaves position alone — so sort on a copy here.
  const recent = useMemo(
    () =>
      [...papers]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .filter((paper) => paper.id !== current?.id)
        .slice(0, 4),
    [papers, current?.id],
  )

  const totals = useMemo(() => {
    let questions = 0
    let marks = 0
    for (const paper of papers) {
      for (const section of paper.sections) {
        questions += section.questions.length
        for (const question of section.questions) marks += question.marks
      }
    }
    return { questions, marks }
  }, [papers])

  const summary = current ? computeMarks(current) : null
  const status = summary ? describeMarksStatus(summary) : null
  const firstName = settings.teacherName.trim().split(/\s+/)[0] || 'there'

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
      {/* ------------------------------------------------------------ header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-white">
            Welcome back, {firstName}.
          </h2>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            Pick up where you left off, or start a new paper from a template.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => createPaper(null)}>
            <Plus className="h-4 w-4" />
            Blank paper
          </Button>
          <Link
            href="/templates"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            <LayoutTemplate className="h-4 w-4" />
            Start from a template
          </Link>
        </div>
      </div>

      {/* -------------------------------------------------------------- stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<FileStack className="h-4 w-4" />}
          label="Question papers"
          value={papers.length}
          hint={papers.length === 0 ? 'None yet' : `${totals.marks} marks written in total`}
          href="/papers"
        />
        <StatCard
          icon={<ListChecks className="h-4 w-4" />}
          label="Questions written"
          value={totals.questions}
          hint="Across every saved paper"
          href="/papers"
        />
        <StatCard
          icon={<BookMarked className="h-4 w-4" />}
          label="In your question bank"
          value={bank.length}
          hint={bank.length === 0 ? 'Bank a question to reuse it' : 'Ready to reuse in any paper'}
          href="/bank"
        />
        <StatCard
          icon={<LayoutTemplate className="h-4 w-4" />}
          label="Templates"
          value={TEMPLATES.length}
          hint="Pre-built exam formats"
          href="/templates"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ------------------------------------------------- continue editing */}
        <Card className="lg:col-span-2">
          <CardHeader
            icon={<PenLine className="h-4 w-4" />}
            title="Continue editing"
            description={
              current
                ? `${templateName(current.templateId)} · last saved ${relativeTime(current.updatedAt)}`
                : 'Nothing open at the moment.'
            }
            actions={
              current ? (
                <Button size="sm" onClick={() => openPaper(current.id)}>
                  Open editor
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : null
            }
          />
          <CardBody>
            {current && summary && status ? (
              <div className="space-y-4">
                <div>
                  <p className="truncate text-base font-semibold text-ink-900 dark:text-white">
                    {current.name || 'Untitled question paper'}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-500 dark:text-ink-400">
                    {[
                      current.exam.title,
                      current.exam.className,
                      current.exam.subject,
                      current.school.name,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'No exam details filled in yet'}
                  </p>
                </div>

                {/* The same numbers the editor's marks meter shows, so the two
                  * can never tell the teacher different things. */}
                <div>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className={cn('text-xs font-semibold', TONE_TEXT[status.tone])}>
                      {status.title}
                    </span>
                    <span className="text-xs tabular-nums text-ink-500 dark:text-ink-400">
                      {summary.total} / {summary.fullMarks} marks
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

                <div className="grid grid-cols-3 gap-3 border-t border-ink-200 pt-3 dark:border-ink-700">
                  <MiniStat label="Sections" value={summary.sectionCount} />
                  <MiniStat label="Questions" value={summary.questionCount} />
                  <MiniStat
                    label="Instructions"
                    value={current.instructions.length}
                  />
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<PenLine className="h-5 w-5" />}
                title="No paper open"
                description="Create one from a template and it will appear here with its live marks total."
                action={
                  <Button onClick={() => createPaper('school-exam')}>
                    <Sparkles className="h-4 w-4" />
                    Use School Examination
                  </Button>
                }
              />
            )}
          </CardBody>
        </Card>

        {/* ------------------------------------------------------ recent list */}
        <Card>
          <CardHeader
            icon={<CalendarDays className="h-4 w-4" />}
            title="Recent papers"
            description={
              recent.length > 0 ? 'Click one to open it in the editor.' : 'Your other papers land here.'
            }
          />
          <CardBody className="pt-0">
            {recent.length === 0 ? (
              <p className="rounded-xl border border-dashed border-ink-300 px-4 py-6 text-center text-xs text-ink-400 dark:border-ink-700 dark:text-ink-500">
                No other papers yet.
              </p>
            ) : (
              <ul className="space-y-1">
                {recent.map((paper) => (
                  <RecentRow key={paper.id} paper={paper} onOpen={() => openPaper(paper.id)} />
                ))}
              </ul>
            )}
            <Link
              href="/papers"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              See all {papers.length} paper{papers.length === 1 ? '' : 's'}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </CardBody>
        </Card>
      </div>

      {/* ---------------------------------------------------------- templates */}
      <Card>
        <CardHeader
          icon={<LayoutTemplate className="h-4 w-4" />}
          title="Start from a template"
          description="Sections, question types and marks are laid out for you — just type the questions."
          actions={
            <Link
              href="/templates"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              All templates
              <ArrowRight className="h-3 w-3" />
            </Link>
          }
        />
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATES.slice(0, 3).map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => createPaper(template.id)}
                className="group flex flex-col items-start gap-1.5 rounded-xl border border-ink-200 p-3.5 text-left transition-colors hover:border-brand-400 hover:bg-brand-50/50 dark:border-ink-700 dark:hover:border-brand-600 dark:hover:bg-brand-950/30"
              >
                <span
                  className={cn(
                    'h-1.5 w-10 rounded-full bg-gradient-to-r',
                    template.accent,
                  )}
                />
                <span className="text-sm font-semibold text-ink-900 dark:text-white">
                  {template.name}
                </span>
                <span className="text-xs leading-relaxed text-ink-500 dark:text-ink-400">
                  {template.description}
                </span>
                <span className="mt-auto inline-flex items-center gap-1 pt-2 text-xs font-semibold text-brand-600 dark:text-brand-400">
                  Use this
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function StatCard({
  icon,
  label,
  value,
  hint,
  href,
}: {
  icon: React.ReactNode
  label: string
  value: number
  hint: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-ink-200 bg-white p-4 shadow-card transition-colors hover:border-brand-300 dark:border-ink-700 dark:bg-ink-900 dark:hover:border-brand-700"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
          {icon}
        </span>
        <span className="truncate text-xs font-medium text-ink-500 dark:text-ink-400">{label}</span>
      </div>
      <p className="mt-2.5 text-2xl font-bold tabular-nums text-ink-900 dark:text-white">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-ink-400 dark:text-ink-500">{hint}</p>
    </Link>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-lg font-bold tabular-nums leading-none text-ink-900 dark:text-white">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-ink-400 dark:text-ink-500">{label}</p>
    </div>
  )
}

function RecentRow({ paper, onOpen }: { paper: Paper; onOpen: () => void }) {
  const marks = paper.sections.reduce(
    (sum, section) => sum + section.questions.reduce((n, q) => n + q.marks, 0),
    0,
  )
  const questions = paper.sections.reduce((sum, section) => sum + section.questions.length, 0)

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-ink-100 dark:hover:bg-ink-800"
      >
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400">
          <Target className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink-800 dark:text-ink-100">
            {paper.name || 'Untitled question paper'}
          </span>
          <span className="block truncate text-[11px] text-ink-400 dark:text-ink-500">
            {questions} question{questions === 1 ? '' : 's'} · {marks} marks ·{' '}
            {relativeTime(paper.updatedAt)}
          </span>
        </span>
        <ArrowRight className="h-3.5 w-3.5 flex-none text-ink-300 dark:text-ink-600" />
      </button>
    </li>
  )
}
