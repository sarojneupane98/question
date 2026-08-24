import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeightRule,
  ImageRun,
  LeaderType,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TabStopType,
  TextRun,
  UnderlineType,
  WidthType,
} from 'docx'

import {
  asTabStops,
  htmlNodeToDocx,
  htmlToInlineRuns,
  separateAdjacentTables,
  type DocxBlock,
  type DocxInline,
  type DocxTabStop,
  type DocxTextContext,
} from './htmlToDocx'
import { getFontSpec, getPageGeometry, mmToImagePx, mmToTwip, ptToHalfPt } from '../geometry'
import { extractImageSources } from '../html'
import { slugify } from '../ids'
import { marksWord } from '../marks'
import {
  answerLineHeightMm,
  computeNumberGutter,
  flattenPaper,
  paperHeadline,
  paperMetaItems,
  STUDENT_FIELDS,
  type PaperMetaItem,
} from '../paperBlocks'
import { dataUrlToUint8Array, measureDataUrl } from '../imageUtils'
import { saveBlob } from '../saveBlob'
import { PAGE_FOOTER_MM, type MarksStyle, type Paper, type PaperBlock } from '../types'

/**
 * ============================================================================
 *  DOCX export
 * ============================================================================
 *  Walks the very same `PaperBlock[]` the on-screen preview renders, so the Word
 *  file cannot contain a different question order, different numbering or
 *  different marks from what the teacher approved on screen.
 *
 *  WHAT IS DELIBERATELY *NOT* REPRODUCED
 *  -------------------------------------
 *  Word owns pagination in a .docx — that is the whole point of an editable file.
 *  So this exporter does not try to force the preview's page breaks. Instead it
 *  gives Word the same page size, the same margins and the same reserved footer
 *  band, which makes its natural breaks land in very nearly the same places, and
 *  then uses `keepNext` / `keepLines` so headings and questions still refuse to
 *  split badly after the teacher edits the text.
 *
 *  MARKS ALIGNMENT
 *  ---------------
 *  Marks are a right-aligned tab stop at the right margin, not a table cell.
 *  A tab stop keeps the file clean and editable and can never overlap the
 *  question text; the trade is that when a stem wraps onto a second line the
 *  marks sit at the right of its *last* line rather than its first. A two-column
 *  table would pin them to the first line but would put a table around every
 *  question in the paper, which is markedly worse to edit.
 *
 *  CONSTRUCTS CHOSEN FOR SAFETY
 *  ----------------------------
 *  Word will refuse to open a .docx whose numbering definitions are malformed, so
 *  ordered lists use literal number prefixes (see `htmlToDocx.ts`). Word also
 *  merges adjacent tables and groups adjacent identically-bordered paragraphs, so
 *  ruled answer space is emitted as one table with N rows rather than N bordered
 *  paragraphs (which Word would collapse into a single rule).
 */

const THIN = { style: BorderStyle.SINGLE, size: 6, color: '000000' } as const
const HAIRLINE = { style: BorderStyle.SINGLE, size: 4, color: '000000' } as const
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } as const
const NO_MARGINS = { top: 0, bottom: 0, left: 0, right: 0 } as const

const META_HALF_PT = ptToHalfPt(9.5)
const SMALL_HALF_PT = ptToHalfPt(8.5)

/** Everything the block walker needs that is not on the `Paper` itself. */
interface DocxLayout extends DocxTextContext {
  /** Printable width, in twips. Every right tab stop lands here. */
  contentWidthTwip: number
  /** Question-number gutter, in twips. */
  gutterTwip: number
  /** Height of one ruled answer line, in twips. */
  answerLineTwip: number
  marksStyle: MarksStyle
  showAnswerKey: boolean
}

/* -------------------------------------------------------------------------- */
/*  Small builders                                                             */
/* -------------------------------------------------------------------------- */

function run(text: string, opts: { bold?: boolean; italics?: boolean; underline?: boolean; size?: number; caps?: boolean } = {}, L?: DocxLayout): TextRun {
  return new TextRun({
    text: opts.caps ? text.toUpperCase() : text,
    bold: opts.bold,
    italics: opts.italics,
    underline: opts.underline ? { type: UnderlineType.SINGLE } : undefined,
    size: opts.size ?? L?.sizeHalfPt,
    font: L?.fontName,
  })
}

function centered(children: DocxInline[], opts: { beforeMm?: number; afterMm?: number } = {}): Paragraph {
  return new Paragraph({
    children,
    alignment: AlignmentType.CENTER,
    spacing: {
      before: opts.beforeMm ? mmToTwip(opts.beforeMm) : 0,
      after: opts.afterMm ? mmToTwip(opts.afterMm) : 0,
    },
  })
}

/** An empty paragraph of a known height, used for inter-question spacing. */
function gap(heightMm: number): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: '', size: 2 })],
    spacing: { before: 0, after: Math.max(0, mmToTwip(heightMm) - 20), line: 240 },
  })
}

/* -------------------------------------------------------------------------- */
/*  Header                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The meta row ("Class: 8   Subject: Science   Full Marks: 50").
 *
 * Built from tab stops rather than a table: three stops give exactly the
 * left / centre / right cells the preview's `MetaGrid` draws, and a paragraph
 * survives editing far better than a borderless table does.
 */
function metaParagraphs(items: PaperMetaItem[], L: DocxLayout): Paragraph[] {
  if (items.length === 0) return []

  const rows: PaperMetaItem[][] = []
  for (let i = 0; i < items.length; i += 3) rows.push(items.slice(i, i + 3))

  return rows.map((row, rowIndex) => {
    const children: DocxInline[] = []
    row.forEach((item, column) => {
      if (column > 0) children.push(new TextRun({ text: '\t' }))
      children.push(run(`${item.label}:`, { bold: true, size: META_HALF_PT }, L))
      children.push(run(` ${item.value}`, { size: META_HALF_PT }, L))
    })

    const isFirst = rowIndex === 0
    const isLast = rowIndex === rows.length - 1

    return new Paragraph({
      children,
      // Rules only on the outer edges of the group, so a two-row meta block reads
      // as one banded strip rather than two boxes.
      border: {
        top: isFirst ? THIN : undefined,
        bottom: isLast ? THIN : undefined,
      },
      spacing: {
        before: isFirst ? mmToTwip(1.3) : 0,
        after: isLast ? mmToTwip(1.3) : 0,
        line: 240,
      },
      tabStops: asTabStops([
        { type: TabStopType.CENTER, position: Math.round(L.contentWidthTwip / 2) },
        { type: TabStopType.RIGHT, position: L.contentWidthTwip },
      ]),
      keepNext: true,
    })
  })
}

function logoParagraph(paper: Paper, sizeMm: number, L: DocxLayout): Paragraph[] {
  const src = paper.school.logoDataUrl
  if (!paper.layout.showLogo || !src) return []

  const data = dataUrlToUint8Array(src)
  if (!data) return []

  const natural = L.images.get(src) ?? { width: 200, height: 200 }
  const box = mmToImagePx(sizeMm)
  const scale = Math.min(box / Math.max(1, natural.width), box / Math.max(1, natural.height))

  return [
    centered(
      [
        new ImageRun({
          data,
          transformation: {
            width: Math.max(8, Math.round(natural.width * scale)),
            height: Math.max(8, Math.round(natural.height * scale)),
          },
        }),
      ],
      { afterMm: 0.8 },
    ),
  ]
}

/**
 * The printed header.
 *
 * Note one intentional difference from the preview: the logo is centred above the
 * school name instead of pinned to the left of it. Pinning it would need a
 * borderless three-column table wrapped around the whole header, and in a file
 * whose entire purpose is to be edited, a stray invisible table is a worse
 * outcome than a centred crest.
 */
function headerBlocks(paper: Paper, L: DocxLayout): DocxBlock[] {
  const { school, exam, layout } = paper
  const items = paperMetaItems(paper)
  const headline = paperHeadline(paper)
  const out: DocxBlock[] = []

  const addressLines = () => {
    if (school.address.trim()) {
      out.push(centered([run(school.address.trim(), { size: META_HALF_PT }, L)]))
    }
    if (school.affiliation.trim()) {
      out.push(centered([run(school.affiliation.trim(), { italics: true, size: SMALL_HALF_PT }, L)]))
    }
    if (school.contact.trim()) {
      out.push(centered([run(school.contact.trim(), { size: SMALL_HALF_PT }, L)]))
    }
  }

  if (layout.headerStyle === 'compact') {
    out.push(...logoParagraph(paper, 11, L))
    out.push(centered([run(school.name || 'School name', { bold: true, size: ptToHalfPt(13) }, L)]))
    const sub = [school.address.trim(), headline].filter(Boolean).join(' · ')
    if (sub) out.push(centered([run(sub, { size: META_HALF_PT }, L)]))
  } else if (layout.headerStyle === 'modern') {
    out.push(...logoParagraph(paper, 17, L))
    out.push(centered([run(school.name || 'School name', { bold: true, size: ptToHalfPt(16) }, L)]))
    addressLines()
    if (exam.title.trim()) {
      out.push(
        centered([run(exam.title.trim(), { bold: true, size: ptToHalfPt(11.5) }, L)], {
          beforeMm: 1.4,
        }),
      )
    }
    if (exam.academicYear.trim()) {
      out.push(centered([run(exam.academicYear.trim(), { size: ptToHalfPt(9) }, L)]))
    }
  } else {
    // classic and boxed
    out.push(...logoParagraph(paper, 16, L))
    out.push(
      centered([run(school.name || 'School name', { bold: true, size: ptToHalfPt(15), caps: true }, L)]),
    )
    addressLines()
    if (headline) {
      out.push(centered([run(headline, { bold: true, size: ptToHalfPt(12) }, L)], { beforeMm: 1.6 }))
    }
  }

  out.push(...metaParagraphs(items, L))

  if (layout.headerStyle === 'boxed') {
    /*
     * A single-cell table is the only construct that boxes a mixed run of
     * paragraphs (including the image) reliably in Word. It is safe here because
     * nothing inside it is itself a table.
     */
    return [
      new Table({
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: out,
                margins: { top: 100, bottom: 100, left: 140, right: 140 },
              }),
            ],
          }),
        ],
        width: { size: L.contentWidthTwip, type: WidthType.DXA },
        columnWidths: [L.contentWidthTwip],
        borders: {
          top: THIN,
          bottom: THIN,
          left: THIN,
          right: THIN,
          insideHorizontal: NO_BORDER,
          insideVertical: NO_BORDER,
        },
      }),
    ]
  }

  return out
}

/** "Student's Name: ....... Roll No.: ......" — dot leaders, as Word does them. */
function studentFieldsParagraph(L: DocxLayout): Paragraph {
  const totalGrow = STUDENT_FIELDS.reduce((sum, field) => sum + field.grow, 0)
  const children: DocxInline[] = []
  const stops: DocxTabStop[] = []

  let cumulative = 0
  STUDENT_FIELDS.forEach((field, index) => {
    cumulative += field.grow
    const isLast = index === STUDENT_FIELDS.length - 1
    const position = isLast
      ? L.contentWidthTwip - 20
      : Math.round((cumulative / totalGrow) * L.contentWidthTwip)

    children.push(run(`${field.label}: `, { size: META_HALF_PT }, L))
    children.push(new TextRun({ text: '\t' }))
    stops.push({ type: TabStopType.LEFT, position, leader: LeaderType.DOT })
  })

  return new Paragraph({
    children,
    spacing: { before: mmToTwip(2.6), after: mmToTwip(0.6), line: 240 },
    tabStops: asTabStops(stops),
    keepNext: true,
  })
}

/* -------------------------------------------------------------------------- */
/*  Question content                                                           */
/* -------------------------------------------------------------------------- */

function stemBlocks(
  block: Extract<PaperBlock, { kind: 'question-stem' }>,
  L: DocxLayout,
): DocxBlock[] {
  const inline = L.marksStyle === 'inline'
  const marksText =
    block.marks === null
      ? ''
      : L.marksStyle === 'bracket-right'
        ? `[${block.marks}]`
        : L.marksStyle === 'plain-right'
          ? String(block.marks)
          : `(${marksWord(block.marks)})`

  const tail: DocxInline[] = []
  if (marksText) {
    if (inline) {
      tail.push(run(` ${marksText}`, { bold: true }, L))
    } else {
      tail.push(new TextRun({ text: '\t' }))
      tail.push(run(marksText, { bold: true }, L))
    }
  }

  return htmlNodeToDocx(block.html, L, {
    indentTwip: L.gutterTwip,
    hangingTwip: L.gutterTwip,
    leadIn: [run(block.number, {}, L), new TextRun({ text: '\t' })],
    tail,
    tabStops: [
      // The left stop is what the question number tabs across to. A hanging
      // indent implies one, but naming it explicitly means the gutter is exact
      // rather than rounded to Word's default half-inch grid.
      { type: TabStopType.LEFT, position: L.gutterTwip },
      { type: TabStopType.RIGHT, position: L.contentWidthTwip },
    ],
  })
}

/**
 * MCQ options laid out in columns using tab stops.
 *
 * The preview uses a CSS grid; tab stops are its Word equivalent and keep the
 * options inside one editable paragraph. An option long enough to run past its
 * column's stop pushes to the next stop instead of overprinting, which is the
 * same graceful degradation the grid has when an option wraps.
 */
function mcqParagraph(
  block: Extract<PaperBlock, { kind: 'mcq-row' }>,
  L: DocxLayout,
): Paragraph {
  const usable = L.contentWidthTwip - L.gutterTwip
  const columnWidth = Math.floor(usable / block.columns)

  const stops: DocxTabStop[] = Array.from({ length: Math.max(0, block.columns - 1) }, (_, i) => ({
    type: TabStopType.LEFT,
    position: L.gutterTwip + columnWidth * (i + 1),
  }))

  const children: DocxInline[] = []
  block.options.forEach((option, index) => {
    if (index > 0) children.push(new TextRun({ text: '\t' }))
    const highlight = L.showAnswerKey && option.correct
    children.push(run(`${option.label} `, { bold: highlight, underline: highlight }, L))
    children.push(...htmlToInlineRuns(option.html, L, highlight ? { bold: true } : {}))
  })

  return new Paragraph({
    children,
    indent: { left: L.gutterTwip },
    spacing: { before: mmToTwip(0.7), after: 0, line: L.lineTwentieths },
    tabStops: stops.length > 0 ? asTabStops(stops) : undefined,
  })
}

function matchTable(
  block: Extract<PaperBlock, { kind: 'match-table' }>,
  L: DocxLayout,
): Table {
  const width = L.contentWidthTwip - L.gutterTwip
  const half = Math.floor(width / 2)

  const cell = (children: DocxInline[], head: boolean) =>
    new TableCell({
      children: [
        new Paragraph({
          children,
          spacing: { before: 0, after: 0, line: L.lineTwentieths },
        }),
      ],
      shading: head ? { type: ShadingType.CLEAR, fill: 'F3F4F6' } : undefined,
      margins: { top: 40, bottom: 40, left: 90, right: 90 },
    })

  const rows: TableRow[] = []

  if (block.showHead) {
    rows.push(
      new TableRow({
        tableHeader: true,
        children: [
          cell([run(block.headLeft, { bold: true }, L)], true),
          cell([run(block.headRight, { bold: true }, L)], true),
        ],
      }),
    )
  }

  block.rows.forEach((pair) => {
    rows.push(
      new TableRow({
        children: [
          cell([run(`${pair.leftLabel} `, { bold: true }, L), ...htmlToInlineRuns(pair.left, L)], false),
          cell([run(`${pair.rightLabel} `, { bold: true }, L), ...htmlToInlineRuns(pair.right, L)], false),
        ],
      }),
    )
  })

  return new Table({
    rows,
    width: { size: width, type: WidthType.DXA },
    columnWidths: [half, width - half],
    indent: { size: L.gutterTwip, type: WidthType.DXA },
    borders: {
      top: THIN,
      bottom: THIN,
      left: THIN,
      right: THIN,
      insideHorizontal: THIN,
      insideVertical: THIN,
    },
  })
}

/**
 * Ruled answer space, as one table with N rows.
 *
 * Bordered paragraphs would be the obvious choice, but Word treats a run of
 * paragraphs that share an identical border definition as a single bordered
 * block — five answer lines would print one rule instead of five. Table rows
 * have no such behaviour and can also be given an exact height, so the writing
 * space in Word is the same size as the writing space in the preview.
 */
function answerLinesTable(count: number, L: DocxLayout): Table {
  const width = L.contentWidthTwip - L.gutterTwip

  const rows = Array.from({ length: count }, () =>
    new TableRow({
      height: { value: L.answerLineTwip, rule: HeightRule.EXACT },
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: '', size: 2 })] })],
          margins: NO_MARGINS,
        }),
      ],
    }),
  )

  return new Table({
    rows,
    width: { size: width, type: WidthType.DXA },
    columnWidths: [width],
    indent: { size: L.gutterTwip, type: WidthType.DXA },
    borders: {
      top: NO_BORDER,
      bottom: HAIRLINE,
      left: NO_BORDER,
      right: NO_BORDER,
      insideHorizontal: HAIRLINE,
      insideVertical: NO_BORDER,
    },
  })
}

/* -------------------------------------------------------------------------- */
/*  Block walker                                                               */
/* -------------------------------------------------------------------------- */

function blockToDocx(block: PaperBlock, paper: Paper, L: DocxLayout): DocxBlock[] {
  switch (block.kind) {
    case 'header':
      return headerBlocks(paper, L)

    case 'student-fields':
      return [studentFieldsParagraph(L)]

    case 'instructions-title':
      return [
        new Paragraph({
          children: [run(block.label, { bold: true, underline: true }, L)],
          spacing: { before: mmToTwip(2.8), after: mmToTwip(0.9), line: L.lineTwentieths },
          keepNext: true,
        }),
      ]

    case 'instruction-item': {
      const indent = mmToTwip(5.5)
      return [
        new Paragraph({
          children: [
            run(`${block.index}.`, {}, L),
            new TextRun({ text: '\t' }),
            run(block.text, {}, L),
          ],
          indent: { left: indent, hanging: indent },
          spacing: { before: 0, after: mmToTwip(0.6), line: L.lineTwentieths },
          tabStops: asTabStops([{ type: TabStopType.LEFT, position: indent }]),
        }),
      ]
    }

    case 'section-header': {
      const out: Paragraph[] = []
      const marksLabel =
        block.marks === null
          ? ''
          : L.marksStyle === 'inline'
            ? `(${marksWord(block.marks)})`
            : `[${block.marks}]`

      out.push(
        new Paragraph({
          children: [
            new TextRun({ text: '\t' }),
            run(block.title, { bold: true }, L),
            new TextRun({ text: '\t' }),
            run(marksLabel, { bold: true }, L),
          ],
          border: paper.layout.showSectionDividers ? { top: HAIRLINE } : undefined,
          spacing: { before: mmToTwip(3.2), after: mmToTwip(1.6), line: L.lineTwentieths },
          tabStops: asTabStops([
            { type: TabStopType.CENTER, position: Math.round(L.contentWidthTwip / 2) },
            { type: TabStopType.RIGHT, position: L.contentWidthTwip },
          ]),
          // A section heading must never be the last thing on a page.
          keepNext: true,
          keepLines: true,
        }),
      )

      if (block.note.trim() || block.marksNote.trim()) {
        out.push(
          new Paragraph({
            children: [
              run(block.note, { italics: true, size: Math.round(L.sizeHalfPt * 0.94) }, L),
              new TextRun({ text: '\t' }),
              run(block.marksNote, { italics: true, size: Math.round(L.sizeHalfPt * 0.94) }, L),
            ],
            spacing: { before: 0, after: mmToTwip(1.2), line: L.lineTwentieths },
            tabStops: asTabStops([{ type: TabStopType.RIGHT, position: L.contentWidthTwip }]),
            keepNext: true,
          }),
        )
      }

      return out
    }

    case 'question-stem':
      return stemBlocks(block, L)

    case 'question-cont':
      return htmlNodeToDocx(block.html, L, { indentTwip: L.gutterTwip })

    case 'mcq-row':
      return [mcqParagraph(block, L)]

    case 'match-table':
      return [matchTable(block, L)]

    case 'answer-line':
      // Handled by the coalescing pass in `bodyBlocks`; never reached alone.
      return [answerLinesTable(1, L)]

    case 'answer-key':
      return [
        new Paragraph({
          children: [run(block.text, { bold: true, size: Math.round(L.sizeHalfPt * 0.92) }, L)],
          indent: { left: L.gutterTwip },
          spacing: { before: mmToTwip(0.9), after: 0, line: L.lineTwentieths },
        }),
      ]

    case 'end-note':
      return [
        centered([run(block.text, { bold: true }, L)], { beforeMm: 5 }),
      ]

    case 'spacer':
      return [gap(block.heightMm)]

    default: {
      // Exhaustiveness guard: adding a block kind without handling it here is a
      // compile error rather than a question silently missing from the Word file.
      const unhandled: never = block
      void unhandled
      return []
    }
  }
}

/**
 * Turns the flat block list into document body content.
 *
 * The only structural transform is coalescing consecutive `answer-line` blocks
 * into one table — see `answerLinesTable` for why they cannot be paragraphs.
 */
function bodyBlocks(blocks: PaperBlock[], paper: Paper, L: DocxLayout): DocxBlock[] {
  const out: DocxBlock[] = []

  let index = 0
  while (index < blocks.length) {
    const block = blocks[index]

    if (block.kind === 'answer-line') {
      let count = 0
      while (index + count < blocks.length && blocks[index + count].kind === 'answer-line') count += 1
      out.push(answerLinesTable(count, L))
      index += count
      continue
    }

    out.push(...blockToDocx(block, paper, L))
    index += 1
  }

  return separateAdjacentTables(out)
}

/* -------------------------------------------------------------------------- */
/*  Images                                                                     */
/* -------------------------------------------------------------------------- */

function collectImageSources(paper: Paper): string[] {
  const sources = new Set<string>()
  if (paper.school.logoDataUrl) sources.add(paper.school.logoDataUrl)

  paper.sections.forEach((section) => {
    section.questions.forEach((question) => {
      extractImageSources(question.html).forEach((src) => sources.add(src))
      question.options.forEach((option) =>
        extractImageSources(option.html).forEach((src) => sources.add(src)),
      )
      question.matchPairs.forEach((pair) => {
        extractImageSources(pair.left).forEach((src) => sources.add(src))
        extractImageSources(pair.right).forEach((src) => sources.add(src))
      })
    })
  })

  return Array.from(sources)
}

/**
 * `ImageRun` needs pixel dimensions up front, and reading them means decoding the
 * image — which is asynchronous. Resolving every image once, in parallel, before
 * the walk begins is what makes the walk itself synchronous.
 */
async function measureImages(paper: Paper): Promise<Map<string, { width: number; height: number }>> {
  const sources = collectImageSources(paper)
  const entries = await Promise.all(
    sources.map(async (src) => {
      try {
        return [src, await measureDataUrl(src)] as const
      } catch {
        return [src, { width: 320, height: 200 }] as const
      }
    }),
  )
  return new Map(entries)
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                 */
/* -------------------------------------------------------------------------- */

/** A4 in twips. */
const A4_TWIP = { width: 11906, height: 16838 }

export async function buildPaperDocx(paper: Paper): Promise<Blob> {
  const { layout } = paper
  const font = getFontSpec(layout.font)
  const blocks = flattenPaper(paper)
  const images = await measureImages(paper)

  // Same geometry helper the preview uses, so the two agree on the printable
  // width to a fraction of a millimetre.
  const geometry = getPageGeometry(layout)
  const gutterCh = computeNumberGutter(blocks)

  const L: DocxLayout = {
    fontName: font.docxName,
    sizeHalfPt: ptToHalfPt(layout.fontSizePt),
    lineTwentieths: Math.round(240 * layout.lineHeight),
    images,
    maxImageWidthPx: mmToImagePx(geometry.contentWidthMm * 0.9),
    contentWidthTwip: mmToTwip(geometry.contentWidthMm),
    // A digit is half an em wide in every font this app offers, so `ch` converts
    // to twips as (chars x 0.5em x 20 twips/pt). Keeping the gutter in step with
    // the preview is what makes "10." and "9." share a text edge in both.
    gutterTwip: Math.round(gutterCh * layout.fontSizePt * 0.5 * 20),
    answerLineTwip: mmToTwip(answerLineHeightMm(layout.fontSizePt)),
    marksStyle: layout.marksStyle,
    showAnswerKey: layout.showAnswerKey,
  }

  const footerMm = layout.showPageNumbers ? PAGE_FOOTER_MM : 0

  const doc = new Document({
    creator: 'Question Paper Generator',
    title: paper.name,
    description: paperHeadline(paper),
    styles: {
      default: {
        document: {
          run: { font: L.fontName, size: L.sizeHalfPt, color: '000000' },
          paragraph: { spacing: { line: L.lineTwentieths, before: 0, after: 0 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: A4_TWIP,
            margin: {
              top: mmToTwip(layout.margins.top),
              right: mmToTwip(layout.margins.right),
              // The footer band is added to the bottom margin so Word's text
              // column is the same height as the preview's content box, which is
              // what keeps its natural page breaks close to the preview's.
              bottom: mmToTwip(layout.margins.bottom + footerMm),
              left: mmToTwip(layout.margins.left),
              header: mmToTwip(Math.max(6, layout.margins.top - 6)),
              footer: mmToTwip(Math.max(4, layout.margins.bottom)),
            },
          },
        },
        footers: layout.showPageNumbers
          ? {
              default: new Footer({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES],
                        size: ptToHalfPt(9),
                        font: L.fontName,
                      }),
                    ],
                  }),
                ],
              }),
            }
          : undefined,
        children: bodyBlocks(blocks, paper, L),
      },
    ],
  })

  return Packer.toBlob(doc)
}

export function docxFileName(paper: Paper): string {
  const parts = [paper.exam.subject, paper.exam.className, paper.exam.title].filter((part) =>
    Boolean(part && part.trim()),
  )
  const base = slugify(parts.join(' ') || paper.name || 'question-paper')
  return `${base || 'question-paper'}.docx`
}

/** Builds and saves the Word file. Throws so the caller can show a toast. */
export async function downloadPaperDocx(paper: Paper, fileName?: string): Promise<string> {
  const blob = await buildPaperDocx(paper)
  const name = fileName ?? docxFileName(paper)
  await saveBlob(blob, name)
  return name
}
