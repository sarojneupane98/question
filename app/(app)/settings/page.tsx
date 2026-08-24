'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Building2,
  Database,
  Download,
  FileUp,
  Loader2,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  UserRound,
} from 'lucide-react'

import { LogoPicker } from '@/components/editor/PaperMetaForm'
import { Button } from '@/components/ui/Button'
import { useConfirm, Modal } from '@/components/ui/Modal'
import {
  Card,
  CardBody,
  CardHeader,
  Divider,
  Field,
  Input,
  NumberInput,
  Textarea,
  Toggle,
} from '@/components/ui/Primitives'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { DEFAULT_LAYOUT, HEADER_STYLE_OPTIONS, MARKS_STYLE_OPTIONS } from '@/lib/defaults'
import {
  IMPORT_ACCEPT,
  exportBackupJson,
  parseBackupJson,
  readFileAsText,
} from '@/lib/fileIO'
import { getFontSpec } from '@/lib/geometry'
import { getStorageFootprint } from '@/lib/storage'
import { useAppStore, useCurrentPaper, usePersistHydrated, useSettings } from '@/lib/store'
import { toast } from '@/lib/toast'

/**
 * Settings (spec §10).
 *
 * Everything here is a *default for future work*, not a property of the paper
 * you happen to have open — which is the one thing that could confuse a teacher,
 * so each section says which way the arrow points and offers the explicit
 * "apply to the paper I have open now" button rather than doing it silently.
 *
 * The theme control is the exception worth calling out: it restyles the
 * dashboard only. The paper preview is deliberately immune to it (spec §9), so
 * dark mode never produces a grey PDF.
 */
export default function SettingsPage() {
  const settings = useSettings()
  const paper = useCurrentPaper()
  const hydrated = usePersistHydrated()
  const paperCount = useAppStore((state) => state.papers.length)

  const updateSettings = useAppStore((state) => state.updateSettings)
  const applySchoolPreset = useAppStore((state) => state.applySchoolPreset)
  const saveSchoolPreset = useAppStore((state) => state.saveSchoolPreset)
  const applyLayoutPreset = useAppStore((state) => state.applyLayoutPreset)
  const saveLayoutPreset = useAppStore((state) => state.saveLayoutPreset)
  const restoreBackup = useAppStore((state) => state.restoreBackup)
  const resetEverything = useAppStore((state) => state.resetEverything)

  const { confirm, dialog } = useConfirm(true)

  const [busy, setBusy] = useState<'backup' | 'restore' | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const preset = settings.schoolPreset
  const layout = settings.layoutPreset
  const patchPreset = (patch: Partial<typeof preset>) =>
    updateSettings({ schoolPreset: { ...preset, ...patch } })

  /* ---------------------------------------------------------------- backup */

  const downloadBackup = async () => {
    setBusy('backup')
    try {
      const { papers, bank } = useAppStore.getState()
      const name = await exportBackupJson({ papers, bank, settings })
      toast.success('Backup saved', `${name} — keep it somewhere safe.`)
    } catch (error) {
      toast.error(
        'Backup failed',
        error instanceof Error && error.message ? error.message : 'Try again.',
      )
    } finally {
      setBusy(null)
    }
  }

  const restore = async (file: File | undefined, mode: 'merge' | 'replace') => {
    if (!file) return
    setBusy('restore')
    try {
      const payload = parseBackupJson(await readFileAsText(file))
      const added = restoreBackup(payload, mode)
      toast.success(
        mode === 'replace' ? 'Library replaced' : 'Backup merged',
        `${added.papers} paper${added.papers === 1 ? '' : 's'} and ${added.bank} bank question${
          added.bank === 1 ? '' : 's'
        } restored.`,
      )
    } catch (error) {
      toast.error(
        'That file could not be restored',
        error instanceof Error && error.message
          ? error.message
          : 'It does not look like a backup this app wrote.',
      )
    } finally {
      setBusy(null)
      // Cleared so choosing the same file again still fires a change event.
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const askRestore = (file: File | undefined) => {
    if (!file) return
    // Not `useConfirm`: that dialog is a yes/no, and this is a genuine three-way
    // choice where the wrong default would quietly bin someone's papers.
    setPendingFile(file)
  }

  const askReset = () =>
    confirm({
      title: 'Start over with the sample papers?',
      message:
        'Every paper, bank question and preference in this browser is discarded, and the three sample papers and sample bank are put back. A backup file you have already downloaded is not affected.',
      confirmLabel: 'Reset everything',
      onConfirm: () => {
        resetEverything()
        toast.info('Reset done', 'The sample papers are back.')
      },
    })

  const footprint = hydrated ? getStorageFootprint() : null
  const headerLabel =
    HEADER_STYLE_OPTIONS.find((option) => option.value === layout.headerStyle)?.label ??
    layout.headerStyle
  const marksLabel =
    MARKS_STYLE_OPTIONS.find((option) => option.value === layout.marksStyle)?.label ??
    layout.marksStyle

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-5 sm:p-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-white">Settings</h2>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Defaults for the papers you make from here on. Nothing here changes a paper you have
          already written unless you ask it to.
        </p>
      </div>

      {/* ----------------------------------------------------------- theme */}
      <Card>
        <CardHeader
          icon={<Palette className="h-4 w-4" />}
          title="Appearance"
          description="How the dashboard looks. The paper itself is always white."
        />
        <CardBody className="space-y-4 pt-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-800 dark:text-ink-100">Colour theme</p>
              <p className="mt-0.5 text-xs text-ink-400 dark:text-ink-500">
                “System” follows whatever your computer is set to.
              </p>
            </div>
            <ThemeToggle />
          </div>

          <p className="rounded-lg bg-ink-50 px-3 py-2 text-[11px] leading-relaxed text-ink-500 dark:bg-ink-800 dark:text-ink-400">
            Dark mode is for your eyes, not for the printer. The A4 preview, the PDF and the Word
            file stay black-on-white whichever theme you pick.
          </p>

          <Divider />

          <Field
            label="Preview zoom"
            hint="How large the A4 sheet appears in the editor. It has no effect on what prints."
          >
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0.5}
                max={1.6}
                step={0.05}
                value={settings.previewZoom}
                onChange={(event) =>
                  updateSettings({ previewZoom: Number(event.target.value) })
                }
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-ink-200 accent-brand-600 dark:bg-ink-700"
                aria-label="Preview zoom"
              />
              <span className="w-14 flex-none text-right text-sm font-semibold tabular-nums text-ink-700 dark:text-ink-200">
                {Math.round(settings.previewZoom * 100)}%
              </span>
            </div>
          </Field>
        </CardBody>
      </Card>

      {/* ------------------------------------------------------------- you */}
      <Card>
        <CardHeader
          icon={<UserRound className="h-4 w-4" />}
          title="You"
          description="Used to greet you on the dashboard. Never printed on a paper."
        />
        <CardBody className="grid gap-3 pt-0 sm:grid-cols-2">
          <Field label="Your name">
            <Input
              value={settings.teacherName}
              placeholder="Sarita Sharma"
              onChange={(event) => updateSettings({ teacherName: event.target.value })}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={settings.teacherEmail}
              placeholder="sarita@school.edu.np"
              onChange={(event) => updateSettings({ teacherEmail: event.target.value })}
            />
          </Field>
        </CardBody>
      </Card>

      {/* ---------------------------------------------------- school preset */}
      <Card>
        <CardHeader
          icon={<Building2 className="h-4 w-4" />}
          title="Default school"
          description="Filled in automatically on every new paper."
          actions={
            <>
              <Button
                size="xs"
                variant="ghost"
                disabled={!paper}
                title={
                  paper
                    ? 'Overwrite these fields with the school details of the paper you have open'
                    : 'Open a paper first'
                }
                onClick={() => {
                  saveSchoolPreset()
                  toast.success('Copied from the open paper')
                }}
              >
                Copy from open paper
              </Button>
              <Button
                size="xs"
                variant="subtle"
                disabled={!paper}
                title={paper ? 'Write these details into the paper you have open' : 'Open a paper first'}
                onClick={() => {
                  applySchoolPreset()
                  toast.success('Applied to the open paper')
                }}
              >
                Apply to open paper
              </Button>
            </>
          }
        />
        <CardBody className="space-y-3 pt-0">
          <LogoPicker
            logoDataUrl={preset.logoDataUrl}
            onPicked={(logoDataUrl) => patchPreset({ logoDataUrl })}
            onCleared={() => patchPreset({ logoDataUrl: null })}
          />
          <Field label="School name">
            <Input
              value={preset.name}
              placeholder="Step by Step English Secondary School"
              onChange={(event) => patchPreset({ name: event.target.value })}
            />
          </Field>
          <Field label="Affiliation or motto">
            <Input
              value={preset.affiliation}
              placeholder="Affiliated to National Examinations Board"
              onChange={(event) => patchPreset({ affiliation: event.target.value })}
            />
          </Field>
          <Field label="Address">
            <Textarea
              rows={2}
              value={preset.address}
              placeholder="Baneshwor, Kathmandu, Nepal"
              onChange={(event) => patchPreset({ address: event.target.value })}
            />
          </Field>
          <Field label="Contact">
            <Input
              value={preset.contact}
              placeholder="Tel: 01-4567890  •  info@school.edu.np"
              onChange={(event) => patchPreset({ contact: event.target.value })}
            />
          </Field>
        </CardBody>
      </Card>

      {/* ---------------------------------------------------- layout preset */}
      <Card>
        <CardHeader
          icon={<SlidersHorizontal className="h-4 w-4" />}
          title="Default page layout"
          description="Applied to blank papers. Templates keep their own layout."
        />
        <CardBody className="space-y-3 pt-0">
          {/* Deliberately not a second layout editor: the real controls live in
            * the editor's Layout panel, beside the preview that shows what they
            * do. This is the saved snapshot of them. */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-ink-50 p-3 text-xs sm:grid-cols-3 dark:bg-ink-800">
            <Summary label="Header" value={headerLabel} />
            <Summary label="Font" value={getFontSpec(layout.font).label} />
            <Summary label="Text size" value={`${layout.fontSizePt} pt`} />
            <Summary label="Line spacing" value={`${layout.lineHeight}×`} />
            <Summary label="Marks" value={marksLabel} />
            <Summary
              label="Margins"
              value={`${layout.margins.top}/${layout.margins.right}/${layout.margins.bottom}/${layout.margins.left} mm`}
            />
          </dl>

          <p className="text-[11px] leading-relaxed text-ink-400 dark:text-ink-500">
            Change a layout in the editor until the preview looks right, then come back and save it
            as your default — or use the buttons below.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="subtle"
              disabled={!paper}
              title={paper ? undefined : 'Open a paper first'}
              onClick={() => {
                saveLayoutPreset()
                toast.success('Saved as your default layout', 'New blank papers will use it.')
              }}
            >
              Save the open paper’s layout as default
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!paper}
              title={paper ? undefined : 'Open a paper first'}
              onClick={() => {
                applyLayoutPreset()
                toast.success('Applied to the open paper')
              }}
            >
              Apply default to open paper
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                updateSettings({
                  layoutPreset: { ...DEFAULT_LAYOUT, margins: { ...DEFAULT_LAYOUT.margins } },
                })
                toast.info('Default layout reset')
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to built-in
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* ------------------------------------------------------ preferences */}
      <Card>
        <CardHeader
          icon={<SlidersHorizontal className="h-4 w-4" />}
          title="While you are writing"
        />
        <CardBody className="space-y-4 pt-0">
          <Toggle
            checked={settings.confirmBeforeDelete}
            onChange={(confirmBeforeDelete) => updateSettings({ confirmBeforeDelete })}
            label="Ask before deleting"
            hint="Applies to questions, sections and whole papers. Undo (Ctrl+Z) covers you either way."
          />
          <Divider />
          <Toggle
            checked={settings.showMarksWarnings}
            onChange={(showMarksWarnings) => updateSettings({ showMarksWarnings })}
            label="Warn when the marks do not add up"
            hint="The amber notice when your questions total more or less than full marks."
          />
          <Divider />
          <Field
            label="Answer lines on new questions"
            hint="Blank ruled lines printed under short and long answer questions. 0 prints none."
          >
            <div className="w-32">
              <NumberInput
                value={settings.defaultAnswerLines}
                onValueChange={(defaultAnswerLines) => updateSettings({ defaultAnswerLines })}
                min={0}
                max={30}
              />
            </div>
          </Field>
        </CardBody>
      </Card>

      {/* ---------------------------------------------------------- storage */}
      <Card>
        <CardHeader
          icon={<Database className="h-4 w-4" />}
          title="Your data"
          description="Everything lives in this browser. Nothing is uploaded anywhere."
        />
        <CardBody className="space-y-4 pt-0">
          <p className="text-xs leading-relaxed text-ink-500 dark:text-ink-400">
            {footprint
              ? `Currently using about ${footprint.readable} of this browser's storage.`
              : 'Reading storage…'}{' '}
            Clearing your browser’s site data would erase it, so download a backup before you switch
            computers or clear your history.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={busy !== null}
              onClick={() => void downloadBackup()}
            >
              {busy === 'backup' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Download a backup
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy !== null}
              onClick={() => fileRef.current?.click()}
            >
              {busy === 'restore' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileUp className="h-3.5 w-3.5" />
              )}
              Restore from a backup
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept={IMPORT_ACCEPT}
              className="hidden"
              onChange={(event) => askRestore(event.target.files?.[0])}
            />
          </div>

          <p className="text-[11px] leading-relaxed text-ink-400 dark:text-ink-500">
            A backup holds every paper, your whole question bank and these settings. To move a single
            paper instead, use “Save as a file” on its card in{' '}
            <Link
              href="/papers"
              className="font-medium underline decoration-dotted underline-offset-2 hover:text-ink-600 dark:hover:text-ink-300"
            >
              My Question Papers
            </Link>
            .
          </p>
        </CardBody>
      </Card>

      {/* ------------------------------------------------------ danger zone */}
      <Card className="border-rose-200 dark:border-rose-900">
        <CardHeader
          icon={<AlertTriangle className="h-4 w-4" />}
          title="Start over"
          description="Puts the app back to how it arrived, sample papers and all."
        />
        <CardBody className="pt-0">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-rose-50 p-3 dark:bg-rose-950/50">
            <p className="min-w-0 text-xs leading-relaxed text-rose-900 dark:text-rose-200">
              This discards all {paperCount} papers and your bank, then restores the three sample
              papers. It cannot be undone from inside the app — download a backup first if you are
              unsure.
            </p>
            <Button size="sm" variant="danger" onClick={askReset}>
              <Trash2 className="h-3.5 w-3.5" />
              Reset everything
            </Button>
          </div>
        </CardBody>
      </Card>

      {dialog}

      {pendingFile ? (
        <Modal
          open
          size="sm"
          onClose={() => {
            setPendingFile(null)
            if (fileRef.current) fileRef.current.value = ''
          }}
          title="Merge, or replace everything?"
          description={pendingFile.name}
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setPendingFile(null)
                  if (fileRef.current) fileRef.current.value = ''
                }}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const file = pendingFile
                  setPendingFile(null)
                  void restore(file, 'merge')
                }}
              >
                Merge
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  const file = pendingFile
                  setPendingFile(null)
                  void restore(file, 'replace')
                }}
              >
                Replace everything
              </Button>
            </>
          }
        >
          <div className="space-y-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
            <p>
              <strong className="font-semibold text-ink-800 dark:text-ink-100">Merge</strong> keeps
              the {paperCount} paper{paperCount === 1 ? '' : 's'} you already have and adds the ones
              from the file.
            </p>
            <p>
              <strong className="font-semibold text-ink-800 dark:text-ink-100">Replace</strong>{' '}
              discards your current library and uses only what is in the file.
            </p>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-ink-400 dark:text-ink-500">{label}</dt>
      <dd className="truncate font-semibold text-ink-800 dark:text-ink-100">{value}</dd>
    </div>
  )
}
