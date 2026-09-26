/**
 * Turning a document a teacher already has into questions in this app (spec §7).
 *
 * WHAT THIS DOES AND DOES NOT DO
 * ------------------------------
 * Word files and plain text are read for real, here in the browser, with no
 * upload and no third-party library. PDFs are not: extracting text from a PDF
 * needs a full font- and glyph-aware parser, and a half-working one that returns
 * mangled text for half of all files would be worse than not offering it — so
 * the dialog asks for a paste instead, which works for every PDF reader ever
 * made and takes the teacher about four seconds.
 *
 * Everything below is a *guess*. Exam papers are laid out for humans, not
 * parsers: "1." may be typed, or auto-numbered by Word, or absent entirely.
 * That is exactly why nothing here writes to the store — it produces drafts,
 * the dialog shows them, and the teacher ticks the ones that came out right.
 * A wrong guess costs one unticked checkbox, not a ruined paper.
 *
 * SECURITY
 * --------
 * An uploaded file is untrusted input (§34). It is size-checked before it is
 * read, parsed as XML with `DOMParser` (which does not run script and does not
 * fetch external entities), and every string that survives is escaped on its way
 * into HTML — never inserted as markup. Nothing here can execute.
 */

import { createOption, createQuestion, questionTypeSpec } from '@/lib/defaults'
import { escapeHtml } from '@/lib/html'
import { checkUpload, TEXT_UPLOAD, WORD_UPLOAD } from '@/lib/upload'
import type { Question, QuestionType } from '@/lib/types'

/* -------------------------------------------------------------------------- */
/*  Source lines                                                              */
/* -------------------------------------------------------------------------- */

export interface SourceLine {
  text: string
  /**
   * Word's own list level: 0 for a top-level auto-numbered item, 1+ for a
   * nested one, `null` for ordinary text.
   *
   * This matters more than it looks. When a teacher uses Word's numbering
   * button the "1." is not in the text at all — it is drawn by Word — so a
   * parser that only reads characters sees an unnumbered wall of sentences.
   */
  listLevel: number | null
}

/* -------------------------------------------------------------------------- */
/*  .docx                                                                     */
/* -------------------------------------------------------------------------- */

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

/** ZIP end-of-central-directory, central-directory header, local file header. */
const SIG_EOCD = 0x06054b50
const SIG_CDH = 0x02014b50
const SIG_LFH = 0x04034b50

/**
 * The smallest ZIP reader that can get one known file out of a .docx.
 *
 * A .docx is a ZIP archive, and the only member worth reading is
 * `word/document.xml`. Pulling in a ZIP library to fetch one entry would add a
 * dependency (and 40 kB to every page load) to do what the platform already
 * does: `DecompressionStream` has shipped in every browser this app supports.
 */
async function unzipEntry(buffer: ArrayBuffer, wanted: string): Promise<Uint8Array | null> {
  const bytes = new Uint8Array(buffer)
  const view = new DataView(buffer)

  // The end-of-central-directory record is last, but a ZIP may carry a trailing
  // comment of up to 64 kB, so it has to be searched for backwards.
  let eocd = -1
  const floor = Math.max(0, bytes.length - 22 - 0xffff)
  for (let i = bytes.length - 22; i >= floor; i -= 1) {
    if (view.getUint32(i, true) === SIG_EOCD) {
      eocd = i
      break
    }
  }
  if (eocd < 0) return null

  const count = view.getUint16(eocd + 10, true)
  let cursor = view.getUint32(eocd + 16, true)

  const decoder = new TextDecoder()
  for (let i = 0; i < count; i += 1) {
    if (cursor + 46 > bytes.length || view.getUint32(cursor, true) !== SIG_CDH) return null

    const method = view.getUint16(cursor + 10, true)
    const compressedSize = view.getUint32(cursor + 20, true)
    const nameLength = view.getUint16(cursor + 28, true)
    const extraLength = view.getUint16(cursor + 30, true)
    const commentLength = view.getUint16(cursor + 32, true)
    const localOffset = view.getUint32(cursor + 42, true)
    const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength))

    if (name === wanted) {
      if (localOffset + 30 > bytes.length || view.getUint32(localOffset, true) !== SIG_LFH) return null
      // The local header repeats the name and extra fields, and its extra field
      // is frequently a different length from the central one — so the data
      // offset must be computed from the local header, never the central.
      const localName = view.getUint16(localOffset + 26, true)
      const localExtra = view.getUint16(localOffset + 28, true)
      const start = localOffset + 30 + localName + localExtra
      const raw = bytes.subarray(start, start + compressedSize)

      if (method === 0) return raw
      if (method !== 8) return null // 8 = deflate; anything else is not a Word file
      const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
      return new Uint8Array(await new Response(stream).arrayBuffer())
    }

    cursor += 46 + nameLength + extraLength + commentLength
  }

  return null
}

/** True when this browser can inflate — old Safari and old Firefox cannot. */
export function canReadWordFiles(): boolean {
  return typeof DecompressionStream !== 'undefined'
}

/**
 * Reads the paragraphs of a .docx. Rejects with a sentence written for the
 * teacher — this is the only error the dialog ever shows for a Word file.
 */
export async function readDocxLines(file: File): Promise<SourceLine[]> {
  const problem = checkUpload(file, WORD_UPLOAD)
  if (problem) throw new Error(problem)

  if (!canReadWordFiles()) {
    throw new Error(
      'This browser cannot open Word files. Update it, or open the document in Word, select everything, copy, and use “Paste text” instead.',
    )
  }

  let xmlBytes: Uint8Array | null
  try {
    xmlBytes = await unzipEntry(await file.arrayBuffer(), 'word/document.xml')
  } catch {
    xmlBytes = null
  }
  if (!xmlBytes) {
    throw new Error(
      'That file could not be opened. If it is an older .doc, open it in Word and save it again as .docx.',
    )
  }

  const doc = new DOMParser().parseFromString(new TextDecoder().decode(xmlBytes), 'application/xml')
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('That Word file is damaged. Open it in Word, save it again, and try once more.')
  }

  const lines: SourceLine[] = []
  const paragraphs = doc.getElementsByTagNameNS(W_NS, 'p')

  for (let i = 0; i < paragraphs.length; i += 1) {
    const p = paragraphs[i]

    // Word splits a sentence across as many <w:t> runs as it has formatting
    // changes, so "H<b>2</b>O" arrives as three. Tabs and breaks are real
    // characters in the layout and are kept as spaces.
    let text = ''
    const walk = (node: Node) => {
      for (let c = node.firstChild; c; c = c.nextSibling) {
        if (c.nodeType !== 1) continue
        const el = c as Element
        if (el.namespaceURI === W_NS && el.localName === 't') text += el.textContent ?? ''
        else if (el.namespaceURI === W_NS && (el.localName === 'tab' || el.localName === 'br')) text += ' '
        else walk(el)
      }
    }
    walk(p)

    const numPr = p.getElementsByTagNameNS(W_NS, 'numPr')
    let listLevel: number | null = null
    if (numPr.length > 0) {
      const ilvl = numPr[0].getElementsByTagNameNS(W_NS, 'ilvl')[0]
      const raw = ilvl?.getAttributeNS(W_NS, 'val') ?? ilvl?.getAttribute('w:val')
      listLevel = Number.isFinite(Number(raw)) ? Number(raw) : 0
    }

    lines.push({ text: text.replace(/\s+/g, ' ').trim(), listLevel })
  }

  return lines
}

/* -------------------------------------------------------------------------- */
/*  Plain text                                                                */
/* -------------------------------------------------------------------------- */

export async function readTextLines(file: File): Promise<SourceLine[]> {
  const problem = checkUpload(file, TEXT_UPLOAD)
  if (problem) throw new Error(problem)
  return splitPastedText(await file.text())
}

export function splitPastedText(text: string): SourceLine[] {
  return text.split(/\r?\n/).map((line) => ({ text: line.replace(/\s+/g, ' ').trim(), listLevel: null }))
}

/* -------------------------------------------------------------------------- */
/*  Recognising the shapes of an exam paper                                   */
/* -------------------------------------------------------------------------- */

/** "1.", "1)", "(1)", "Q1.", "Q.1", "Q 1)" */
const QUESTION_PREFIX = /^(?:q\s*\.?\s*)?(?:\(\s*\d{1,3}\s*\)|\d{1,3}\s*[.)\]])\s+/i

/** "a)", "(b)", "c.", "i.", "(iv)", "x)" */
const OPTION_PREFIX = /^[([]?\s*(?:[a-h]|i{1,3}|iv|vi{0,3}|ix|x)\s*[.)\]]\s+/i

/** "Section A", "Group B", "Part 2" — a heading, not a question. */
const SECTION_HEADING = /^(?:section|group|part)\s+[a-z0-9]{1,3}\b[\s:.-]*$/i

/**
 * Marks written the way exam papers actually write them.
 *
 * Ordered most-explicit first. The bare `(2)` form is last and deliberately
 * refuses to fire on a short line, because "Simplify (2)" at the end of a maths
 * question is an operand, not a mark allocation.
 */
const MARKS_PATTERNS: Array<{ re: RegExp; minLength: number }> = [
  { re: /\[\s*(\d{1,3})\s*(?:marks?|mks?)?\s*\]\s*$/i, minLength: 0 },
  { re: /\(\s*(\d{1,3})\s*(?:marks?|mks?)\s*\)\s*$/i, minLength: 0 },
  { re: /[\s—-]+(\d{1,3})\s*(?:marks?|mks?)\.?\s*$/i, minLength: 0 },
  { re: /\(\s*(\d{1,3})\s*\)\s*$/, minLength: 24 },
]

function takeMarks(text: string): { text: string; marks: number | null } {
  for (const { re, minLength } of MARKS_PATTERNS) {
    const match = text.match(re)
    if (!match) continue
    const stripped = text.slice(0, match.index).trim()
    if (stripped.length < minLength || stripped.length === 0) continue
    const marks = Number(match[1])
    if (!Number.isFinite(marks) || marks < 0 || marks > 100) continue
    return { text: stripped, marks }
  }
  return { text, marks: null }
}

/* -------------------------------------------------------------------------- */
/*  Drafts                                                                    */
/* -------------------------------------------------------------------------- */

export interface DraftQuestion {
  /** Stable only within one parse — used as a React key and a selection id. */
  id: string
  text: string
  options: string[]
  marks: number | null
  type: QuestionType
}

function finish(draft: DraftQuestion): DraftQuestion {
  if (draft.options.length >= 2) {
    draft.type = 'mcq'
  } else if (/\btrue\s*(?:or|\/)\s*false\b/i.test(draft.text)) {
    draft.type = 'truefalse'
    draft.options = []
  } else {
    // Anything not obviously a multiple choice becomes a short question. It is
    // the cheapest guess to correct — one dropdown in the editor — and it never
    // silently throws away text the way converting to True/False would.
    draft.type = 'short'
    draft.options = []
  }
  return draft
}

/**
 * Groups lines into questions.
 *
 * Two passes on purpose. The first only asks "does this document number its
 * questions at all?", because the answer changes what a bare line means: in a
 * numbered paper an unmarked line continues the question above it, and in an
 * unnumbered list of questions it *is* the next question. Guessing that per-line
 * produces one enormous question or forty fragments, depending on which way you
 * guess.
 */
export function parseQuestions(lines: SourceLine[]): DraftQuestion[] {
  const usable = lines.filter((line) => line.text && !SECTION_HEADING.test(line.text))
  const numbered = usable.some((line) => line.listLevel === 0 || QUESTION_PREFIX.test(line.text))

  const drafts: DraftQuestion[] = []
  let current: DraftQuestion | null = null
  let serial = 0

  // `begin` returns the draft rather than assigning it, so that every start of a
  // new question is visible at the call site — both to a reader and to the
  // compiler's flow analysis.
  const begin = (text: string): DraftQuestion => {
    if (current) drafts.push(finish(current))
    const taken = takeMarks(text)
    serial += 1
    return {
      id: `draft-${serial}`,
      text: taken.text,
      options: [],
      marks: taken.marks,
      type: 'short',
    }
  }

  for (const line of usable) {
    const text = line.text

    const isOption =
      (line.listLevel !== null && line.listLevel >= 1) ||
      (OPTION_PREFIX.test(text) && text.length < 200)

    if (isOption && current) {
      current.options.push(text.replace(OPTION_PREFIX, '').trim() || text)
      continue
    }

    if (line.listLevel === 0 || QUESTION_PREFIX.test(text)) {
      current = begin(text.replace(QUESTION_PREFIX, '').trim() || text)
      continue
    }

    if (!numbered || !current) {
      current = begin(text)
      continue
    }

    // A continuation of the question above: a wrapped sentence, or the marks on
    // their own line, which is common in tabled papers.
    const taken = takeMarks(text)
    if (taken.text === '' && taken.marks !== null) {
      current.marks = taken.marks
    } else {
      current.text = `${current.text} ${taken.text}`.trim()
      if (taken.marks !== null) current.marks = taken.marks
    }
  }

  if (current) drafts.push(finish(current))

  // A "question" with no words is a stray bullet or a page number.
  return drafts.filter((draft) => draft.text.length > 0)
}

/** Builds a real `Question`, escaping every string on the way into HTML. */
export function draftToQuestion(draft: DraftQuestion): Question {
  const spec = questionTypeSpec(draft.type)
  return createQuestion(draft.type, {
    html: `<p>${escapeHtml(draft.text)}</p>`,
    marks: draft.marks ?? spec.defaultMarks,
    options: spec.hasOptions
      ? draft.options.map((option) => createOption(`<p>${escapeHtml(option)}</p>`))
      : [],
  })
}
