'use client'

import { AlertTriangle, CheckCircle2, Info, Scale, Wand2 } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Primitives'
import { cn } from '@/lib/cn'
import { computeMarks, describeMarksStatus, marksWord } from '@/lib/marks'
import { useAppStore, useCurrentPaper, useSettings } from '@/lib/store'
import { toast } from '@/lib/toast'
import type { MarksStatusCopy } from '@/lib/marks'

/**
 * The live marks counter (spec §4).
 *
 * Everything here is derived on every render from the paper itself — no running
 * total is ever stored. A cached total is the classic source of a paper that
 * prints "Full Marks: 75" over questions adding up to 71, so the number the
 * teacher sees is recomputed from the same `computeMarks` the preview and both
 * exporters use.
 */

type Tone = MarksStatusCopy['tone']

const TONE_BAR: Record<Tone, string> = {
  neutral: 'bg-ink-300 dark:bg-ink-600',
  good: 'bg-emerald-500',
  warn: 'bg-amber-500',
  bad: 'bg-rose-500',
}

const TONE_STRIP: Record<Tone, string> = {
  neutral: 'bg-ink-50 text-ink-600 dark:bg-ink-800/60 dark:text-ink-300',
  good: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200',
  warn: 'bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200',
  bad: 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200',
}

const TONE_VALUE: Record<Tone, string> = {
  neutral: 'text-ink-900 dark:text-white',
  good: 'text-emerald-600 dark:text-emerald-400',
  warn: 'text-amber-600 dark:text-amber-400',
  bad: 'text-rose-600 dark:text-rose-400',
}

const TONE_ICON: Record<Tone, typeof Info> = {
  neutral: Info,
  good: CheckCircle2,
  warn: AlertTriangle,
  bad: AlertTriangle,
}

function Stat({
  label,
  value,
  suffix,
  valueClass,
}: {
  label: string
  value: number | string
  suffix?: string
  valueClass?: string
}) {
  return (
    <div className="rounded-xl border border-ink-200 bg-ink-50/60 px-3 py-2 dark:border-ink-700 dark:bg-ink-800/40">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{label}</p>
      <p className={cn('mt-0.5 text-xl font-bold tabular-nums leading-tight', valueClass ?? 'text-ink-900 dark:text-white')}>
        {value}
        {suffix ? <span className="ml-1 text-xs font-medium text-ink-400">{suffix}</span> : null}
      </p>
    </div>
  )
}

export function MarksMeter({ className }: { className?: string }) {
  const paper = useCurrentPaper()
  const settings = useSettings()
  const autoBalance = useAppStore((s) => s.autoBalance)

  if (!paper) return null

  const summary = computeMarks(paper)
  const copy = describeMarksStatus(summary)
  const Icon = TONE_ICON[copy.tone]

  // The setting only governs how loudly a mismatch is announced — the numbers
  // themselves are never hidden.
  const loud = settings.showMarksWarnings || copy.tone === 'good'
  const stripTone: Tone = loud ? copy.tone : 'neutral'

  const canBalance = summary.questionCount > 0 && summary.fullMarks > 0
  const percent = Math.round(summary.ratio * 100)

  const runBalance = () => {
    autoBalance()
    toast.success(
      'Marks balanced',
      `${marksWord(summary.fullMarks)} spread across ${summary.questionCount} question${
        summary.questionCount === 1 ? '' : 's'
      }, keeping their relative weight. Undo restores the old marks.`,
    )
  }

  return (
    <Card className={className}>
      <CardHeader
        title="Marks"
        description="Totals update as you type."
        icon={<Scale className="h-4 w-4" />}
        actions={
          <Button
            size="xs"
            variant="subtle"
            onClick={runBalance}
            disabled={!canBalance}
            title={
              canBalance
                ? 'Distribute full marks across every question, keeping their relative weight'
                : 'Add questions and set full marks first'
            }
          >
            <Wand2 className="h-3.5 w-3.5" />
            Auto-balance
          </Button>
        }
      />

      <CardBody className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Full marks" value={summary.fullMarks} />
          <Stat label="Current" value={summary.total} valueClass={TONE_VALUE[loud ? copy.tone : 'neutral']} />
          <Stat
            label={summary.remaining < 0 ? 'Over by' : 'Remaining'}
            value={Math.abs(summary.remaining)}
            valueClass={TONE_VALUE[loud ? copy.tone : 'neutral']}
          />
        </div>

        <div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-ink-200 dark:bg-ink-700"
            role="progressbar"
            aria-valuenow={summary.total}
            aria-valuemin={0}
            aria-valuemax={summary.fullMarks || undefined}
            aria-label="Marks allocated"
          >
            <div
              className={cn('h-full rounded-full transition-[width] duration-300', TONE_BAR[copy.tone])}
              style={{ width: `${summary.status === 'over' ? 100 : percent}%` }}
            />
          </div>
          <p className="mt-1 text-right text-[11px] tabular-nums text-ink-400">
            {summary.fullMarks > 0
              ? `${summary.total} / ${summary.fullMarks} allocated (${percent}%)`
              : 'Set full marks in Examination Details'}
          </p>
        </div>

        <div className={cn('flex items-start gap-2 rounded-xl px-3 py-2', TONE_STRIP[stripTone])}>
          <Icon className="mt-0.5 h-4 w-4 flex-none" aria-hidden />
          <div className="min-w-0">
            <p className="text-xs font-semibold">{copy.title}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed opacity-90">{copy.detail}</p>
          </div>
        </div>

        {summary.perSection.length > 0 ? (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
              By section
            </p>
            <ul className="space-y-1.5">
              {summary.perSection.map((section) => {
                const share = summary.total > 0 ? Math.round((section.marks / summary.total) * 100) : 0
                return (
                  <li key={section.sectionId} className="flex items-center gap-2 text-xs">
                    <span className="min-w-0 flex-1 truncate text-ink-700 dark:text-ink-200">
                      {section.title || 'Untitled section'}
                    </span>
                    <span className="flex-none text-[11px] tabular-nums text-ink-400">
                      {section.questionCount} q
                    </span>
                    <span className="h-1.5 w-14 flex-none overflow-hidden rounded-full bg-ink-200 dark:bg-ink-700">
                      <span
                        className="block h-full rounded-full bg-brand-500"
                        style={{ width: `${share}%` }}
                      />
                    </span>
                    <span className="w-12 flex-none text-right font-semibold tabular-nums text-ink-800 dark:text-ink-100">
                      {section.marks}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
      </CardBody>
    </Card>
  )
}
