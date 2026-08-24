import {
  AlignmentType,
  BorderStyle,
  ImageRun,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  UnderlineType,
  WidthType,
} from 'docx'

import { dataUrlMimeType, dataUrlToUint8Array } from '../imageUtils'

/**
 * ============================================================================
 *  Rich text -> DOCX
 * ============================================================================
 *  Translates the HTML that Tiptap produces into `docx` objects.
 *
 *  The tag list handled here must stay in step with `RICH_TEXT_TAGS` in
 *  `lib/types.ts`. If you enable a new Tiptap extension and forget to handle its
 *  tag below, its content silently disappears from Word exports — which is worse
 *  than crashing, so the walker falls back to descending into unknown elements
 *  and keeping their text.
 *
 *  Blocks come in one top-level node at a time, because `flattenPaper` has
 *  already split each question's rich text into individually paginatable nodes.
 *  That keeps this file free of any page-layout knowledge.
 */

export const MONO_FONT = 'Consolas'
export const CODE_FILL = 'F3F4F6'

/** One run's formatting, accumulated as the walker descends. */
interface RunStyle {
  bold?: boolean
  italics?: boolean
  underline?: boolean
  strike?: boolean
  superScript?: boolean
  subScript?: boolean
  mono?: boolean
}

export interface DocxTextContext {
  /** Word font name, e.g. "Times New Roman". */
  fontName: string
  /** Body size in half-points (docx's unit). */
  sizeHalfPt: number
  /** `spacing.line` value: 240 = single spacing. */
  lineTwentieths: number
  /** Intrinsic pixel size of every data URL in the paper, measured up front. */
  images: Map<string, { width: number; height: number }>
  /** Widest an image may be drawn, in 96-dpi pixels. */
  maxImageWidthPx: number
}

export type DocxInline = TextRun | ImageRun
export type DocxBlock = Paragraph | Table

export interface DocxTabStop {
  type: string
  position: number
  leader?: string
}

/**
 * docx does not re-export its tab-stop option type under a name that is stable
 * across minor versions, so tab stop arrays are handed over through this instead
 * of importing that type. The assertion is always legal and erases at compile
 * time; the shape above is the one docx actually reads.
 */
export function asTabStops(stops: readonly DocxTabStop[]) {
  return stops as never
}

export interface HtmlNodeOptions {
  /** Left indent applied to every paragraph, in twips. */
  indentTwip?: number
  /** Hanging indent for the first line, in twips. */
  hangingTwip?: number
  /** Right indent — reserves the marks column so text can never run under it. */
  rightIndentTwip?: number
  /**
   * Tab stops for the first paragraph (question number gutter + marks column).
   */
  tabStops?: DocxTabStop[]
  /** Runs prepended to the first paragraph (the question number and its tab). */
  leadIn?: DocxInline[]
  /** Runs appended to the first paragraph (the tab and the marks). */
  tail?: DocxInline[]
  /** Space after the last paragraph, in twips. */
  spaceAfterTwip?: number
}

/* -------------------------------------------------------------------------- */
/*  Parsing                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Exports only ever run in the browser (they need canvas and Blob), so DOMParser
 * is always available here — unlike in `lib/html.ts`, which is shared with SSR.
 */
function parse(html: string): HTMLElement | null {
  if (typeof DOMParser === 'undefined') return null
  try {
    const doc = new DOMParser().parseFromString(
      `<!doctype html><html><body><div id="root">${html}</div></body></html>`,
      'text/html',
    )
    return doc.getElementById('root')
  } catch {
    return null
  }
}

/* -------------------------------------------------------------------------- */
/*  Inline runs                                                                */
/* -------------------------------------------------------------------------- */

function textRun(text: string, style: RunStyle, ctx: DocxTextContext): TextRun {
  return new TextRun({
    text,
    bold: style.bold,
    italics: style.italics,
    underline: style.underline ? { type: UnderlineType.SINGLE } : undefined,
    strike: style.strike,
    superScript: style.superScript,
    subScript: style.subScript,
    font: style.mono ? MONO_FONT : ctx.fontName,
    size: style.mono ? Math.round(ctx.sizeHalfPt * 0.9) : ctx.sizeHalfPt,
    shading: style.mono ? { type: ShadingType.CLEAR, fill: CODE_FILL } : undefined,
  })
}

function imageRun(src: string, ctx: DocxTextContext): ImageRun | null {
  // docx cannot embed SVG. Skipping is better than writing a file Word refuses
  // to open; the PDF route still renders it.
  if (dataUrlMimeType(src).includes('svg')) return null

  const data = dataUrlToUint8Array(src)
  if (!data) return null

  const natural = ctx.images.get(src) ?? { width: 320, height: 200 }
  const scale = Math.min(1, ctx.maxImageWidthPx / Math.max(1, natural.width))

  return new ImageRun({
    data,
    transformation: {
      width: Math.max(8, Math.round(natural.width * scale)),
      height: Math.max(8, Math.round(natural.height * scale)),
    },
  })
}

/** Walks inline content, accumulating formatting as it descends. */
function inlineRuns(node: Node, style: RunStyle, ctx: DocxTextContext): DocxInline[] {
  const out: DocxInline[] = []

  node.childNodes.forEach((child) => {
    if (child.nodeType === 3) {
      const text = child.textContent ?? ''
      if (text) out.push(textRun(text, style, ctx))
      return
    }
    if (child.nodeType !== 1) return

    const el = child as HTMLElement
    switch (el.tagName) {
      case 'BR':
        out.push(new TextRun({ break: 1 }))
        break
      case 'STRONG':
      case 'B':
        out.push(...inlineRuns(el, { ...style, bold: true }, ctx))
        break
      case 'EM':
      case 'I':
        out.push(...inlineRuns(el, { ...style, italics: true }, ctx))
        break
      case 'U':
        out.push(...inlineRuns(el, { ...style, underline: true }, ctx))
        break
      case 'S':
      case 'STRIKE':
      case 'DEL':
        out.push(...inlineRuns(el, { ...style, strike: true }, ctx))
        break
      case 'SUP':
        out.push(...inlineRuns(el, { ...style, superScript: true }, ctx))
        break
      case 'SUB':
        out.push(...inlineRuns(el, { ...style, subScript: true }, ctx))
        break
      case 'CODE':
        out.push(...inlineRuns(el, { ...style, mono: true }, ctx))
        break
      case 'IMG': {
        const run = imageRun(el.getAttribute('src') ?? '', ctx)
        if (run) out.push(run)
        break
      }
      default:
        // SPAN, A, and anything unexpected: keep the content, drop the wrapper.
        out.push(...inlineRuns(el, style, ctx))
        break
    }
  })

  return out
}

export function htmlToInlineRuns(html: string, ctx: DocxTextContext, style: RunStyle = {}): DocxInline[] {
  const root = parse(html)
  if (!root) return html ? [textRun(html.replace(/<[^>]*>/g, ''), style, ctx)] : []
  return inlineRuns(root, style, ctx)
}

/* -------------------------------------------------------------------------- */
/*  Block content                                                              */
/* -------------------------------------------------------------------------- */

const LIST_INDENT_TWIP = 360

type DocxAlignment = (typeof AlignmentType)[keyof typeof AlignmentType]

/**
 * Reads the alignment Tiptap's TextAlign extension writes as an inline style.
 *
 * Returns `undefined` for left and for anything unrecognised so the paragraph
 * inherits the document default instead of pinning an explicit value.
 */
function alignmentOf(el: HTMLElement): DocxAlignment | undefined {
  const value = (el.style.textAlign || el.getAttribute('align') || '').toLowerCase()
  if (value === 'center') return AlignmentType.CENTER
  if (value === 'right') return AlignmentType.RIGHT
  if (value === 'justify') return AlignmentType.JUSTIFIED
  return undefined
}

function paragraphOf(
  children: DocxInline[],
  ctx: DocxTextContext,
  opts: {
    indentTwip?: number
    hangingTwip?: number
    rightIndentTwip?: number
    tabStops?: HtmlNodeOptions['tabStops']
    spaceAfterTwip?: number
    alignment?: DocxAlignment
  } = {},
): Paragraph {
  return new Paragraph({
    children: children.length > 0 ? children : [new TextRun({ text: '', size: ctx.sizeHalfPt })],
    alignment: opts.alignment,
    spacing: {
      line: ctx.lineTwentieths,
      before: 0,
      after: opts.spaceAfterTwip ?? 0,
    },
    indent:
      opts.indentTwip || opts.hangingTwip || opts.rightIndentTwip
        ? {
            left: opts.indentTwip ?? 0,
            hanging: opts.hangingTwip,
            right: opts.rightIndentTwip,
          }
        : undefined,
    // `tabStops` must be a non-empty array or docx writes an empty <w:tabs/>.
    tabStops: opts.tabStops && opts.tabStops.length > 0 ? asTabStops(opts.tabStops) : undefined,
  })
}

function listParagraphs(
  list: HTMLElement,
  ctx: DocxTextContext,
  baseIndent: number,
  depth: number,
): DocxBlock[] {
  const ordered = list.tagName === 'OL'
  const out: DocxBlock[] = []
  const items = Array.from(list.children).filter((child) => child.tagName === 'LI')

  items.forEach((li, index) => {
    const nestedLists = Array.from(li.children).filter(
      (child) => child.tagName === 'UL' || child.tagName === 'OL',
    ) as HTMLElement[]

    // The item's own text: everything except the nested lists.
    const holder = li.cloneNode(true) as HTMLElement
    Array.from(holder.children)
      .filter((child) => child.tagName === 'UL' || child.tagName === 'OL')
      .forEach((child) => child.remove())

    const runs = inlineRuns(holder, {}, ctx)
    const indent = baseIndent + LIST_INDENT_TWIP * (depth + 1)

    if (ordered) {
      /*
       * Ordered items carry a literal "1." run rather than a Word numbering
       * definition. That is a deliberate trade: a custom numbering.xml is the
       * one part of a .docx that Word will refuse to open if it is even slightly
       * malformed, and two adjacent lists sharing an instance silently continue
       * each other's count. A literal prefix cannot do either, prints exactly
       * like the preview, and is still editable.
       */
      const marker = depth === 0 ? `${index + 1}.` : `${String.fromCharCode(97 + index)}.`
      out.push(
        paragraphOf([textRun(`${marker}\t`, {}, ctx), ...runs], ctx, {
          indentTwip: indent,
          hangingTwip: LIST_INDENT_TWIP,
          tabStops: [{ type: 'left', position: indent }],
        }),
      )
    } else {
      out.push(
        new Paragraph({
          children: runs.length > 0 ? runs : [new TextRun({ text: '', size: ctx.sizeHalfPt })],
          // docx supplies its own bullet definition for this, so no custom
          // numbering config is needed.
          bullet: { level: Math.min(2, depth) },
          spacing: { line: ctx.lineTwentieths, before: 0, after: 0 },
          indent: { left: indent + LIST_INDENT_TWIP, hanging: LIST_INDENT_TWIP },
        }),
      )
    }

    nestedLists.forEach((nested) => {
      out.push(...listParagraphs(nested, ctx, baseIndent, depth + 1))
    })
  })

  return out
}

function preParagraphs(pre: HTMLElement, ctx: DocxTextContext, indentTwip: number): DocxBlock[] {
  const text = pre.textContent ?? ''
  const lines = text.replace(/\n$/, '').split('\n')
  return lines.map(
    (line) =>
      new Paragraph({
        children: [textRun(line.length > 0 ? line : ' ', { mono: true }, ctx)],
        spacing: { line: 240, before: 0, after: 0 },
        indent: { left: indentTwip + 120 },
        shading: { type: ShadingType.CLEAR, fill: CODE_FILL },
      }),
  )
}

const THIN_BORDER = { style: BorderStyle.SINGLE, size: 6, color: '000000' } as const

function tableFromHtml(table: HTMLElement, ctx: DocxTextContext): Table {
  const rowEls = Array.from(table.querySelectorAll('tr'))

  const rows = rowEls.map((tr) => {
    const cells = Array.from(tr.children).filter(
      (cell) => cell.tagName === 'TD' || cell.tagName === 'TH',
    ) as HTMLElement[]

    return new TableRow({
      children: cells.map((cell) => {
        const isHead = cell.tagName === 'TH'
        const paragraphs = childBlocks(cell, ctx, 0)
        return new TableCell({
          children:
            paragraphs.length > 0
              ? paragraphs
              : [paragraphOf([], ctx)],
          columnSpan: Number(cell.getAttribute('colspan') ?? 1) || 1,
          rowSpan: Number(cell.getAttribute('rowspan') ?? 1) || 1,
          shading: isHead ? { type: ShadingType.CLEAR, fill: CODE_FILL } : undefined,
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
        })
      }),
    })
  })

  return new Table({
    rows: rows.length > 0 ? rows : [new TableRow({ children: [new TableCell({ children: [paragraphOf([], ctx)] })] })],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: THIN_BORDER,
      bottom: THIN_BORDER,
      left: THIN_BORDER,
      right: THIN_BORDER,
      insideHorizontal: THIN_BORDER,
      insideVertical: THIN_BORDER,
    },
  })
}

/** Walks the block-level children of an element. */
function childBlocks(root: HTMLElement, ctx: DocxTextContext, indentTwip: number): DocxBlock[] {
  const out: DocxBlock[] = []
  let inlineBuffer: DocxInline[] = []

  const flush = () => {
    if (inlineBuffer.length > 0) {
      out.push(paragraphOf(inlineBuffer, ctx, { indentTwip }))
      inlineBuffer = []
    }
  }

  Array.from(root.childNodes).forEach((node) => {
    if (node.nodeType === 3) {
      const text = node.textContent ?? ''
      if (text.trim()) inlineBuffer.push(textRun(text, {}, ctx))
      return
    }
    if (node.nodeType !== 1) return

    const el = node as HTMLElement
    switch (el.tagName) {
      case 'P':
      case 'DIV':
      case 'H1':
      case 'H2':
      case 'H3':
      case 'H4':
      case 'H5':
      case 'H6':
        flush()
        out.push(
          paragraphOf(inlineRuns(el, el.tagName.startsWith('H') ? { bold: true } : {}, ctx), ctx, {
            indentTwip,
            alignment: alignmentOf(el),
          }),
        )
        break
      case 'UL':
      case 'OL':
        flush()
        out.push(...listParagraphs(el, ctx, indentTwip, 0))
        break
      case 'PRE':
        flush()
        out.push(...preParagraphs(el, ctx, indentTwip))
        break
      case 'TABLE':
        flush()
        out.push(tableFromHtml(el, ctx))
        break
      case 'HR':
        flush()
        out.push(
          new Paragraph({
            children: [],
            border: { bottom: THIN_BORDER },
            spacing: { before: 0, after: 60 },
          }),
        )
        break
      case 'IMG': {
        const run = imageRun(el.getAttribute('src') ?? '', ctx)
        if (run) inlineBuffer.push(run)
        break
      }
      default:
        inlineBuffer.push(...inlineRuns(el, {}, ctx))
        break
    }
  })

  flush()
  return out
}

/**
 * Converts one top-level rich-text node into DOCX blocks.
 *
 * `leadIn` / `tail` are spliced into the FIRST paragraph so a question's number
 * and its marks share the stem's paragraph — which is what makes the right tab
 * stop put the marks in the same column on every question.
 */
export function htmlNodeToDocx(
  html: string,
  ctx: DocxTextContext,
  opts: HtmlNodeOptions = {},
): DocxBlock[] {
  const indentTwip = opts.indentTwip ?? 0
  const root = parse(html)

  let blocks: DocxBlock[]
  if (!root) {
    blocks = [paragraphOf(htmlToInlineRuns(html, ctx), ctx, { indentTwip })]
  } else {
    blocks = childBlocks(root, ctx, indentTwip)
  }

  if (blocks.length === 0) blocks = [paragraphOf([], ctx, { indentTwip })]

  const needsFirstLineWork =
    (opts.leadIn && opts.leadIn.length > 0) ||
    (opts.tail && opts.tail.length > 0) ||
    opts.hangingTwip !== undefined ||
    opts.rightIndentTwip !== undefined ||
    (opts.tabStops && opts.tabStops.length > 0)

  if (needsFirstLineWork) {
    /*
     * The first block has to be rebuilt rather than mutated: docx objects are
     * immutable once constructed. Rebuilding needs the runs, so parse the first
     * node again on its own. If the first block is a table (a question that
     * opens with a table), the lead-in becomes its own paragraph above it so the
     * number is never lost.
     */
    const firstIsTable = blocks[0] instanceof Table
    if (firstIsTable) {
      blocks.unshift(
        paragraphOf([...(opts.leadIn ?? []), ...(opts.tail ?? [])], ctx, {
          indentTwip,
          hangingTwip: opts.hangingTwip,
          rightIndentTwip: opts.rightIndentTwip,
          tabStops: opts.tabStops,
        }),
      )
    } else {
      const firstNodeHtml = root ? (root.firstElementChild?.outerHTML ?? html) : html
      const runs = htmlToInlineRuns(firstNodeHtml, ctx)
      /*
       * A centred or right-aligned first line is honoured only when nothing has
       * to be tabbed into it. Word measures tab stops from the left indent, so a
       * right tab stop inside a centred paragraph puts the marks somewhere near
       * the middle of the page — the preview's alignment is the lesser loss.
       */
      const firstEl = root?.firstElementChild as HTMLElement | null
      const hasTail = Boolean(opts.tail && opts.tail.length > 0)
      blocks[0] = paragraphOf([...(opts.leadIn ?? []), ...runs, ...(opts.tail ?? [])], ctx, {
        indentTwip,
        hangingTwip: opts.hangingTwip,
        rightIndentTwip: opts.rightIndentTwip,
        tabStops: opts.tabStops,
        alignment: hasTail || !firstEl ? undefined : alignmentOf(firstEl),
      })
    }
  }

  if (opts.spaceAfterTwip) {
    const last = blocks[blocks.length - 1]
    if (last instanceof Paragraph) {
      // Trailing space is added as a separate empty paragraph instead of editing
      // the last one, for the same immutability reason.
      blocks.push(
        new Paragraph({
          children: [new TextRun({ text: '', size: 2 })],
          spacing: { before: 0, after: opts.spaceAfterTwip, line: 240 },
        }),
      )
    }
  }

  return blocks
}

/**
 * Word merges two `<w:tbl>` elements that sit next to each other in the body
 * into one table. Any run of blocks that can contain tables must therefore be
 * passed through this before it goes into the document.
 */
export function separateAdjacentTables(blocks: DocxBlock[]): DocxBlock[] {
  const out: DocxBlock[] = []
  blocks.forEach((block, index) => {
    if (index > 0 && block instanceof Table && out[out.length - 1] instanceof Table) {
      out.push(
        new Paragraph({
          children: [new TextRun({ text: '', size: 2 })],
          spacing: { before: 0, after: 0, line: 240 },
        }),
      )
    }
    out.push(block)
  })
  return out
}
