/**
 * ============================================================================
 *  JSON import / export
 * ============================================================================
 *  Papers live in localStorage, which is per-browser. A teacher who moves to
 *  another machine, or who wants to hand a paper to a colleague, needs a file.
 *  This module is that file format, in both directions.
 *
 *  WHY EVERY FIELD IS RE-VALIDATED
 *  -------------------------------
 *  A `.qpaper.json` file is a plain text file. It can be hand-edited, truncated
 *  by a failed download, produced by an older version of this app, or simply be
 *  some other program's JSON that happens to have been picked in the file
 *  dialog. The renderer, the paginator and the DOCX walker all assume the
 *  `Paper` contract in `lib/types.ts` holds — `options` is always an array,
 *  `marks` is always a finite number, `type` is always one of eight literals.
 *  Feeding them `JSON.parse()` output directly would turn a bad file into a
 *  white screen.
 *
 *  So nothing is trusted. `coercePaper()` walks the input field by field and
 *  builds a *new* object out of the same factories the editor uses
 *  (`createPaper` / `createSection` / `createQuestion` / ...), taking a value
 *  from the file only when that value is of the right shape. Anything missing,
 *  malformed or unrecognised silently falls back to the default. The result is
 *  that import can never fail halfway and can never produce a malformed paper:
 *  worst case the teacher gets a valid but empty paper and can see for
 *  themselves that the file was junk.
 *
 *  Two consequences worth knowing:
 *    • Ids are regenerated on import, so importing the same file twice gives two
 *      independent papers rather than two objects that fight over one id.
 *    • Rich text goes through `sanitizeRichHtml()`. It is injected with
 *      `dangerouslySetInnerHTML`, and this is the one place where the HTML did
 *      not come from our own Tiptap instance.
 */

import {
  DEFAULT_EXAM,
  DEFAULT_LAYOUT,
  DEFAULT_SCHOOL,
  DEFAULT_SETTINGS,
  createInstruction,
  createPaper,
  createQuestion,
  createSection,
  questionTypeSpec,
} from './defaults'
import { sanitizeRichHtml } from './html'
import { nowIso, slugify, uid } from './ids'
import { saveTextBlob } from './saveBlob'
import type {
  AppSettings,
  BankEntry,
  Difficulty,
  ExamInfo,
  HeaderStyle,
  Instruction,
  MCQOption,
  MarksStyle,
  MatchPair,
  NumberStyle,
  PageMargins,
  Paper,
  PaperFont,
  PaperLayout,
  Question,
  QuestionMeta,
  QuestionType,
  SchoolInfo,
  Section,
  ThemeMode,
} from './types'

/* -------------------------------------------------------------------------- */
/*  File format                                                               */
/* -------------------------------------------------------------------------- */

export const PAPER_FILE_KIND = 'question-paper-generator/paper'
export const BACKUP_FILE_KIND = 'question-paper-generator/backup'

/** Bump only for a change no coercion can absorb. */
export const FILE_FORMAT_VERSION = 1

export const PAPER_FILE_EXTENSION = '.qpaper.json'
export const BACKUP_FILE_EXTENSION = '.qpgbackup.json'

/** `accept` for the file inputs. `.json` is included so plain exports open too. */
export const IMPORT_ACCEPT = '.json,.qpaper.json,.qpgbackup.json,application/json'

export interface PaperFile {
  kind: typeof PAPER_FILE_KIND
  version: number
  /** ISO-8601 */
  exportedAt: string
  app: string
  paper: Paper
}

export interface BackupPayload {
  papers: Paper[]
  bank: BankEntry[]
  settings: AppSettings
}

export interface BackupFile extends BackupPayload {
  kind: typeof BACKUP_FILE_KIND
  version: number
  /** ISO-8601 */
  exportedAt: string
  app: string
}

/** Thrown for input no amount of coercion can rescue — bad JSON, no paper at all. */
export class FileImportError extends Error {}

const APP_TAG = 'Question Paper Generator 1.0'

/* -------------------------------------------------------------------------- */
/*  Primitive guards                                                          */
/* -------------------------------------------------------------------------- */

type Dict = Record<string, unknown>

function isDict(value: unknown): value is Dict {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** `pick(input, 'name')` — undefined for anything that is not an object. */
function pick(input: unknown, key: string): unknown {
  return isDict(input) ? input[key] : undefined
}

function str(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value
  // Numbers are accepted because a hand-written file may quote-drop a class
  // ("class": 10) or a year ("academicYear": 2082).
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return fallback
}

/** Rich text, sanitised. */
function rich(value: unknown): string {
  const raw = typeof value === 'string' ? value : ''
  return raw ? sanitizeRichHtml(raw) : ''
}

function num(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

/** Marks and answer-line counts must be whole numbers. */
function int(value: unknown, fallback: number, min: number, max: number): number {
  return Math.round(num(value, fallback, min, max))
}

function bool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value
  // Checkbox state survives a spreadsheet round-trip as a string more often than
  // you would hope.
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback
}

/** Numeric equivalent of `oneOf`, for `optionColumns`. */
function oneOfNumber<T extends number>(value: unknown, allowed: readonly T[], fallback: T): T {
  const n = typeof value === 'number' ? value : Number(value)
  return (allowed as readonly number[]).includes(n) ? (n as T) : fallback
}

function isoDate(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || !value) return fallback
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString()
}

/**
 * Accepts a data URL and nothing else.
 *
 * A logo is rendered into an `<img src>`, so an arbitrary string here would be a
 * way to smuggle an off-origin request (or a `javascript:` URL on old engines)
 * into the page through an imported file. Inline data URLs are also the only
 * thing the rest of the app can handle: the DOCX exporter decodes them to bytes
 * and html2canvas needs them to avoid tainting the canvas.
 */
function dataUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return /^data:image\/[a-z0-9.+-]+[;,]/i.test(value.trim()) ? value.trim() : null
}

/* -------------------------------------------------------------------------- */
/*  Enum vocabularies                                                         */
/* -------------------------------------------------------------------------- */

const QUESTION_TYPES_LIST: readonly QuestionType[] = [
  'mcq',
  'truefalse',
  'fillblank',
  'veryshort',
  'short',
  'long',
  'matching',
  'custom',
]
const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard']
const NUMBER_STYLES: readonly NumberStyle[] = [
  'numeric',
  'lower-roman',
  'upper-roman',
  'lower-alpha',
  'upper-alpha',
]
const HEADER_STYLES: readonly HeaderStyle[] = ['modern', 'classic', 'compact', 'boxed']
const PAPER_FONTS_LIST: readonly PaperFont[] = ['serif', 'sans', 'book', 'modern']
const MARKS_STYLES: readonly MarksStyle[] = ['bracket-right', 'plain-right', 'inline']
const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'system']
const OPTION_COLUMNS = [1, 2, 4] as const

/* -------------------------------------------------------------------------- */
/*  Coercion                                                                  */
/* -------------------------------------------------------------------------- */

function coerceOption(input: unknown): MCQOption {
  return { id: uid('opt'), html: rich(pick(input, 'html')) }
}

function coerceMatchPair(input: unknown): MatchPair {
  return {
    id: uid('pair'),
    left: rich(pick(input, 'left')),
    right: rich(pick(input, 'right')),
  }
}

function coerceQuestionMeta(input: unknown): QuestionMeta {
  return {
    chapter: str(pick(input, 'chapter')),
    difficulty: oneOf(pick(input, 'difficulty'), DIFFICULTIES, 'medium'),
    tags: arr(pick(input, 'tags'))
      .map((tag) => str(tag).trim())
      .filter(Boolean)
      .slice(0, 24),
  }
}

/**
 * One question.
 *
 * The type is resolved first because it decides what the rest of the object is
 * even allowed to contain: an imported "mcq" with no options gets the four blank
 * options `createQuestion` would have given it, and an imported "long" that
 * somehow carries options has them dropped rather than silently rendered.
 */
export function coerceQuestion(input: unknown): Question {
  const type = oneOf(pick(input, 'type'), QUESTION_TYPES_LIST, 'custom')
  const spec = questionTypeSpec(type)
  const base = createQuestion(type)

  const options = spec.hasOptions
    ? arr(pick(input, 'options')).slice(0, 12).map(coerceOption)
    : []
  const matchPairs = spec.hasPairs
    ? arr(pick(input, 'matchPairs')).slice(0, 30).map(coerceMatchPair)
    : []

  // `correctOptionId` refers to ids we have just regenerated, so it has to be
  // re-resolved positionally against the file's own option list.
  let correctOptionId: string | null = null
  if (options.length) {
    const rawId = str(pick(input, 'correctOptionId'), '')
    const index = arr(pick(input, 'options')).findIndex(
      (option) => rawId !== '' && str(pick(option, 'id'), '') === rawId,
    )
    if (index >= 0 && index < options.length) correctOptionId = options[index].id
  }

  const tf = pick(input, 'tfAnswer')

  return {
    id: uid('q'),
    type,
    html: rich(pick(input, 'html')),
    marks: int(pick(input, 'marks'), spec.defaultMarks, 0, 200),
    // An "mcq" that arrived with no usable options gets the four blank ones a
    // brand-new MCQ would have, so the editor has something to show.
    options: options.length > 0 ? options : base.options,
    correctOptionId,
    matchPairs: matchPairs.length > 0 ? matchPairs : base.matchPairs,
    tfAnswer: typeof tf === 'boolean' ? tf : null,
    answerLines: int(pick(input, 'answerLines'), spec.defaultAnswerLines, 0, 40),
    optionColumns: oneOfNumber(pick(input, 'optionColumns'), OPTION_COLUMNS, base.optionColumns),
    meta: coerceQuestionMeta(pick(input, 'meta')),
  }
}

export function coerceSection(input: unknown, index: number): Section {
  const base = createSection(index)
  return {
    id: uid('sec'),
    title: str(pick(input, 'title'), base.title).slice(0, 160),
    note: str(pick(input, 'note')).slice(0, 400),
    marksNote: str(pick(input, 'marksNote')).slice(0, 120),
    questions: arr(pick(input, 'questions')).slice(0, 400).map(coerceQuestion),
    numberStyle: oneOf(pick(input, 'numberStyle'), NUMBER_STYLES, base.numberStyle),
    restartNumbering: bool(pick(input, 'restartNumbering'), base.restartNumbering),
    showSectionMarks: bool(pick(input, 'showSectionMarks'), base.showSectionMarks),
    pageBreakBefore: bool(pick(input, 'pageBreakBefore'), base.pageBreakBefore),
    collapsed: bool(pick(input, 'collapsed'), false),
  }
}

function coerceInstruction(input: unknown): Instruction {
  // Accepts both `{ id, text }` and a bare string, because a hand-written file
  // is far more likely to use the obvious `["Do this", "Do that"]` form.
  const text = typeof input === 'string' ? input : str(pick(input, 'text'))
  return createInstruction(text.slice(0, 500))
}

function coerceSchool(input: unknown): SchoolInfo {
  return {
    name: str(pick(input, 'name'), DEFAULT_SCHOOL.name).slice(0, 160),
    address: str(pick(input, 'address'), DEFAULT_SCHOOL.address).slice(0, 240),
    contact: str(pick(input, 'contact'), DEFAULT_SCHOOL.contact).slice(0, 240),
    affiliation: str(pick(input, 'affiliation'), DEFAULT_SCHOOL.affiliation).slice(0, 240),
    logoDataUrl: dataUrl(pick(input, 'logoDataUrl')),
  }
}

function coerceExam(input: unknown): ExamInfo {
  return {
    title: str(pick(input, 'title'), DEFAULT_EXAM.title).slice(0, 200),
    academicYear: str(pick(input, 'academicYear'), DEFAULT_EXAM.academicYear).slice(0, 60),
    className: str(pick(input, 'className'), DEFAULT_EXAM.className).slice(0, 60),
    subject: str(pick(input, 'subject'), DEFAULT_EXAM.subject).slice(0, 120),
    subjectCode: str(pick(input, 'subjectCode'), DEFAULT_EXAM.subjectCode).slice(0, 40),
    fullMarks: int(pick(input, 'fullMarks'), DEFAULT_EXAM.fullMarks, 0, 1000),
    passMarks: int(pick(input, 'passMarks'), DEFAULT_EXAM.passMarks, 0, 1000),
    timeAllowed: str(pick(input, 'timeAllowed'), DEFAULT_EXAM.timeAllowed).slice(0, 60),
    examDate: str(pick(input, 'examDate'), DEFAULT_EXAM.examDate).slice(0, 60),
    set: str(pick(input, 'set'), DEFAULT_EXAM.set).slice(0, 40),
  }
}

function coerceMargins(input: unknown): PageMargins {
  const d = DEFAULT_LAYOUT.margins
  // 5mm is about the narrowest an office printer will render; 40mm leaves a
  // usable column. Anything outside that came from a corrupt file.
  return {
    top: num(pick(input, 'top'), d.top, 5, 40),
    right: num(pick(input, 'right'), d.right, 5, 40),
    bottom: num(pick(input, 'bottom'), d.bottom, 5, 40),
    left: num(pick(input, 'left'), d.left, 5, 40),
  }
}

export function coerceLayout(input: unknown): PaperLayout {
  const d = DEFAULT_LAYOUT
  return {
    headerStyle: oneOf(pick(input, 'headerStyle'), HEADER_STYLES, d.headerStyle),
    font: oneOf(pick(input, 'font'), PAPER_FONTS_LIST, d.font),
    fontSizePt: num(pick(input, 'fontSizePt'), d.fontSizePt, 8, 16),
    lineHeight: num(pick(input, 'lineHeight'), d.lineHeight, 1.15, 2),
    margins: coerceMargins(pick(input, 'margins')),
    showLogo: bool(pick(input, 'showLogo'), d.showLogo),
    showStudentFields: bool(pick(input, 'showStudentFields'), d.showStudentFields),
    showPageNumbers: bool(pick(input, 'showPageNumbers'), d.showPageNumbers),
    showInstructions: bool(pick(input, 'showInstructions'), d.showInstructions),
    showSectionDividers: bool(pick(input, 'showSectionDividers'), d.showSectionDividers),
    marksStyle: oneOf(pick(input, 'marksStyle'), MARKS_STYLES, d.marksStyle),
    showAnswerKey: bool(pick(input, 'showAnswerKey'), d.showAnswerKey),
    endNote: str(pick(input, 'endNote'), d.endNote).slice(0, 160),
    questionSpacingMm: num(pick(input, 'questionSpacingMm'), d.questionSpacingMm, 0, 12),
  }
}

/**
 * Turns unknown JSON into a `Paper` that every consumer can safely render.
 *
 * Never throws. Accepts either a wrapped `PaperFile` or a bare paper object, so
 * a paper copied out of a backup file by hand still imports.
 */
export function coercePaper(input: unknown): Paper {
  const source = isDict(pick(input, 'paper')) ? (pick(input, 'paper') as Dict) : input
  const now = nowIso()

  const sections = arr(pick(source, 'sections'))
    .slice(0, 40)
    .map((section, index) => coerceSection(section, index))

  const instructions = arr(pick(source, 'instructions')).slice(0, 40).map(coerceInstruction)

  return createPaper({
    // A fresh id: importing the same file twice must give two papers, not a
    // collision inside the store's `papers` array.
    id: uid('paper'),
    name: str(pick(source, 'name'), '').trim().slice(0, 160) || 'Imported question paper',
    templateId: typeof pick(source, 'templateId') === 'string' ? str(pick(source, 'templateId')) : null,
    createdAt: isoDate(pick(source, 'createdAt'), now),
    updatedAt: now,
    school: coerceSchool(pick(source, 'school')),
    exam: coerceExam(pick(source, 'exam')),
    // A paper with no sections at all cannot be edited (there is nowhere to add
    // a question), so fall back to the single empty section a new paper gets.
    sections: sections.length ? sections : [createSection(0)],
    instructions,
    layout: coerceLayout(pick(source, 'layout')),
  })
}

export function coerceBankEntry(input: unknown): BankEntry {
  const question = coerceQuestion(pick(input, 'question') ?? input)
  return {
    id: uid('bank'),
    question,
    subject: str(pick(input, 'subject')).slice(0, 120),
    className: str(pick(input, 'className')).slice(0, 60),
    chapter: str(pick(input, 'chapter'), question.meta.chapter).slice(0, 120),
    difficulty: oneOf(pick(input, 'difficulty'), DIFFICULTIES, question.meta.difficulty),
    createdAt: isoDate(pick(input, 'createdAt'), nowIso()),
    usageCount: int(pick(input, 'usageCount'), 0, 0, 100000),
  }
}

export function coerceSettings(input: unknown): AppSettings {
  const d = DEFAULT_SETTINGS
  return {
    theme: oneOf(pick(input, 'theme'), THEME_MODES, d.theme),
    teacherName: str(pick(input, 'teacherName'), d.teacherName).slice(0, 120),
    teacherEmail: str(pick(input, 'teacherEmail'), d.teacherEmail).slice(0, 160),
    schoolPreset: coerceSchool(pick(input, 'schoolPreset')),
    layoutPreset: coerceLayout(pick(input, 'layoutPreset')),
    confirmBeforeDelete: bool(pick(input, 'confirmBeforeDelete'), d.confirmBeforeDelete),
    previewZoom: num(pick(input, 'previewZoom'), d.previewZoom, 0.5, 1.6),
    showMarksWarnings: bool(pick(input, 'showMarksWarnings'), d.showMarksWarnings),
    defaultAnswerLines: int(pick(input, 'defaultAnswerLines'), d.defaultAnswerLines, 0, 40),
  }
}

/* -------------------------------------------------------------------------- */
/*  Parsing                                                                   */
/* -------------------------------------------------------------------------- */

function parseJson(text: string): unknown {
  const trimmed = text.trim()
  if (!trimmed) throw new FileImportError('That file is empty.')
  try {
    return JSON.parse(trimmed)
  } catch {
    throw new FileImportError(
      'That file is not valid JSON. Choose a file exported from this app.',
    )
  }
}

/** True when the value looks like something we could read as a paper at all. */
function looksLikePaper(value: unknown): boolean {
  if (!isDict(value)) return false
  return (
    Array.isArray(value.sections) ||
    isDict(value.exam) ||
    isDict(value.school) ||
    isDict(value.layout)
  )
}

function looksLikeBackup(value: unknown): boolean {
  if (!isDict(value)) return false
  return value.kind === BACKUP_FILE_KIND || Array.isArray(value.papers)
}

/**
 * Reads one paper out of a JSON string.
 *
 * Deliberately generous about the wrapper: a `PaperFile`, a bare `Paper`, a
 * backup file (first paper wins) and a top-level array of papers all work. It
 * only throws when there is nothing paper-shaped anywhere in the file, because
 * importing a blank paper the teacher did not ask for would be worse than an
 * error message.
 */
export function parsePaperJson(text: string): Paper {
  const data = parseJson(text)

  if (Array.isArray(data)) {
    const first = data.find(looksLikePaper)
    if (!first) throw new FileImportError('No question paper was found in that file.')
    return coercePaper(first)
  }

  const wrapped = pick(data, 'paper')
  if (looksLikePaper(wrapped)) return coercePaper(wrapped)

  if (looksLikeBackup(data)) {
    const first = arr(pick(data, 'papers')).find(looksLikePaper)
    if (first) return coercePaper(first)
  }

  if (looksLikePaper(data)) return coercePaper(data)

  throw new FileImportError(
    'That file does not contain a question paper. Export one from “My Question Papers” to see the expected format.',
  )
}

/**
 * Reads a whole-library backup.
 *
 * Unlike `parsePaperJson` this is permissive about *emptiness* — restoring a
 * backup that happens to contain no papers but does contain the question bank
 * is a legitimate thing to do — but it still requires the file to be a backup
 * or a paper, so a random JSON file cannot wipe the library.
 */
export function parseBackupJson(text: string): BackupPayload {
  const data = parseJson(text)

  if (Array.isArray(data)) {
    const papers = data.filter(looksLikePaper).map(coercePaper)
    if (!papers.length) throw new FileImportError('No question papers were found in that file.')
    return { papers, bank: [], settings: coerceSettings(undefined) }
  }

  if (!looksLikeBackup(data)) {
    // A single-paper file is a valid (one paper) restore.
    if (looksLikePaper(data) || looksLikePaper(pick(data, 'paper'))) {
      return { papers: [parsePaperJson(text)], bank: [], settings: coerceSettings(undefined) }
    }
    throw new FileImportError('That file is not a Question Paper Generator backup.')
  }

  return {
    papers: arr(pick(data, 'papers')).slice(0, 500).map(coercePaper),
    bank: arr(pick(data, 'bank')).slice(0, 5000).map(coerceBankEntry),
    settings: coerceSettings(pick(data, 'settings')),
  }
}

/* -------------------------------------------------------------------------- */
/*  Reading files                                                             */
/* -------------------------------------------------------------------------- */

/**
 * `File.text()` is not available in every engine this app supports, and
 * `FileReader` is. The wrapper also turns a read failure into our own error
 * type so callers have exactly one `catch` shape to handle.
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () =>
      reject(new FileImportError('That file could not be read. It may be open in another program.'))
    reader.readAsText(file)
  })
}

/** Reads and validates a single-paper file. */
export async function readPaperJson(file: File): Promise<Paper> {
  return parsePaperJson(await readFileAsText(file))
}

/** Reads and validates a library backup. */
export async function readBackupJson(file: File): Promise<BackupPayload> {
  return parseBackupJson(await readFileAsText(file))
}

/* -------------------------------------------------------------------------- */
/*  Writing files                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Saves text as a download.
 *
 * The `file-saver` interop lives in `lib/saveBlob.ts`; see the note there for why
 * it is not called directly.
 */
async function saveTextFile(text: string, fileName: string, mime = 'application/json'): Promise<string> {
  await saveTextBlob(text, fileName, mime)
  return fileName
}

/** `class-10-science-first-terminal.qpaper.json` */
export function paperFileName(paper: Paper): string {
  const parts = [paper.exam.className, paper.exam.subject, paper.exam.title].filter((part) =>
    Boolean(part && part.trim()),
  )
  const base = slugify(parts.join(' ') || paper.name || 'question-paper')
  return `${base}${PAPER_FILE_EXTENSION}`
}

export function backupFileName(): string {
  // `nowIso()` is fine here: this only ever runs from a click handler, never
  // during render, so it cannot cause a hydration mismatch.
  const stamp = nowIso().slice(0, 10)
  return `question-papers-backup-${stamp}${BACKUP_FILE_EXTENSION}`
}

export function buildPaperFile(paper: Paper): PaperFile {
  return {
    kind: PAPER_FILE_KIND,
    version: FILE_FORMAT_VERSION,
    exportedAt: nowIso(),
    app: APP_TAG,
    paper,
  }
}

export function buildBackupFile(payload: BackupPayload): BackupFile {
  return {
    kind: BACKUP_FILE_KIND,
    version: FILE_FORMAT_VERSION,
    exportedAt: nowIso(),
    app: APP_TAG,
    papers: payload.papers,
    bank: payload.bank,
    settings: payload.settings,
  }
}

/** Downloads one paper. Returns the file name used, for the toast. */
export function exportPaperJson(paper: Paper, fileName?: string): Promise<string> {
  // Two-space indent: these files get opened in a text editor more often than
  // you would expect, and the size difference is noise next to the base64 logo.
  const text = JSON.stringify(buildPaperFile(paper), null, 2)
  return saveTextFile(text, fileName ?? paperFileName(paper))
}

/** Downloads the whole library: every paper, the question bank and settings. */
export function exportBackupJson(payload: BackupPayload, fileName?: string): Promise<string> {
  const text = JSON.stringify(buildBackupFile(payload), null, 2)
  return saveTextFile(text, fileName ?? backupFileName())
}
