'use client'

import { useState } from 'react'
import { FileDown, FileText, MoreHorizontal, Printer, Save } from 'lucide-react'

import { Button, IconButton } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Primitives'
import { usePopover } from '@/components/ui/usePopover'
import { cn } from '@/lib/cn'
import { downloadPaperDocx } from '@/lib/export/docx'
import { downloadPaperPdf, printPaper } from '@/lib/export/pdf'
import { exportPaperJson } from '@/lib/fileIO'
import { useCurrentPaper } from '@/lib/store'
import { toast } from '@/lib/toast'

/**
 * The export controls (spec §7).
 *
 * This component only makes sense where the live preview is mounted: the PDF
 * route rasterises the very sheets on screen and the print route hands them to
 * the browser, so both need them in the DOM. That is why "My Question Papers"
 * opens a paper in the editor instead of exporting from the list — an export
 * button there would have nothing to capture.
 *
 * DOCX has no such requirement (it is built from the same `PaperBlock[]` the
 * preview is built from, not from the DOM), but it lives here so all three
 * outputs sit together.
 */

type Busy = 'pdf' | 'docx' | 'json' | null

/** Standard is plenty for text; High matters when a question contains a photo. */
type Quality = 'standard' | 'high'

const QUALITY: Record<Quality, { scale: number; format: 'JPEG' | 'PNG' }> = {
  standard: { scale: 2, format: 'JPEG' },
  high: { scale: 3, format: 'PNG' },
}

function describe(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'Something went wrong. Try again, or use Print → Save as PDF.'
}

export function ExportBar({
  pageCount,
  className,
}: {
  /** From `PaperPreview.onPageCountChange`. 0 until the first measure lands. */
  pageCount?: number
  className?: string
}) {
  const paper = useCurrentPaper()
  const [busy, setBusy] = useState<Busy>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [quality, setQuality] = useState<Quality>('standard')
  const { open, setOpen, ref } = usePopover()

  if (!paper) return null

  // The preview reports 0 until the measuring pass finishes; capturing then would
  // produce an empty or half-laid-out sheet.
  const ready = (pageCount ?? 0) > 0

  const runPdf = async () => {
    setBusy('pdf')
    setProgress({ done: 0, total: pageCount ?? 1 })
    try {
      const name = await downloadPaperPdf(paper, {
        ...QUALITY[quality],
        onProgress: (done, total) => setProgress({ done, total }),
      })
      toast.success('PDF downloaded', name)
    } catch (error) {
      toast.error('PDF export failed', describe(error))
    } finally {
      setBusy(null)
      setProgress(null)
    }
  }

  const runDocx = async () => {
    setBusy('docx')
    try {
      const name = await downloadPaperDocx(paper)
      toast.success('Word file downloaded', `${name} — open it in Word to edit.`)
    } catch (error) {
      toast.error('Word export failed', describe(error))
    } finally {
      setBusy(null)
    }
  }

  const runJson = async () => {
    setBusy('json')
    try {
      const name = await exportPaperJson(paper)
      toast.success('Paper saved as a file', `${name} — import it later from My Question Papers.`)
    } catch (error) {
      toast.error('Could not save the file', describe(error))
    } finally {
      setBusy(null)
      setOpen(false)
    }
  }

  const pdfLabel =
    busy === 'pdf' && progress && progress.total > 0
      ? `Page ${progress.done} of ${progress.total}`
      : 'Download PDF'

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Button
        onClick={() => void runPdf()}
        loading={busy === 'pdf'}
        disabled={busy !== null || !ready}
        title={ready ? 'Save an A4 PDF, ready to print' : 'Waiting for the preview to finish laying out'}
      >
        {busy === 'pdf' ? null : <FileDown className="h-4 w-4" />}
        {pdfLabel}
      </Button>

      <Button
        variant="outline"
        onClick={() => void runDocx()}
        loading={busy === 'docx'}
        disabled={busy !== null}
        title="Save an editable Word document"
      >
        {busy === 'docx' ? null : <FileText className="h-4 w-4" />}
        Download Word
      </Button>

      <IconButton
        label="Print or save as PDF"
        variant="outline"
        disabled={busy !== null || !ready}
        onClick={() => printPaper()}
      >
        <Printer className="h-4 w-4" />
      </IconButton>

      <div className="relative" ref={ref}>
        <IconButton
          label="More export options"
          variant="ghost"
          active={open}
          disabled={busy !== null}
          onClick={() => setOpen(!open)}
        >
          <MoreHorizontal className="h-4 w-4" />
        </IconButton>

        {open ? (
          <div className="absolute right-0 top-10 z-40 w-72 animate-slide-down rounded-xl border border-ink-200 bg-white p-3 shadow-lift dark:border-ink-700 dark:bg-ink-900">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
              PDF quality
            </p>
            <Segmented
              size="sm"
              value={quality}
              onChange={setQuality}
              options={[
                { value: 'standard', label: 'Standard', title: '~192 dpi JPEG — small file' },
                { value: 'high', label: 'High', title: '~288 dpi PNG — larger file, sharper images' },
              ]}
            />
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-400">
              {quality === 'standard'
                ? 'Crisp on paper and a small file. Right for text-only papers.'
                : 'Sharper diagrams and photographs, at roughly four times the file size.'}
            </p>

            <div className="my-3 h-px bg-ink-200 dark:bg-ink-700" />

            <button
              type="button"
              onClick={() => void runJson()}
              className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-ink-100 dark:hover:bg-ink-800"
            >
              <Save className="mt-0.5 h-3.5 w-3.5 flex-none text-ink-500" aria-hidden />
              <span>
                <span className="block text-xs font-semibold text-ink-800 dark:text-ink-100">
                  Save as a file (.json)
                </span>
                <span className="block text-[11px] leading-snug text-ink-400">
                  A backup you can import on another computer. Not for printing.
                </span>
              </span>
            </button>

            {/*
             * Worth spelling out: the download route rasterises, the print route
             * does not. A teacher who wants selectable text in the PDF needs to
             * know which button gives it to them.
             */}
            <p className="mt-2 rounded-lg bg-ink-50 px-2 py-1.5 text-[11px] leading-relaxed text-ink-500 dark:bg-ink-800 dark:text-ink-400">
              Print → “Save as PDF” keeps the text selectable and the file smaller.
              Download PDF is one click but stores each page as an image.
            </p>
          </div>
        ) : null}
      </div>

      {ready ? (
        <span className="text-xs text-ink-400">
          {pageCount} page{pageCount === 1 ? '' : 's'}
        </span>
      ) : null}
    </div>
  )
}
