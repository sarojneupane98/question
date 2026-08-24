import { splitHtmlIntoTopLevelBlocks, toInlineHtml, htmlToPlainText } from './html'
import { sectionMarks } from './marks'
import { formatQuestionLabel, matchLeftLabel, matchRightLabel, optionLabel } from './numbering'
import type { PaginatedPage, Paper, PaperBlock, Question } from './types'

/**
 * ============================================================================
 *  flattenPaper — the one place a `Paper` becomes printable content
 * ============================================================================
 *  The on-screen A4 preview, the PDF exporter and the DOCX exporter all consume
 *  the array this returns. That is deliberate: it is impossible for the Word
 *  file to contain a different question order, different numbering or different
 *  marks from what the teacher saw on screen, because there is only one
 *  traversal of the data model in the entire codebase.
 *
 *  SPLITTING STRATEGY
 *  ------------------
 *  A question is not emitted as one indivisible lump. It is emitted as:
 *
 *     question-stem   <- first top-level HTML node, carries number + marks
 *     question-cont   <- each remaining top-level HTML node
 *     mcq-row         <- options, N per printed row
 *     match-table     <- matching pairs, chunked so long tables can break
 *     answer-line     <- one block per ruled writing line
 *     answer-key      <- optional teacher's-copy answer
 *     spacer          <- inter-question breathing room
 *
 *  Because every one of those is separately measurable, a question that is
 *  taller than the remaining space continues onto the next page at a sensible
 *  boundary instead of being clipped or shunted wholesale to a new sheet.
 */

/** Matching tables break into chunks of this many rows so they can span pages. */
const MATCH_CHUNK_ROWS = 8

/* -------------------------------------------------------------------------- */
/*  Header meta                                                                */
/* -------------------------------------------------------------------------- */

export interface PaperMetaItem {
  label: string
  value: string
}

/**
 * The "Class / Subject / Full Marks / Time / Date" pairs printed under the
 * school name.
 *
 * Lives here rather than in the header component because the DOCX exporter needs
 * exactly the same list in exactly the same order — the preview and the Word file
 * must not disagree about which optional fields are worth printing.
 */
export function paperMetaItems(paper: Paper): PaperMetaItem[] {
  const { exam } = paper
  const items: PaperMetaItem[] = []
  if (exam.className.trim()) items.push({ label: 'Class', value: exam.className.trim() })
  if (exam.subject.trim()) items.push({ label: 'Subject', value: exam.subject.trim() })
  if (exam.subjectCode.trim()) items.push({ label: 'Code', value: exam.subjectCode.trim() })
  if (exam.set.trim()) items.push({ label: 'Set', value: exam.set.trim() })
  items.push({ label: 'Full Marks', value: String(exam.fullMarks) })
  if (exam.passMarks > 0) items.push({ label: 'Pass Marks', value: String(exam.passMarks) })
  if (exam.timeAllowed.trim()) items.push({ label: 'Time', value: exam.timeAllowed.trim() })
  if (exam.examDate.trim()) items.push({ label: 'Date', value: exam.examDate.trim() })
  return items
}

/** The fields students fill in, and their relative widths. */
export const STUDENT_FIELDS: Array<{ label: string; grow: number }> = [
  { label: "Student's Name", grow: 3 },
  { label: 'Roll No.', grow: 1 },
  { label: 'Section', grow: 1 },
  { label: 'Invigilator', grow: 2 },
]

/** Exam title as printed: "First Terminal Examination — 2082/83". */
export function paperHeadline(paper: Paper): string {
  return [paper.exam.title.trim(), paper.exam.academicYear.trim()].filter(Boolean).join(' — ')
}

function nonEmptyHtmlBlocks(html: string): string[] {
  const blocks = splitHtmlIntoTopLevelBlocks(html)
  return blocks.length > 0 ? blocks : ['<p></p>']
}

function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items]
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

function answerKeyText(question: Question): string {
  if (question.type === 'mcq' && question.correctOptionId) {
    const index = question.options.findIndex((o) => o.id === question.correctOptionId)
    if (index >= 0) {
      const label = optionLabel(index).replace(')', '')
      const text = htmlToPlainText(question.options[index].html)
      return text ? `Answer: ${label} — ${text}` : `Answer: ${label}`
    }
  }
  if (question.type === 'truefalse' && question.tfAnswer !== null) {
    return `Answer: ${question.tfAnswer ? 'True' : 'False'}`
  }
  if (question.type === 'matching' && question.matchPairs.length > 0) {
    const pairs = question.matchPairs
      .map((p, i) => `${matchLeftLabel(i).replace('.', '')}–${matchRightLabel(i).replace('.', '')}`)
      .join(', ')
    return `Answer: ${pairs}`
  }
  return ''
}

function buildQuestionBlocks(paper: Paper, question: Question, numberLabel: string): PaperBlock[] {
  const blocks: PaperBlock[] = []
  const htmlBlocks = nonEmptyHtmlBlocks(question.html)

  blocks.push({
    kind: 'question-stem',
    id: `${question.id}:stem`,
    groupId: question.id,
    keepWithNext: 0, // patched below once we know how many blocks follow
    breakBefore: false,
    questionId: question.id,
    number: numberLabel,
    html: htmlBlocks[0],
    marks: question.marks > 0 ? question.marks : null,
    questionType: question.type,
  })

  htmlBlocks.slice(1).forEach((html, i) => {
    blocks.push({
      kind: 'question-cont',
      id: `${question.id}:cont:${i}`,
      groupId: question.id,
      keepWithNext: 0,
      breakBefore: false,
      questionId: question.id,
      html,
    })
  })

  if (question.type === 'mcq' && question.options.length > 0) {
    const columns = question.optionColumns
    const decorated = question.options.map((option, i) => ({
      label: optionLabel(i),
      html: toInlineHtml(option.html),
      correct: option.id === question.correctOptionId,
    }))
    chunk(decorated, columns).forEach((rowOptions, rowIndex) => {
      blocks.push({
        kind: 'mcq-row',
        id: `${question.id}:mcq:${rowIndex}`,
        groupId: question.id,
        keepWithNext: 0,
        breakBefore: false,
        questionId: question.id,
        options: rowOptions,
        columns,
      })
    })
  }

  if (question.type === 'matching' && question.matchPairs.length > 0) {
    const rows = question.matchPairs.map((pair, i) => ({
      leftLabel: matchLeftLabel(i),
      left: toInlineHtml(pair.left),
      rightLabel: matchRightLabel(i),
      right: toInlineHtml(pair.right),
    }))
    chunk(rows, MATCH_CHUNK_ROWS).forEach((chunkRows, chunkIndex) => {
      blocks.push({
        kind: 'match-table',
        id: `${question.id}:match:${chunkIndex}`,
        groupId: question.id,
        keepWithNext: 0,
        breakBefore: false,
        questionId: question.id,
        rows: chunkRows,
        showHead: chunkIndex === 0,
        headLeft: 'Column A',
        headRight: 'Column B',
      })
    })
  }

  const lines = Math.max(0, Math.min(40, Math.floor(question.answerLines)))
  for (let i = 0; i < lines; i += 1) {
    blocks.push({
      kind: 'answer-line',
      id: `${question.id}:line:${i}`,
      groupId: question.id,
      keepWithNext: 0,
      breakBefore: false,
      questionId: question.id,
    })
  }

  if (paper.layout.showAnswerKey) {
    const text = answerKeyText(question)
    if (text) {
      blocks.push({
        kind: 'answer-key',
        id: `${question.id}:key`,
        groupId: question.id,
        keepWithNext: 0,
        breakBefore: false,
        questionId: question.id,
        text,
      })
    }
  }

  // Keep the stem with the start of its own body so a question never ends up as
  // a lone orphan line at the foot of a page.
  const followers = blocks.length - 1
  blocks[0].keepWithNext = Math.min(2, followers)

  if (paper.layout.questionSpacingMm > 0) {
    blocks.push({
      kind: 'spacer',
      id: `${question.id}:gap`,
      groupId: question.id,
      keepWithNext: 0,
      breakBefore: false,
      heightMm: paper.layout.questionSpacingMm,
    })
  }

  return blocks
}

/**
 * The printed label of every question in the paper, keyed by question id.
 *
 * `flattenPaper` consumes this rather than counting as it builds, and the editor
 * cards read the same map — so the "12." on a card in the left panel is by
 * construction the same "12." that prints, including when a section restarts
 * numbering or uses roman numerals.
 */
export function questionLabelMap(paper: Paper): Map<string, string> {
  const labels = new Map<string, string>()
  let runningNumber = 0

  paper.sections.forEach((section) => {
    if (section.restartNumbering) runningNumber = 0
    section.questions.forEach((question) => {
      runningNumber += 1
      labels.set(question.id, formatQuestionLabel(runningNumber, section.numberStyle))
    })
  })

  return labels
}

export function flattenPaper(paper: Paper): PaperBlock[] {
  const blocks: PaperBlock[] = []
  const { layout } = paper
  const labels = questionLabelMap(paper)

  blocks.push({
    kind: 'header',
    id: 'paper:header',
    groupId: 'paper:header',
    keepWithNext: layout.showStudentFields ? 1 : 0,
    breakBefore: false,
  })

  if (layout.showStudentFields) {
    blocks.push({
      kind: 'student-fields',
      id: 'paper:student',
      groupId: 'paper:header',
      keepWithNext: 0,
      breakBefore: false,
    })
  }

  const instructions = paper.instructions.filter((i) => i.text.trim().length > 0)
  if (layout.showInstructions && instructions.length > 0) {
    blocks.push({
      kind: 'instructions-title',
      id: 'paper:instructions',
      groupId: 'paper:instructions',
      keepWithNext: Math.min(2, instructions.length),
      breakBefore: false,
      label: 'General Instructions',
    })
    instructions.forEach((instruction, i) => {
      blocks.push({
        kind: 'instruction-item',
        id: `instr:${instruction.id}`,
        groupId: 'paper:instructions',
        keepWithNext: 0,
        breakBefore: false,
        index: i + 1,
        text: instruction.text,
      })
    })
  }

  paper.sections.forEach((section) => {
    const sectionBody: PaperBlock[] = []
    section.questions.forEach((question) => {
      sectionBody.push(...buildQuestionBlocks(paper, question, labels.get(question.id) ?? ''))
    })

    blocks.push({
      kind: 'section-header',
      id: `${section.id}:header`,
      groupId: section.id,
      // Never strand a section heading at the bottom of a page: it must be able
      // to take its first question (and that question's first body line) along.
      keepWithNext: Math.min(3, sectionBody.length),
      breakBefore: section.pageBreakBefore,
      title: section.title,
      note: section.note,
      marksNote: section.marksNote,
      marks: section.showSectionMarks ? sectionMarks(section) : null,
    })

    blocks.push(...sectionBody)
  })

  if (layout.endNote.trim()) {
    blocks.push({
      kind: 'end-note',
      id: 'paper:end',
      groupId: 'paper:end',
      keepWithNext: 0,
      breakBefore: false,
      text: layout.endNote.trim(),
    })
  }

  return blocks
}

/* -------------------------------------------------------------------------- */
/*  Shared render metrics                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Width of the question-number gutter, in `ch` units.
 *
 * Computed once for the whole paper rather than per question so that "9." and
 * "10." — and "iii." and "viii." — all put their question text on the same left
 * edge. The preview, the PDF and the DOCX all call this, which is why it lives
 * next to `flattenPaper` instead of in a component.
 */
export function computeNumberGutter(blocks: PaperBlock[]): number {
  let longest = 2
  blocks.forEach((block) => {
    if (block.kind === 'question-stem') {
      longest = Math.max(longest, block.number.trim().length)
    }
  })
  return longest + 1
}

/** Height of one ruled answer line, in millimetres, scaled to the body size. */
export function answerLineHeightMm(fontSizePt: number): number {
  return Math.max(6.5, Math.round(fontSizePt * 0.68 * 10) / 10)
}

/* -------------------------------------------------------------------------- */
/*  Pagination                                                                 */
/* -------------------------------------------------------------------------- */

/** Sub-pixel slack so a block that fits exactly isn't pushed to a new page. */
const FIT_EPSILON = 0.75

/**
 * Greedy page-filling with keep-with-next lookahead.
 *
 * `heightOf` returns the measured pixel height of a block (see
 * `components/preview/usePagination.ts`, which measures the real rendered DOM
 * so the numbers include the actual font metrics, images and wrapped lines).
 *
 * Rules enforced here:
 *   • a block marked `breakBefore` starts a fresh page
 *   • a block plus its `keepWithNext` followers must fit, or the block moves on
 *   • a page never *starts* with a spacer (that would print as a stray gap)
 *   • a block taller than a whole page is placed alone rather than dropped
 */
export function paginateBlocks(
  blocks: PaperBlock[],
  heightOf: (blockId: string) => number,
  contentHeightPx: number,
): PaginatedPage[] {
  const pages: PaperBlock[][] = []
  let current: PaperBlock[] = []
  let used = 0

  const flush = () => {
    pages.push(current)
    current = []
    used = 0
  }

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]

    if (block.kind === 'spacer' && current.length === 0) continue

    if (block.breakBefore && current.length > 0) flush()

    const height = heightOf(block.id)
    let required = height
    for (let k = 1; k <= block.keepWithNext && i + k < blocks.length; k += 1) {
      required += heightOf(blocks[i + k].id)
    }

    if (current.length > 0 && used + required > contentHeightPx + FIT_EPSILON) {
      flush()
    }

    current.push(block)
    used += height
  }

  if (current.length > 0) pages.push(current)
  if (pages.length === 0) pages.push([])

  // Trailing spacers at the foot of a page are invisible but pad the height —
  // drop them so the last page's content sits flush.
  return pages.map((pageBlocks, index) => {
    let end = pageBlocks.length
    while (end > 0 && pageBlocks[end - 1].kind === 'spacer') end -= 1
    return { index, blocks: pageBlocks.slice(0, end) }
  })
}
