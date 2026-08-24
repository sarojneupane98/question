'use client'

import { ArrowRight, Check, Sparkles } from 'lucide-react'

import { useCreatePaper } from '@/components/papers/usePaperNavigation'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Primitives'
import { cn } from '@/lib/cn'
import { computeMarks } from '@/lib/marks'
import { useSettings } from '@/lib/store'
import { TEMPLATES } from '@/lib/templates'
import type { TemplateDefinition } from '@/lib/types'

/**
 * Templates (spec §8).
 *
 * A template is a structural scaffold, not content: it lays out the sections,
 * question types, counts and marks a given exam format demands, so the teacher
 * opens it with "Group A — 11 questions × 1 mark" already adding up to full marks
 * and only has to type the wording.
 *
 * The figures on each card are computed by actually building the paper, so they
 * cannot drift from what the button produces.
 */
export default function TemplatesPage() {
  const createPaper = useCreatePaper()
  const settings = useSettings()

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-white">Templates</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-500 dark:text-ink-400">
          Every template already balances to its full marks. Pick the closest fit — sections,
          question types and marks can all be changed afterwards.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {TEMPLATES.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onUse={() => createPaper(template.id)}
          />
        ))}
      </div>

      <Card>
        <CardHeader
          icon={<Sparkles className="h-4 w-4" />}
          title="What a template does and does not carry"
          description="Worth knowing before you pick one."
        />
        <CardBody className="pt-0">
          <div className="grid gap-4 text-xs leading-relaxed text-ink-600 sm:grid-cols-2 dark:text-ink-300">
            <div>
              <p className="mb-1.5 font-semibold text-ink-800 dark:text-ink-100">Comes with the template</p>
              <ul className="space-y-1">
                <Bullet>Sections, their titles and their notes</Bullet>
                <Bullet>Empty questions of the right type, count and marks</Bullet>
                <Bullet>Full marks, pass marks, time allowed and the exam title</Bullet>
                <Bullet>Standard instructions, which you can edit or delete</Bullet>
                <Bullet>Page layout — margins, font, marks style</Bullet>
              </ul>
            </div>
            <div>
              <p className="mb-1.5 font-semibold text-ink-800 dark:text-ink-100">Comes from your settings</p>
              <ul className="space-y-1">
                <Bullet>
                  School name, address, contact and logo
                  {settings.schoolPreset.name.trim()
                    ? ` — currently “${settings.schoolPreset.name.trim()}”`
                    : ' — not saved yet'}
                </Bullet>
                <Bullet>Class, subject and academic year, which you fill in per paper</Bullet>
              </ul>
              <p className="mt-3 text-[11px] text-ink-400 dark:text-ink-500">
                {/* Blank papers, not templated ones: templates carry their own
                  * layout on purpose, so an SEE-style paper keeps SEE margins. */}
                Your saved default layout applies to blank papers. Templates keep the layout that
                suits their format.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-1.5">
      <Check className="mt-0.5 h-3 w-3 flex-none text-emerald-500" aria-hidden />
      <span>{children}</span>
    </li>
  )
}

function TemplateCard({
  template,
  onUse,
}: {
  template: TemplateDefinition
  onUse: () => void
}) {
  // Built once per render to read its real shape. Cheap — a few dozen objects —
  // and it guarantees the card cannot advertise numbers the template no longer
  // produces.
  const sample = template.create()
  const summary = computeMarks(sample)

  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-lift">
      <div className={cn('h-1.5 w-full bg-gradient-to-r', template.accent)} aria-hidden />

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-ink-900 dark:text-white">{template.name}</h3>
          {template.tag ? (
            <span className="flex-none rounded-md bg-accent-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-700 dark:bg-accent-900 dark:text-accent-200">
              {template.tag}
            </span>
          ) : null}
        </div>

        <p className="mt-1.5 text-xs leading-relaxed text-ink-500 dark:text-ink-400">
          {template.description}
        </p>

        <ul className="mt-3 space-y-1">
          {template.highlights.map((highlight) => (
            <li
              key={highlight}
              className="flex gap-1.5 text-xs text-ink-600 dark:text-ink-300"
            >
              <Check className="mt-0.5 h-3 w-3 flex-none text-emerald-500" aria-hidden />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-ink-50 p-2.5 dark:bg-ink-800">
          <Figure label="Full marks" value={sample.exam.fullMarks} />
          <Figure label="Sections" value={summary.sectionCount} />
          <Figure label="Questions" value={summary.questionCount} />
        </div>

        {/* A mismatch would mean the template ships unbalanced; say so rather
          * than hiding it, since the teacher would hit the warning anyway. */}
        {summary.questionCount > 0 && summary.remaining !== 0 ? (
          <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
            Questions total {summary.total} — {Math.abs(summary.remaining)}{' '}
            {summary.remaining > 0 ? 'short of' : 'over'} full marks.
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <span className="text-[11px] text-ink-400 dark:text-ink-500">
            {sample.exam.timeAllowed || 'No time set'}
            {sample.instructions.length > 0
              ? ` · ${sample.instructions.length} instructions`
              : ''}
          </span>
          <Button size="sm" onClick={onUse}>
            Use template
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  )
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-sm font-bold tabular-nums leading-none text-ink-900 dark:text-white">
        {value}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-ink-400 dark:text-ink-500">
        {label}
      </p>
    </div>
  )
}
