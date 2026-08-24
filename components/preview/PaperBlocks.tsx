'use client'

import { useMemo } from 'react'

import { PaperHeader, StudentFields } from './PaperHeader'
import { getFontSpec } from '@/lib/geometry'
import { sanitizeRichHtml } from '@/lib/html'
import { marksWord } from '@/lib/marks'
import type { MarksStyle, Paper, PaperBlock, PaperLayout } from '@/lib/types'

/**
 * ============================================================================
 *  Block renderers — the printable atoms
 * ============================================================================
 *  One component per `PaperBlock` kind. Nothing else in the app is allowed to
 *  render paper content.
 *
 *  WHY THAT MATTERS
 *  ----------------
 *  Pagination works by *measuring* these blocks in a hidden rig and then laying
 *  the same blocks onto A4 sheets. If the rig rendered even slightly different
 *  markup from the real page, every measurement would be a lie and page breaks
 *  would land in the wrong place. So the rig and the page both call
 *  `<BlockRenderer />` — there is no second code path to drift.
 *
 *  SPACING RULE
 *  ------------
 *  Vertical space is always `padding`, never `margin`. Adjacent margins collapse,
 *  and a collapsed margin measures differently from how it prints.
 */

export interface RenderOptions {
  /**
   * Width of the question-number gutter in `ch` units, shared by every question
   * in the paper (see `computeNumberGutter`). MCQ rows, answer lines and answer
   * keys are indented by the same amount so they align under the question text
   * rather than under its number.
   */
  gutterCh: number
  /** Height of one ruled answer line, in millimetres. */
  lineHeightMm: number
}

/* -------------------------------------------------------------------------- */
/*  Rich text                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Injects Tiptap HTML. Sanitised at the boundary because papers can be imported
 * from a JSON file, which makes this untrusted input even though the teacher
 * normally authors it themselves.
 */
function RichHtml({
  html,
  block = true,
  style,
}: {
  html: string
  block?: boolean
  style?: React.CSSProperties
}) {
  const safe = useMemo(() => sanitizeRichHtml(html), [html])
  // Written as two branches rather than a dynamic tag: a `'div' | 'span'` union
  // makes TypeScript intersect the two prop types, which it then rejects.
  if (!block) {
    return (
      <span className="rich-content" style={style} dangerouslySetInnerHTML={{ __html: safe }} />
    )
  }
  return <div className="rich-content" style={style} dangerouslySetInnerHTML={{ __html: safe }} />
}

/* -------------------------------------------------------------------------- */
/*  Marks                                                                     */
/* -------------------------------------------------------------------------- */

export function formatMarks(marks: number, style: MarksStyle): string {
  if (style === 'bracket-right') return `[${marks}]`
  if (style === 'plain-right') return String(marks)
  return `(${marksWord(marks)})`
}

/**
 * Appends the marks to the end of the question's own text for
 * `marksStyle: 'inline'`.
 *
 * Splicing the run inside the trailing `</p>` keeps it on the same line as the
 * last words of the question, which is what "inline" means on a real exam paper.
 * The DOCX exporter does the equivalent by appending a `TextRun` to the stem
 * paragraph, so the two outputs agree.
 */
function withInlineMarks(html: string, text: string): string {
  const marksRun = ` <span style="font-weight:600;white-space:nowrap">${text}</span>`
  const match = html.match(/^([\s\S]*)<\/(p|li|h[1-6])>\s*$/i)
  if (match) return `${match[1]}${marksRun}</${match[2]}>`
  return `${html}<p style="font-weight:600">${text}</p>`
}

/* -------------------------------------------------------------------------- */
/*  Per-kind renderers                                                        */
/* -------------------------------------------------------------------------- */

function InstructionsTitle({ label }: { label: string }) {
  return (
    <div style={{ paddingTop: '2.8mm', paddingBottom: '0.9mm' }}>
      <span
        style={{
          fontWeight: 700,
          textDecoration: 'underline',
          textUnderlineOffset: '0.18em',
        }}
      >
        {label}
      </span>
    </div>
  )
}

function InstructionItem({ index, text }: { index: number; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', paddingBottom: '0.6mm' }}>
      <span style={{ flex: '0 0 auto', width: '3.2ch', fontVariantNumeric: 'tabular-nums' }}>
        {index}.
      </span>
      <span style={{ flex: '1 1 auto', minWidth: 0 }}>{text}</span>
    </div>
  )
}

function SectionHeader({
  title,
  note,
  marksNote,
  marks,
  marksStyle,
  divider,
}: {
  title: string
  note: string
  marksNote: string
  marks: number | null
  marksStyle: MarksStyle
  divider: boolean
}) {
  const marksLabel =
    marks !== null ? (marksStyle === 'inline' ? `(${marksWord(marks)})` : `[${marks}]`) : ''
  const hasSubLine = Boolean(note.trim() || marksNote.trim())

  return (
    <div style={{ paddingTop: '3.2mm', paddingBottom: '1.6mm' }}>
      {divider ? <hr className="paper-divider-soft" /> : null}
      <div style={{ paddingTop: divider ? '1.8mm' : 0 }}>
        {/* Three cells keep the title optically centred whether or not marks print. */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2mm' }}>
          <span style={{ flex: '1 1 0', minWidth: 0 }} />
          <span
            style={{
              flex: '0 1 auto',
              fontWeight: 700,
              textAlign: 'center',
              letterSpacing: '0.01em',
            }}
          >
            {title}
          </span>
          <span
            style={{
              flex: '1 1 0',
              minWidth: 0,
              textAlign: 'right',
              whiteSpace: 'nowrap',
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {marksLabel}
          </span>
        </div>

        {hasSubLine ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '3mm',
              paddingTop: '0.8mm',
              fontSize: '0.94em',
              fontStyle: 'italic',
            }}
          >
            <span style={{ flex: '1 1 auto', minWidth: 0 }}>{note}</span>
            <span style={{ flex: '0 0 auto', whiteSpace: 'nowrap' }}>{marksNote}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function QuestionStem({
  number,
  html,
  marks,
  marksStyle,
  options,
}: {
  number: string
  html: string
  marks: number | null
  marksStyle: MarksStyle
  options: RenderOptions
}) {
  const inline = marksStyle === 'inline'
  const marksText = marks !== null ? formatMarks(marks, marksStyle) : ''
  const showColumn = marksText !== '' && !inline
  const body = marksText !== '' && inline ? withInlineMarks(html, marksText) : html

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', paddingBottom: '0.3mm' }}>
      <span className="paper-qnum" style={{ width: `${options.gutterCh}ch` }}>
        {number}
      </span>
      <RichHtml html={body} style={{ flex: '1 1 auto', minWidth: 0 }} />
      {showColumn ? (
        <span className="paper-marks" style={{ fontWeight: 600 }}>
          {marksText}
        </span>
      ) : null}
    </div>
  )
}

function QuestionCont({ html, options }: { html: string; options: RenderOptions }) {
  return (
    <div style={{ paddingLeft: `${options.gutterCh}ch`, paddingTop: '0.7mm' }}>
      <RichHtml html={html} />
    </div>
  )
}

function McqRow({
  optionsRow,
  columns,
  showKey,
  options,
}: {
  optionsRow: Array<{ label: string; html: string; correct: boolean }>
  columns: 1 | 2 | 4
  showKey: boolean
  options: RenderOptions
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        columnGap: '4mm',
        rowGap: '0.6mm',
        paddingLeft: `${options.gutterCh}ch`,
        paddingTop: '0.7mm',
      }}
    >
      {optionsRow.map((option) => {
        const highlight = showKey && option.correct
        return (
          <span
            key={option.label}
            style={{ display: 'flex', alignItems: 'flex-start', gap: '1.2mm', minWidth: 0 }}
          >
            <span
              style={{
                flex: '0 0 auto',
                fontWeight: highlight ? 700 : 400,
                textDecoration: highlight ? 'underline' : 'none',
              }}
            >
              {option.label}
            </span>
            <RichHtml
              html={option.html}
              block={false}
              style={{ flex: '1 1 auto', minWidth: 0, fontWeight: highlight ? 700 : 400 }}
            />
          </span>
        )
      })}
    </div>
  )
}

const MATCH_CELL: React.CSSProperties = {
  border: '1px solid #000000',
  padding: '1.2mm 1.8mm',
  verticalAlign: 'top',
  textAlign: 'left',
  wordBreak: 'break-word',
}

function MatchTable({
  rows,
  showHead,
  headLeft,
  headRight,
  options,
}: {
  rows: Array<{ leftLabel: string; left: string; rightLabel: string; right: string }>
  showHead: boolean
  headLeft: string
  headRight: string
  options: RenderOptions
}) {
  return (
    <div style={{ paddingLeft: `${options.gutterCh}ch`, paddingTop: '1.2mm' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        {showHead ? (
          <thead>
            <tr>
              <th style={{ ...MATCH_CELL, fontWeight: 700, backgroundColor: '#f3f4f6' }}>
                {headLeft}
              </th>
              <th style={{ ...MATCH_CELL, fontWeight: 700, backgroundColor: '#f3f4f6' }}>
                {headRight}
              </th>
            </tr>
          </thead>
        ) : null}
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              <td style={MATCH_CELL}>
                <span style={{ fontWeight: 600 }}>{row.leftLabel} </span>
                <RichHtml html={row.left} block={false} />
              </td>
              <td style={MATCH_CELL}>
                <span style={{ fontWeight: 600 }}>{row.rightLabel} </span>
                <RichHtml html={row.right} block={false} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AnswerLine({ options }: { options: RenderOptions }) {
  return (
    <div
      style={{
        height: `${options.lineHeightMm}mm`,
        paddingLeft: `${options.gutterCh}ch`,
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      <span className="paper-rule" style={{ width: '100%' }} />
    </div>
  )
}

function AnswerKey({ text, options }: { text: string; options: RenderOptions }) {
  return (
    <div
      style={{
        paddingLeft: `${options.gutterCh}ch`,
        paddingTop: '0.9mm',
        fontSize: '0.92em',
        fontWeight: 600,
      }}
    >
      {text}
    </div>
  )
}

function EndNote({ text }: { text: string }) {
  return (
    <div
      style={{
        paddingTop: '5mm',
        textAlign: 'center',
        fontWeight: 600,
        letterSpacing: '0.06em',
      }}
    >
      {text}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Dispatcher                                                                */
/* -------------------------------------------------------------------------- */

function BlockBody({
  block,
  paper,
  options,
}: {
  block: PaperBlock
  paper: Paper
  options: RenderOptions
}) {
  const { layout } = paper

  switch (block.kind) {
    case 'header':
      return (
        <div style={{ paddingBottom: '1.4mm' }}>
          <PaperHeader paper={paper} />
        </div>
      )

    case 'student-fields':
      return (
        <div style={{ paddingTop: '2.6mm', paddingBottom: '0.6mm' }}>
          <StudentFields />
        </div>
      )

    case 'instructions-title':
      return <InstructionsTitle label={block.label} />

    case 'instruction-item':
      return <InstructionItem index={block.index} text={block.text} />

    case 'section-header':
      return (
        <SectionHeader
          title={block.title}
          note={block.note}
          marksNote={block.marksNote}
          marks={block.marks}
          marksStyle={layout.marksStyle}
          divider={layout.showSectionDividers}
        />
      )

    case 'question-stem':
      return (
        <QuestionStem
          number={block.number}
          html={block.html}
          marks={block.marks}
          marksStyle={layout.marksStyle}
          options={options}
        />
      )

    case 'question-cont':
      return <QuestionCont html={block.html} options={options} />

    case 'mcq-row':
      return (
        <McqRow
          optionsRow={block.options}
          columns={block.columns}
          showKey={layout.showAnswerKey}
          options={options}
        />
      )

    case 'match-table':
      return (
        <MatchTable
          rows={block.rows}
          showHead={block.showHead}
          headLeft={block.headLeft}
          headRight={block.headRight}
          options={options}
        />
      )

    case 'answer-line':
      return <AnswerLine options={options} />

    case 'answer-key':
      return <AnswerKey text={block.text} options={options} />

    case 'end-note':
      return <EndNote text={block.text} />

    case 'spacer':
      return <div style={{ height: `${block.heightMm}mm` }} aria-hidden="true" />

    default:
      // Exhaustiveness guard: adding a block kind without a renderer is a compile
      // error here rather than a silently missing question in the export.
      return assertNever(block)
  }
}

function assertNever(value: never): null {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn('Unhandled paper block', value)
  }
  return null
}

/**
 * Renders one measurable block.
 *
 * `data-block-id` is the handle the measuring rig reads heights from, so it must
 * be present on the outermost element and must match `block.id` exactly.
 */
export function BlockRenderer({
  block,
  paper,
  options,
}: {
  block: PaperBlock
  paper: Paper
  options: RenderOptions
}) {
  return (
    <div className="pblock" data-block-id={block.id} data-block-kind={block.kind}>
      <BlockBody block={block} paper={paper} options={options} />
    </div>
  )
}

/**
 * Renders a run of blocks.
 *
 * Used by the measuring rig (all blocks at once) and by each A4 sheet (only the
 * blocks the paginator assigned to it). Sharing this component is what makes the
 * measured height and the printed height the same number.
 */
export function PaperBlockList({
  blocks,
  paper,
  options,
}: {
  blocks: PaperBlock[]
  paper: Paper
  options: RenderOptions
}) {
  return (
    <>
      {blocks.map((block) => (
        <BlockRenderer key={block.id} block={block} paper={paper} options={options} />
      ))}
    </>
  )
}

/**
 * The typography that must be identical on the measuring rig and on the sheet.
 *
 * Returned as one object so there is no way to set the font on one and forget it
 * on the other — a 1pt difference between rig and page would shift every page
 * break in a long paper.
 */
export function paperTypography(layout: PaperLayout): {
  className: string
  style: React.CSSProperties
} {
  return {
    className: getFontSpec(layout.font).className,
    style: {
      fontSize: `${layout.fontSizePt}pt`,
      lineHeight: layout.lineHeight,
      color: '#000000',
    },
  }
}
