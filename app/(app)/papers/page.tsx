'use client'

import { useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  Copy,
  Download,
  FileStack,
  FileUp,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'

import {
  useCreatePaper,
  useDuplicatePaper,
  useOpenPaper,
} from '@/components/papers/usePaperNavigation'
import { Button, IconButton } from '@/components/ui/Button'
import { Modal, useConfirm } from '@/components/ui/Modal'
import { Card, EmptyState, Field, Input, Select } from '@/components/ui/Primitives'
import { cn } from '@/lib/cn'
import { IMPORT_ACCEPT, exportPaperJson, parsePaperJson, readFileAsText } from '@/lib/fileIO'
import { relativeTime } from '@/lib/ids'
import { computeMarks, describeMarksStatus } from '@/lib/marks'
import { useAppStore, useSettings } from '@/lib/store'
import { TEMPLATES, templateName } from '@/lib/templates'
import { toast } from '@/lib/toast'
import type { Paper } from '@/lib/types'

/**
 * My Question Papers (spec §8: load previous papers, duplicate).
 *
 * There is no "save" here and no "unsaved" state to worry about — every edit in
 * the editor is written to this browser as it happens, so this page is purely
 * about finding a paper again and doing something with it.
 *
 * Exports live in the editor rather than on these cards: the PDF is produced by
 * rasterising the on-screen sheets, so it needs the preview mounted. "Save as a
 * file" is offered here because JSON is built from the data alone.
 */

type Sort = 'updated' | 'created' | 'name' | 'marks'

const SORTS: Array<{ value: Sort; label: string }> = [
  { value: 'updated', label: 'Recently edited' },
  { value: 'created', label: 'Recently created' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'marks', label: 'Full marks: high to low' },
]

function paperHaystack(paper: Paper): string {
  return [
    paper.name,
    paper.exam.title,
    paper.exam.subject,
    paper.exam.className,
    paper.exam.academicYear,
    paper.school.name,
    templateName(paper.templateId),
  ]
    .join(' ')
    .toLowerCase()
}

export default function PapersPage() {
  const papers = useAppStore((state) => state.papers)
  const currentPaperId = useAppStore((state) => state.currentPaperId)
  const deletePaper = useAppStore((state) => state.deletePaper)
  const renamePaper = useAppStore((state) => state.renamePaper)
  const importPaper = useAppStore((state) => state.importPaper)
  const settings = useSettings()

  const openPaper = useOpenPaper()
  const createPaper = useCreatePaper()
  const duplicate = useDuplicatePaper()
  const { confirm, dialog } = useConfirm(settings.confirmBeforeDelete)

  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<Sort>('updated')
  const [renaming, setRenaming] = useState<Paper | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const visible = useMemo(() => {
    const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const matched =
      terms.length === 0
        ? papers
        : papers.filter((paper) => {
            const hay = paperHaystack(paper)
            return terms.every((term) => hay.includes(term))
          })

    // Sort a copy: `papers` is store state and mutating it in place would be an
    // invisible write that no subscriber hears about.
    return [...matched].sort((a, b) => {
      switch (sort) {
        case 'created':
          return b.createdAt.localeCompare(a.createdAt)
        case 'name':
          return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
        case 'marks':
          return b.exam.fullMarks - a.exam.fullMarks
        case 'updated':
        default:
          return b.updatedAt.localeCompare(a.updatedAt)
      }
    })
  }, [papers, search, sort])

  const handleImport = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    let added = 0
    const failed: string[] = []

    for (const file of Array.from(files)) {
      try {
        importPaper(parsePaperJson(await readFileAsText(file)))
        added += 1
      } catch (error) {
        failed.push(`${file.name}: ${error instanceof Error ? error.message : 'unreadable'}`)
      }
    }

    if (added > 0) {
      toast.success(
        `${added} paper${added === 1 ? '' : 's'} imported`,
        failed.length > 0 ? `${failed.length} file(s) could not be read.` : 'Open one to start editing.',
      )
    }
    if (failed.length > 0 && added === 0) {
      toast.error('Import failed', failed[0])
    }

    // Same file twice in a row must still fire a change event.
    if (fileRef.current) fileRef.current.value = ''
  }

  const askDelete = (paper: Paper) =>
    confirm({
      title: 'Delete this paper?',
      message: `“${paper.name || 'Untitled question paper'}” and all ${paper.sections.reduce(
        (n, s) => n + s.questions.length,
        0,
      )} of its questions will be removed from this browser. This cannot be undone.`,
      confirmLabel: 'Delete paper',
      onConfirm: () => {
        deletePaper(paper.id)
        toast.info('Paper deleted', 'Nothing else was changed.')
      },
    })

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-white">
            My question papers
          </h2>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            {papers.length} paper{papers.length === 1 ? '' : 's'} saved in this browser. Every edit is
            saved automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={IMPORT_ACCEPT}
            multiple
            className="hidden"
            onChange={(event) => void handleImport(event.target.files)}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <FileUp className="h-4 w-4" />
            Import from file
          </Button>
          <Button onClick={() => createPaper(null)}>
            <Plus className="h-4 w-4" />
            New paper
          </Button>
        </div>
      </div>

      {papers.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
              aria-hidden
            />
            <Input
              fieldSize="sm"
              value={search}
              placeholder="Search by name, subject, class…"
              aria-label="Search your question papers"
              onChange={(event) => setSearch(event.target.value)}
              // Inline padding, not `pl-9`: `cn` has no tailwind-merge, so a
              // second horizontal-padding class would be settled by CSS order.
              style={{ paddingLeft: '2.25rem', paddingRight: search ? '2.25rem' : undefined }}
            />
            {search ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-700 dark:hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          {/* Wrapper carries the width: a class on `Select` would land on the
            * inner element beside its base `w-full`. */}
          <div className="w-52">
            <Select
              fieldSize="sm"
              aria-label="Sort papers"
              value={sort}
              onChange={(event) => setSort(event.target.value as Sort)}
              options={SORTS}
            />
          </div>
        </div>
      ) : null}

      {papers.length === 0 ? (
        <EmptyState
          icon={<FileStack className="h-5 w-5" />}
          title="No question papers yet"
          description="Start from a template and the sections, question types and marks are laid out for you."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => createPaper('school-exam')}>
                <Plus className="h-4 w-4" />
                {TEMPLATES[0]?.name ?? 'New paper'}
              </Button>
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <FileUp className="h-4 w-4" />
                Import a file
              </Button>
            </div>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Search className="h-5 w-5" />}
          title="No papers match that search"
          description="Try a shorter word, or clear the search box."
          action={
            <Button variant="outline" onClick={() => setSearch('')}>
              Clear search
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((paper) => (
            <PaperCard
              key={paper.id}
              paper={paper}
              isCurrent={paper.id === currentPaperId}
              onOpen={() => openPaper(paper.id)}
              onDuplicate={() => duplicate(paper.id)}
              onRename={() => setRenaming(paper)}
              onDelete={() => askDelete(paper)}
            />
          ))}
        </div>
      )}

      {renaming ? (
        <RenameDialog
          paper={renaming}
          onClose={() => setRenaming(null)}
          onSave={(name) => {
            renamePaper(renaming.id, name)
            setRenaming(null)
          }}
        />
      ) : null}

      {dialog}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

const TONE_DOT: Record<string, string> = {
  neutral: 'bg-ink-300 dark:bg-ink-600',
  good: 'bg-emerald-500',
  warn: 'bg-amber-500',
  bad: 'bg-rose-500',
}

function PaperCard({
  paper,
  isCurrent,
  onOpen,
  onDuplicate,
  onRename,
  onDelete,
}: {
  paper: Paper
  isCurrent: boolean
  onOpen: () => void
  onDuplicate: () => void
  onRename: () => void
  onDelete: () => void
}) {
  const [saving, setSaving] = useState(false)
  const summary = computeMarks(paper)
  const status = describeMarksStatus(summary)

  const saveFile = async () => {
    setSaving(true)
    try {
      const name = await exportPaperJson(paper)
      toast.success('Saved as a file', name)
    } catch (error) {
      toast.error(
        'Could not save the file',
        error instanceof Error ? error.message : 'Try again in a moment.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card
      className={cn(
        'flex flex-col transition-shadow hover:shadow-lift',
        isCurrent && 'ring-2 ring-brand-500 ring-offset-2 ring-offset-ink-50 dark:ring-offset-ink-950',
      )}
    >
      <div className="flex items-start gap-2 px-4 pt-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {isCurrent ? (
              <span className="rounded-md bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700 dark:bg-brand-900 dark:text-brand-200">
                Open
              </span>
            ) : null}
            <span className="truncate text-[11px] font-medium text-ink-400 dark:text-ink-500">
              {templateName(paper.templateId)}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpen}
            className="mt-1 block w-full truncate text-left text-base font-semibold text-ink-900 hover:text-brand-700 dark:text-white dark:hover:text-brand-300"
          >
            {paper.name || 'Untitled question paper'}
          </button>
        </div>
        <div className="flex flex-none items-center">
          <IconButton label="Rename" size="xs" onClick={onRename}>
            <Pencil className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label="Duplicate" size="xs" onClick={onDuplicate}>
            <Copy className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            label="Save as a file (.json)"
            size="xs"
            disabled={saving}
            onClick={() => void saveFile()}
          >
            {/* Not `loading`: Button renders its spinner *beside* the children,
              * and an icon-only button has no room for two glyphs. */}
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
          </IconButton>
          <IconButton
            label="Delete"
            size="xs"
            className="text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>

      <div className="mt-2 space-y-2 px-4 text-xs text-ink-500 dark:text-ink-400">
        <p className="truncate">
          {[paper.exam.title, paper.exam.className, paper.exam.subject].filter(Boolean).join(' · ') ||
            'No exam details yet'}
        </p>
        <p className="truncate text-[11px] text-ink-400 dark:text-ink-500">
          {paper.school.name || 'No school name'}
          {paper.exam.academicYear ? ` · ${paper.exam.academicYear}` : ''}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 px-4 text-[11px] text-ink-500 dark:text-ink-400">
        <span className="inline-flex items-center gap-1.5">
          <span className={cn('h-1.5 w-1.5 rounded-full', TONE_DOT[status.tone])} aria-hidden />
          <span className="tabular-nums">
            {summary.total} / {summary.fullMarks} marks
          </span>
        </span>
        <span className="tabular-nums">{summary.questionCount} questions</span>
        <span className="tabular-nums">
          {summary.sectionCount} section{summary.sectionCount === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 px-4 pb-4 pt-3">
        <span className="truncate text-[11px] text-ink-400 dark:text-ink-500">
          Saved {relativeTime(paper.updatedAt)}
        </span>
        <Button size="sm" variant="subtle" onClick={onOpen}>
          Open
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */

function RenameDialog({
  paper,
  onClose,
  onSave,
}: {
  paper: Paper
  onClose: () => void
  onSave: (name: string) => void
}) {
  const [name, setName] = useState(paper.name)
  const trimmed = name.trim()

  const submit = () => {
    if (!trimmed) return
    onSave(trimmed)
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Rename paper"
      description="This name is for your own list — it is never printed on the paper."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!trimmed} onClick={submit}>
            Save name
          </Button>
        </>
      }
    >
      <Field label="Paper name" htmlFor="rename-paper">
        <Input
          id="rename-paper"
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              submit()
            }
          }}
        />
      </Field>
    </Modal>
  )
}
