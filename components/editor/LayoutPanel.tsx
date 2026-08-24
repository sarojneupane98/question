'use client'

import {
  AlignLeft,
  Eye,
  KeyRound,
  LayoutTemplate,
  RotateCcw,
  Ruler,
  Save,
  Type,
} from 'lucide-react'

import { Button, IconButton } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, Divider, Field, Input, NumberInput, Segmented, Select, Toggle } from '@/components/ui/Primitives'
import { cn } from '@/lib/cn'
import { HEADER_STYLE_OPTIONS, MARKS_STYLE_OPTIONS } from '@/lib/defaults'
import { MARGIN_PRESETS, PAPER_FONTS, getPageGeometry } from '@/lib/geometry'
import { useAppStore, useCurrentPaper } from '@/lib/store'
import { toast } from '@/lib/toast'
import type { PageMargins, PaperFont, PaperLayout } from '@/lib/types'

/**
 * How the paper is printed (spec §5, §12).
 *
 * Every control here writes straight into `paper.layout`, which is the *only*
 * thing the preview, the PDF rasteriser and the DOCX writer consult for
 * geometry. So there is no "apply" step and no way for the screen and the
 * exports to disagree about a margin.
 */

/* -------------------------------------------------------------------------- */
/*  Slider                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A native range input, deliberately.
 *
 * `accent-brand-600` tints the real control instead of rebuilding it, so it keeps
 * its keyboard behaviour (arrows, Home/End) and its touch target for free.
 */
function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
}: {
  label: string
  value: number
  onChange: (next: number) => void
  min: number
  max: number
  step: number
  format: (value: number) => string
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-ink-600 dark:text-ink-300">{label}</span>
        <span className="text-xs font-semibold tabular-nums text-ink-800 dark:text-ink-100">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-4 w-full cursor-pointer accent-brand-600"
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Panel                                                                      */
/* -------------------------------------------------------------------------- */

export function LayoutPanel({ className }: { className?: string }) {
  const paper = useCurrentPaper()
  const updateLayout = useAppStore((s) => s.updateLayout)
  const resetLayout = useAppStore((s) => s.resetLayout)
  const applyLayoutPreset = useAppStore((s) => s.applyLayoutPreset)
  const saveLayoutPreset = useAppStore((s) => s.saveLayoutPreset)

  if (!paper) return null

  const { layout } = paper
  const geometry = getPageGeometry(layout)

  const setMargin = (edge: keyof PageMargins, value: number) =>
    updateLayout({ margins: { ...layout.margins, [edge]: value } })

  const marginsMatch = (margins: PageMargins) =>
    margins.top === layout.margins.top &&
    margins.right === layout.margins.right &&
    margins.bottom === layout.margins.bottom &&
    margins.left === layout.margins.left

  return (
    <Card className={className}>
      <CardHeader
        title="Page layout"
        description="Applies to the preview, the PDF and the Word file alike."
        icon={<LayoutTemplate className="h-4 w-4" />}
        actions={
          <IconButton
            label="Reset layout to defaults"
            onClick={() => {
              resetLayout()
              toast.info('Layout reset', 'Back to the default A4 setup. Undo restores your settings.')
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </IconButton>
        }
      />

      <CardBody className="space-y-5">
        {/* ---- header style ---------------------------------------------- */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-ink-600 dark:text-ink-300">Header style</p>
          <div className="grid grid-cols-2 gap-2">
            {HEADER_STYLE_OPTIONS.map((option) => {
              const active = layout.headerStyle === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => updateLayout({ headerStyle: option.value })}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-left transition-colors',
                    active
                      ? 'border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-950'
                      : 'border-ink-200 hover:border-ink-300 hover:bg-ink-50 dark:border-ink-700 dark:hover:border-ink-600 dark:hover:bg-ink-800',
                  )}
                >
                  <span
                    className={cn(
                      'block text-xs font-semibold',
                      active
                        ? 'text-brand-700 dark:text-brand-200'
                        : 'text-ink-800 dark:text-ink-100',
                    )}
                  >
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-ink-400">
                    {option.hint}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <Divider />

        {/* ---- typography ------------------------------------------------- */}
        <div className="space-y-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
            <Type className="h-3.5 w-3.5" />
            Typography
          </p>

          <Field
            label="Font"
            hint="Only fonts that ship with Word are offered, so the .docx re-flows the same way."
          >
            <Select
              fieldSize="sm"
              value={layout.font}
              onChange={(event) => updateLayout({ font: event.target.value as PaperFont })}
              options={PAPER_FONTS.map((font) => ({
                value: font.id,
                label: `${font.label} — ${font.hint}`,
              }))}
            />
          </Field>

          <Slider
            label="Text size"
            value={layout.fontSizePt}
            onChange={(fontSizePt) => updateLayout({ fontSizePt })}
            min={8}
            max={16}
            step={0.5}
            format={(value) => `${value} pt`}
          />
          <Slider
            label="Line spacing"
            value={layout.lineHeight}
            onChange={(lineHeight) => updateLayout({ lineHeight })}
            min={1.15}
            max={2}
            step={0.05}
            format={(value) => `${value.toFixed(2)}×`}
          />
          <Slider
            label="Gap between questions"
            value={layout.questionSpacingMm}
            onChange={(questionSpacingMm) => updateLayout({ questionSpacingMm })}
            min={0}
            max={10}
            step={0.5}
            format={(value) => `${value} mm`}
          />
        </div>

        <Divider />

        {/* ---- margins ---------------------------------------------------- */}
        <div className="space-y-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
            <Ruler className="h-3.5 w-3.5" />
            Margins
          </p>

          <div className="flex flex-wrap gap-1.5">
            {MARGIN_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                size="xs"
                variant={marginsMatch(preset.margins) ? 'primary' : 'outline'}
                title={preset.hint}
                onClick={() => updateLayout({ margins: { ...preset.margins } })}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(['top', 'right', 'bottom', 'left'] as const).map((edge) => (
              <Field key={edge} label={edge[0].toUpperCase() + edge.slice(1)}>
                <NumberInput
                  fieldSize="sm"
                  value={layout.margins[edge]}
                  onValueChange={(value) => setMargin(edge, value)}
                  min={5}
                  max={50}
                />
              </Field>
            ))}
          </div>

          {/*
           * The printed text width, spelled out. A teacher tuning the left margin
           * for a binder needs to know how much room is left for the questions —
           * and `getPageGeometry` refuses to go below 60 mm, so this is also where
           * that clamp becomes visible.
           */}
          <p className="text-[11px] text-ink-400">
            Text area {Math.round(geometry.contentWidthMm)} × {Math.round(geometry.contentHeightMm)} mm
            on A4 (210 × 297 mm)
            {layout.showPageNumbers ? ', page numbers included' : ''}.
          </p>
        </div>

        <Divider />

        {/* ---- marks ------------------------------------------------------ */}
        <Field
          label="Marks beside each question"
          hint={MARKS_STYLE_OPTIONS.find((option) => option.value === layout.marksStyle)?.hint}
        >
          <Segmented
            size="sm"
            value={layout.marksStyle}
            onChange={(marksStyle) => updateLayout({ marksStyle })}
            options={MARKS_STYLE_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
              title: option.hint,
            }))}
          />
        </Field>

        <Field label="Closing line" hint="Printed centred at the very end. Leave empty to omit it.">
          <Input
            fieldSize="sm"
            value={layout.endNote}
            placeholder="*** Best of Luck ***"
            onChange={(event) => updateLayout({ endNote: event.target.value })}
          />
        </Field>

        <Divider />

        {/* ---- what to print --------------------------------------------- */}
        <div className="space-y-2.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
            <Eye className="h-3.5 w-3.5" />
            What to print
          </p>

          <Toggle
            checked={layout.showLogo}
            onChange={(showLogo) => updateLayout({ showLogo })}
            label="School logo"
            hint={paper.school.logoDataUrl ? undefined : 'No logo uploaded yet.'}
            disabled={!paper.school.logoDataUrl}
          />
          <Toggle
            checked={layout.showStudentFields}
            onChange={(showStudentFields) => updateLayout({ showStudentFields })}
            label="Name / roll no. / section lines"
          />
          <Toggle
            checked={layout.showInstructions}
            onChange={(showInstructions) => updateLayout({ showInstructions })}
            label="Instructions block"
            hint={
              paper.instructions.length === 0
                ? 'No instructions added yet.'
                : `${paper.instructions.length} instruction${paper.instructions.length === 1 ? '' : 's'}`
            }
          />
          <Toggle
            checked={layout.showSectionDividers}
            onChange={(showSectionDividers) => updateLayout({ showSectionDividers })}
            label="Horizontal rules"
            hint="Under the header and between sections."
          />
          <Toggle
            checked={layout.showPageNumbers}
            onChange={(showPageNumbers) => updateLayout({ showPageNumbers })}
            label="Page numbers"
            hint="“Page 1 of 3” at the foot of every page."
          />
        </div>

        <Divider />

        {/* ---- answer key ------------------------------------------------- */}
        <div className="space-y-2">
          <Toggle
            checked={layout.showAnswerKey}
            onChange={(showAnswerKey) => updateLayout({ showAnswerKey })}
            label="Answer key"
            hint="Prints the correct answer under each objective question."
          />
          {layout.showAnswerKey ? (
            // Loud on purpose: this is the one layout switch that must never be
            // left on by accident, because the mistake is only discovered after
            // the papers are handed out.
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
              <KeyRound className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden />
              <span>
                This is a teacher&rsquo;s copy — answers will appear in the preview, the PDF and the Word
                file. Switch it off before printing the students&rsquo; papers.
              </span>
            </p>
          ) : null}
        </div>

        <Divider />

        {/* ---- presets ---------------------------------------------------- */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              applyLayoutPreset()
              toast.success('Saved layout applied', 'From Settings → default layout.')
            }}
          >
            <AlignLeft className="h-3.5 w-3.5" />
            Use my default
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              saveLayoutPreset()
              // Templates carry their own layout, so only blank papers pick this up.
              toast.success('Saved as your default', 'Blank papers will start with this layout.')
            }}
          >
            <Save className="h-3.5 w-3.5" />
            Save as default
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}
