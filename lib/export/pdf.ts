import { slugify } from '../ids'
import { paperHeadline } from '../paperBlocks'
import { PAPER_STACK_ID, type Paper } from '../types'

/**
 * ============================================================================
 *  PDF export
 * ============================================================================
 *  There are two honest ways to get a PDF out of a browser, and this app ships
 *  both because they fail in opposite directions:
 *
 *  1. `printPaper()` — hands the sheets to the browser's own print engine
 *     ("Save as PDF"). Text stays vector and selectable, fonts are real fonts,
 *     the file is small, and the output is exactly what the browser lays out. The
 *     cost is a print dialog the app cannot skip or configure.
 *
 *  2. `downloadPaperPdf()` — rasterises each A4 sheet with html2canvas and places
 *     the bitmaps into a jsPDF A4 document. One click, no dialog, deterministic
 *     page breaks. The cost is that the text becomes pixels.
 *
 *  Route 2 is the "Download PDF" button because a download is what the spec asks
 *  for; route 1 is offered next to it as "Print / Save as PDF" for teachers who
 *  care about selectable text. Both consume the very same DOM the teacher is
 *  looking at, so neither can disagree with the preview about content.
 *
 *  WHY THE SHEETS ARE CAPTURED ONE AT A TIME
 *  -----------------------------------------
 *  Capturing the whole stack in one canvas and slicing it would put the slice
 *  boundaries wherever the arithmetic landed, cutting through a line of text. Each
 *  sheet is already exactly one page — capturing them individually means a page
 *  break can only ever fall where the paginator put it.
 */

export interface PdfOptions {
  /**
   * Device-pixel multiplier. 2 gives ~192 dpi, which prints cleanly; 3 gives
   * ~288 dpi at roughly twice the memory and file size.
   */
  scale?: number
  /** JPEG is far smaller; PNG is lossless. Both are fine for black-on-white. */
  format?: 'JPEG' | 'PNG'
  /** JPEG only. */
  quality?: number
  /** Called with (pageIndex, total) so the UI can show progress. */
  onProgress?: (done: number, total: number) => void
}

const DEFAULTS: Required<Omit<PdfOptions, 'onProgress'>> = {
  scale: 2,
  format: 'JPEG',
  quality: 0.94,
}

export class PdfExportError extends Error {}

/* -------------------------------------------------------------------------- */
/*  Print route                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Opens the browser's print dialog.
 *
 * All the work is in `@media print` in `globals.css`: chrome is hidden, the shell
 * wrappers become `display: contents`, the zoom transform is reset and each sheet
 * gets `break-before: page`. Nothing needs to change in the DOM, which is why this
 * route cannot drift from the preview.
 */
export function printPaper(): void {
  if (typeof window === 'undefined') return
  window.print()
}

/* -------------------------------------------------------------------------- */
/*  Raster route                                                              */
/* -------------------------------------------------------------------------- */

function sheetElements(): HTMLElement[] {
  const stack = document.getElementById(PAPER_STACK_ID)
  if (!stack) {
    throw new PdfExportError(
      'The paper preview is not on screen. Open the paper in the editor and try again.',
    )
  }
  const sheets = Array.from(stack.querySelectorAll<HTMLElement>('[data-paper-sheet]'))
  if (sheets.length === 0) {
    throw new PdfExportError('The paper has no pages to export yet.')
  }
  return sheets
}

/**
 * Runs `fn` with the on-screen zoom transform removed.
 *
 * html2canvas reads the element's own computed transform, so a preview zoomed to
 * 70% would export a 70%-size bitmap onto a full A4 page. The wrappers that carry
 * the transform are tagged `print-zoom-reset` (the same ones the print stylesheet
 * neutralises), so the fix is to blank their inline transform for the duration of
 * the capture and put it back afterwards — including if the capture throws.
 */
async function withNeutralZoom<T>(fn: () => Promise<T>): Promise<T> {
  const stack = document.getElementById(PAPER_STACK_ID)
  const root = stack?.closest('.print-root')
  const wrappers = root
    ? Array.from(root.querySelectorAll<HTMLElement>('.print-zoom-reset'))
    : []

  const saved = wrappers.map((node) => ({
    node,
    transform: node.style.transform,
    width: node.style.width,
    height: node.style.height,
  }))

  wrappers.forEach((node) => {
    node.style.transform = 'none'
    node.style.width = 'auto'
    node.style.height = 'auto'
  })

  try {
    return await fn()
  } finally {
    saved.forEach((entry) => {
      entry.node.style.transform = entry.transform
      entry.node.style.width = entry.width
      entry.node.style.height = entry.height
    })
  }
}

/**
 * Builds the PDF.
 *
 * jsPDF and html2canvas are imported dynamically: together they are well over
 * half a megabyte of JavaScript that only matters at the moment someone clicks
 * Download, and neither one can run during server rendering.
 */
export async function buildPaperPdf(paper: Paper, options: PdfOptions = {}) {
  const { scale, format, quality } = { ...DEFAULTS, ...options }
  const { onProgress } = options

  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ])

  // Webfonts that are still loading would rasterise as fallback glyphs, changing
  // line breaks between the preview and the PDF.
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready
    } catch {
      /* not fatal */
    }
  }

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
  pdf.setProperties({
    title: paper.name,
    subject: paperHeadline(paper),
    author: paper.school.name,
    creator: 'Question Paper Generator',
  })

  await withNeutralZoom(async () => {
    const sheets = sheetElements()

    for (let index = 0; index < sheets.length; index += 1) {
      const sheet = sheets[index]

      const canvas = await html2canvas(sheet, {
        scale,
        useCORS: true,
        // Images are always data URLs, so nothing needs to taint the canvas.
        allowTaint: false,
        logging: false,
        // The sheet is white; leaving this transparent would produce black
        // backgrounds once the bitmap is flattened into JPEG.
        backgroundColor: '#ffffff',
        // html2canvas 1.4 cannot parse oklch()/lab()/color-mix(). Nothing inside
        // `.paper-sheet` uses them — the paper renderers are restricted to hex —
        // but the shell's theme tokens do, which is another reason to capture the
        // sheet rather than any of its ancestors.
        onclone: (doc) => {
          doc.querySelectorAll('.no-print').forEach((node) => node.remove())
        },
      })

      if (index > 0) pdf.addPage('a4', 'portrait')

      const dataUrl =
        format === 'JPEG' ? canvas.toDataURL('image/jpeg', quality) : canvas.toDataURL('image/png')

      // The sheet element is exactly 210mm x 297mm, so the bitmap fills the page
      // edge to edge with no scaling decision to get wrong. The margins the
      // teacher chose are already painted inside the bitmap.
      pdf.addImage(dataUrl, format, 0, 0, 210, 297, undefined, 'FAST')

      onProgress?.(index + 1, sheets.length)

      // Yield to the event loop so a long paper does not freeze the tab and the
      // progress toast can actually repaint.
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    }
  })

  return pdf
}

export function pdfFileName(paper: Paper): string {
  const parts = [paper.exam.subject, paper.exam.className, paper.exam.title].filter((part) =>
    Boolean(part && part.trim()),
  )
  const base = slugify(parts.join(' ') || paper.name || 'question-paper')
  return `${base || 'question-paper'}.pdf`
}

/** Builds and saves the PDF. Throws so the caller can show a toast. */
export async function downloadPaperPdf(
  paper: Paper,
  options: PdfOptions = {},
  fileName?: string,
): Promise<string> {
  const pdf = await buildPaperPdf(paper, options)
  const name = fileName ?? pdfFileName(paper)
  pdf.save(name)
  return name
}
