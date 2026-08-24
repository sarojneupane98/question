import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  MM_TO_PX,
  PAGE_FOOTER_MM,
  type PageGeometry,
  type PaperFont,
  type PaperLayout,
} from './types'

export function mmToPx(mm: number): number {
  return mm * MM_TO_PX
}

export function pxToMm(px: number): number {
  return px / MM_TO_PX
}

/** DOCX measures nearly everything in twips: 1 twip = 1/20 pt, 1 inch = 1440. */
export function mmToTwip(mm: number): number {
  return Math.round((mm * 1440) / 25.4)
}

/** DOCX font sizes are half-points. */
export function ptToHalfPt(pt: number): number {
  return Math.round(pt * 2)
}

/** docx `ImageRun` transformations are expressed in 96-dpi pixels. */
export function mmToImagePx(mm: number): number {
  return Math.round(mm * MM_TO_PX)
}

export function getPageGeometry(layout: PaperLayout): PageGeometry {
  const contentWidthMm = Math.max(60, A4_WIDTH_MM - layout.margins.left - layout.margins.right)
  const footerMm = layout.showPageNumbers ? PAGE_FOOTER_MM : 0
  const contentHeightMm = Math.max(
    80,
    A4_HEIGHT_MM - layout.margins.top - layout.margins.bottom - footerMm,
  )

  return {
    widthMm: A4_WIDTH_MM,
    heightMm: A4_HEIGHT_MM,
    contentWidthMm,
    contentHeightMm,
    widthPx: mmToPx(A4_WIDTH_MM),
    heightPx: mmToPx(A4_HEIGHT_MM),
    contentWidthPx: mmToPx(contentWidthMm),
    contentHeightPx: mmToPx(contentHeightMm),
  }
}

/**
 * The mapping from our abstract font choice to
 *   (a) the Tailwind family used on screen, and
 *   (b) the real font name written into the DOCX.
 *
 * Both sides must resolve to the *same physical font* or the Word document will
 * re-flow differently from the preview. That is why only fonts that ship with
 * both Windows/macOS and Microsoft Word are offered here.
 */
export interface PaperFontSpec {
  id: PaperFont
  label: string
  /** Tailwind class from `tailwind.config.ts`. */
  className: string
  /** Font name written into the .docx. */
  docxName: string
  /** Shown in the layout picker. */
  hint: string
}

export const PAPER_FONTS: PaperFontSpec[] = [
  {
    id: 'serif',
    label: 'Times New Roman',
    className: 'font-paperSerif',
    docxName: 'Times New Roman',
    hint: 'The standard for printed exam papers',
  },
  {
    id: 'sans',
    label: 'Arial',
    className: 'font-paperSans',
    docxName: 'Arial',
    hint: 'Clean and highly legible',
  },
  {
    id: 'book',
    label: 'Georgia',
    className: 'font-paperBook',
    docxName: 'Georgia',
    hint: 'Warmer serif, good for primary classes',
  },
  {
    id: 'modern',
    label: 'Calibri',
    className: 'font-paperModern',
    docxName: 'Calibri',
    hint: 'Matches Microsoft Word defaults',
  },
]

export function getFontSpec(font: PaperFont): PaperFontSpec {
  return PAPER_FONTS.find((f) => f.id === font) ?? PAPER_FONTS[0]
}

export const MARGIN_PRESETS: Array<{
  label: string
  hint: string
  margins: PaperLayout['margins']
}> = [
  { label: 'Narrow', hint: '12 mm', margins: { top: 12, right: 12, bottom: 12, left: 12 } },
  { label: 'Normal', hint: '18 mm', margins: { top: 18, right: 16, bottom: 16, left: 18 } },
  { label: 'Wide', hint: '25 mm', margins: { top: 25, right: 22, bottom: 22, left: 25 } },
  {
    label: 'Bound copy',
    hint: 'extra left edge',
    margins: { top: 18, right: 14, bottom: 16, left: 28 },
  },
]
