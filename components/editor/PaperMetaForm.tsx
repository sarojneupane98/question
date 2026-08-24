'use client'

import { useId, useRef, useState } from 'react'
import { Building2, GraduationCap, ImagePlus, Trash2, Upload } from 'lucide-react'

import { Button, IconButton } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, Field, Input, NumberInput, Textarea } from '@/components/ui/Primitives'
import { cn } from '@/lib/cn'
import { ACCEPTED_IMAGE_TYPES, LOGO_LIMITS, prepareImageFile } from '@/lib/imageUtils'
import { useAppStore, useCurrentPaper } from '@/lib/store'
import { toast } from '@/lib/toast'

/**
 * School Information + Examination Details (spec §2).
 *
 * Both cards write to the store on every keystroke. There is no Save button
 * because there is nothing to save: the persist middleware writes the paper to
 * localStorage, so a closed tab loses nothing.
 */

/* -------------------------------------------------------------------------- */
/*  Field helpers                                                              */
/* -------------------------------------------------------------------------- */

function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
  required,
  className,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hint?: string
  error?: string
  required?: boolean
  className?: string
}) {
  const id = useId()
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id} required={required} className={className}>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  )
}

function NumField({
  label,
  value,
  onChange,
  min = 0,
  max = 500,
  hint,
  error,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  hint?: string
  error?: string
}) {
  const id = useId()
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <NumberInput id={id} value={value} onValueChange={onChange} min={min} max={max} />
    </Field>
  )
}

/* -------------------------------------------------------------------------- */
/*  Logo                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Exported so Settings can offer the same control for the saved school preset —
 * one downscaling path, one set of accepted formats, one drag-and-drop target.
 */
export function LogoPicker({
  logoDataUrl,
  onPicked,
  onCleared,
}: {
  logoDataUrl: string | null
  onPicked: (dataUrl: string) => void
  onCleared: () => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)

  const accept = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      // Downscaled to at most 400 px before it is stored: a 4 MB crest would eat
      // the whole localStorage quota and make every export slower.
      onPicked(await prepareImageFile(file, LOGO_LIMITS))
    } catch {
      toast.error('That logo could not be used', 'Try a PNG, JPEG, WebP or SVG file.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        void accept(event.dataTransfer.files?.[0])
      }}
      className={cn(
        'flex items-center gap-3 rounded-xl border border-dashed px-3 py-3 transition-colors',
        dragging
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40'
          : 'border-ink-300 dark:border-ink-600',
      )}
    >
      {logoDataUrl ? (
        <span className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-lg border border-ink-200 bg-white p-1 dark:border-ink-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoDataUrl} alt="School logo" className="max-h-full max-w-full object-contain" />
        </span>
      ) : (
        <span className="flex h-16 w-16 flex-none items-center justify-center rounded-lg bg-ink-100 text-ink-400 dark:bg-ink-800">
          <ImagePlus className="h-6 w-6" />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-ink-700 dark:text-ink-200">School logo</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-ink-400">
          Drop an image here or browse. Stored inside the paper, so it travels with exports and
          backups.
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          <Button size="xs" variant="subtle" loading={busy} onClick={() => inputRef.current?.click()}>
            {busy ? null : <Upload className="h-3.5 w-3.5" />}
            {logoDataUrl ? 'Replace' : 'Choose file'}
          </Button>
          {logoDataUrl ? (
            <IconButton label="Remove logo" onClick={onCleared}>
              <Trash2 className="h-3.5 w-3.5" />
            </IconButton>
          ) : null}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        className="hidden"
        onChange={(event) => void accept(event.target.files?.[0])}
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Cards                                                                      */
/* -------------------------------------------------------------------------- */

export function SchoolInfoCard() {
  const paper = useCurrentPaper()
  const updateSchool = useAppStore((s) => s.updateSchool)
  const updateLayout = useAppStore((s) => s.updateLayout)
  const applySchoolPreset = useAppStore((s) => s.applySchoolPreset)
  const saveSchoolPreset = useAppStore((s) => s.saveSchoolPreset)

  if (!paper) return null
  const { school } = paper
  const logoHidden = Boolean(school.logoDataUrl) && !paper.layout.showLogo

  return (
    <Card>
      <CardHeader
        title="School information"
        description="Printed at the top of every page of the paper."
        icon={<Building2 className="h-4 w-4" />}
        actions={
          <>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                applySchoolPreset()
                toast.success('Saved school details applied')
              }}
              title="Fill these fields from the school saved in Settings"
            >
              Use saved
            </Button>
            <Button
              size="xs"
              variant="subtle"
              onClick={() => {
                saveSchoolPreset()
                toast.success('Saved as your default school', 'New papers will start with these details.')
              }}
            >
              Save as default
            </Button>
          </>
        }
      />
      <CardBody className="space-y-3">
        <LogoPicker
          logoDataUrl={school.logoDataUrl}
          onPicked={(logoDataUrl) => updateSchool({ logoDataUrl })}
          onCleared={() => updateSchool({ logoDataUrl: null })}
        />

        {logoHidden ? (
          <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
            The logo is switched off in the layout panel, so it will not print.
            <button
              type="button"
              onClick={() => updateLayout({ showLogo: true })}
              className="font-semibold underline decoration-dotted underline-offset-2"
            >
              Show it
            </button>
          </p>
        ) : null}

        <TextField
          label="School name"
          required
          value={school.name}
          onChange={(name) => updateSchool({ name })}
          placeholder="Everest Model Secondary School"
        />
        <TextField
          label="Affiliation or motto"
          value={school.affiliation}
          onChange={(affiliation) => updateSchool({ affiliation })}
          placeholder="Affiliated to NEB"
          hint="Printed small, directly under the school name."
        />

        <Field label="Address">
          <Textarea
            rows={2}
            value={school.address}
            onChange={(event) => updateSchool({ address: event.target.value })}
            placeholder="Baneshwor, Kathmandu, Nepal"
          />
        </Field>

        <TextField
          label="Contact"
          value={school.contact}
          onChange={(contact) => updateSchool({ contact })}
          placeholder="Tel: 01-4567890  |  info@school.edu.np"
        />
      </CardBody>
    </Card>
  )
}

export function ExamDetailsCard() {
  const paper = useCurrentPaper()
  const updateExam = useAppStore((s) => s.updateExam)
  const updatePaper = useAppStore((s) => s.updatePaper)

  if (!paper) return null
  const { exam } = paper

  // A warning, not a block: some schools genuinely print a pass mark scheme that
  // does not relate to this paper's total.
  const passTooHigh = exam.passMarks > exam.fullMarks && exam.fullMarks > 0

  return (
    <Card>
      <CardHeader
        title="Examination details"
        description="The heading block, marks and timing."
        icon={<GraduationCap className="h-4 w-4" />}
      />
      <CardBody className="space-y-3">
        <TextField
          label="Paper name"
          value={paper.name}
          onChange={(name) => updatePaper({ name })}
          placeholder="Class 10 Science — First Terminal"
          hint="Used in My Question Papers. Not printed on the paper."
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Examination title"
            className="sm:col-span-2"
            value={exam.title}
            onChange={(title) => updateExam({ title })}
            placeholder="First Terminal Examination"
          />
          <TextField
            label="Academic year"
            value={exam.academicYear}
            onChange={(academicYear) => updateExam({ academicYear })}
            placeholder="2081 (2024/25)"
          />
          <TextField
            label="Class / Grade"
            value={exam.className}
            onChange={(className) => updateExam({ className })}
            placeholder="Grade 10"
          />
          <TextField
            label="Subject"
            value={exam.subject}
            onChange={(subject) => updateExam({ subject })}
            placeholder="Science"
          />
          <TextField
            label="Subject code"
            value={exam.subjectCode}
            onChange={(subjectCode) => updateExam({ subjectCode })}
            placeholder="SCI-101"
          />
          <NumField
            label="Full marks"
            value={exam.fullMarks}
            onChange={(fullMarks) => updateExam({ fullMarks })}
            hint="The marks meter counts against this."
          />
          <NumField
            label="Pass marks"
            value={exam.passMarks}
            onChange={(passMarks) => updateExam({ passMarks })}
            error={passTooHigh ? 'Higher than full marks.' : undefined}
          />
          <TextField
            label="Time allowed"
            value={exam.timeAllowed}
            onChange={(timeAllowed) => updateExam({ timeAllowed })}
            placeholder="2 hrs 15 mins"
          />
          <TextField
            label="Exam date"
            value={exam.examDate}
            onChange={(examDate) => updateExam({ examDate })}
            placeholder="2081-04-15 (30 July 2024)"
          />
          <TextField
            label="Set"
            className="sm:col-span-2"
            value={exam.set}
            onChange={(set) => updateExam({ set })}
            placeholder="Set A"
            hint="Leave empty to hide it from the header."
          />
        </div>
      </CardBody>
    </Card>
  )
}

export function PaperMetaForm({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      <SchoolInfoCard />
      <ExamDetailsCard />
    </div>
  )
}
