/**
 * ============================================================================
 *  Question Paper Generator — CANONICAL DATA MODEL
 * ============================================================================
 *  This file is the single source of truth for the whole application.
 *
 *  Everything else derives from it:
 *    • the editor forms write into `Paper`
 *    • `lib/paperBlocks.ts` flattens `Paper` -> `PaperBlock[]`
 *    • the A4 preview paginates `PaperBlock[]` into pages
 *    • the PDF exporter rasterises those very same page elements
 *    • the DOCX exporter walks the very same `PaperBlock[]`
 *
 *  Because preview / PDF / DOCX all consume one block list, they cannot drift
 *  apart. If you add a feature, add it as a block kind — never as preview-only
 *  markup.
 *
 *  CONVENTIONS
 *  -----------
 *  1. Collections are never optional. `options`, `matchPairs`, `tags` are always
 *     arrays (possibly empty) so no consumer needs a null check.
 *  2. Dates are ISO-8601 strings, never `Date` objects (they must survive
 *     JSON round-tripping through localStorage).
 *  3. All lengths are millimetres; all type sizes are points. The preview
 *     converts with `MM_TO_PX`, DOCX converts with `mmToTwip` / `ptToHalfPt`.
 *  4. Rich text is stored as an HTML string produced by Tiptap, restricted to
 *     the whitelist documented in `RICH_TEXT_TAGS` below.
 */

/* -------------------------------------------------------------------------- */
/*  Rich text                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The exact set of tags the Tiptap editor can emit, and therefore the exact set
 * `lib/export/htmlToDocx.ts` must be able to translate. Keep the two in sync:
 * if you enable a new Tiptap extension, add its tag here AND handle it in the
 * DOCX walker, or it will silently vanish from Word exports.
 */
export const RICH_TEXT_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'sup',
  'sub',
  'code',
  'pre',
  'ul',
  'ol',
  'li',
  'img',
  'table',
  'tbody',
  'thead',
  'tr',
  'td',
  'th',
  'span',
] as const

/* -------------------------------------------------------------------------- */
/*  Questions                                                                  */
/* -------------------------------------------------------------------------- */

export type QuestionType =
  | 'mcq'
  | 'truefalse'
  | 'fillblank'
  | 'veryshort'
  | 'short'
  | 'long'
  | 'matching'
  | 'custom'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface MCQOption {
  id: string
  /** Rich text (usually a single inline run). */
  html: string
}

export interface MatchPair {
  id: string
  /** Column A cell — rich text. */
  left: string
  /** Column B cell — rich text. */
  right: string
}

export interface QuestionMeta {
  chapter: string
  difficulty: Difficulty
  tags: string[]
}

export interface Question {
  id: string
  type: QuestionType
  /** Tiptap HTML for the question stem. May contain several block-level nodes. */
  html: string
  marks: number
  /** MCQ choices. Empty array for every other type. */
  options: MCQOption[]
  /** id of the option in `options` that is correct, or null if unspecified. */
  correctOptionId: string | null
  /** Matching-type pairs. Empty array for every other type. */
  matchPairs: MatchPair[]
  /** True/False answer, or null if unspecified. */
  tfAnswer: boolean | null
  /** Number of ruled answer lines to print underneath the question. 0 = none. */
  answerLines: number
  /** How many MCQ options to place per printed row. */
  optionColumns: 1 | 2 | 4
  meta: QuestionMeta
}

/* -------------------------------------------------------------------------- */
/*  Sections                                                                   */
/* -------------------------------------------------------------------------- */

export type NumberStyle =
  | 'numeric'
  | 'lower-roman'
  | 'upper-roman'
  | 'lower-alpha'
  | 'upper-alpha'

export interface Section {
  id: string
  /** Free text, e.g. "Section A: Objective Questions". Fully user-editable. */
  title: string
  /** Optional line under the heading, e.g. "Attempt all questions." */
  note: string
  /** Optional marks arithmetic hint, e.g. "(10 × 1 = 10)". */
  marksNote: string
  questions: Question[]
  numberStyle: NumberStyle
  /** true = numbering restarts at 1 in this section; false = continues. */
  restartNumbering: boolean
  /** Print the section's marks total beside its heading. */
  showSectionMarks: boolean
  /** Force this section to start on a fresh page. */
  pageBreakBefore: boolean
  /** Collapsed in the editor sidebar (UI-only, still persisted for convenience). */
  collapsed: boolean
}

/* -------------------------------------------------------------------------- */
/*  Paper header data                                                          */
/* -------------------------------------------------------------------------- */

export interface SchoolInfo {
  name: string
  address: string
  contact: string
  /** e.g. "Affiliated to NEB" — printed small under the school name. */
  affiliation: string
  /** base64 data URL. Kept inline so papers are portable in localStorage. */
  logoDataUrl: string | null
}

export interface ExamInfo {
  title: string
  academicYear: string
  className: string
  subject: string
  subjectCode: string
  fullMarks: number
  passMarks: number
  /** Free text so "2 hrs 15 mins" and "1 Hr." both work. */
  timeAllowed: string
  /** Free text — schools use BS and AD dates interchangeably. */
  examDate: string
  /** e.g. "Set A". Empty string hides it. */
  set: string
}

export interface Instruction {
  id: string
  text: string
}

/* -------------------------------------------------------------------------- */
/*  Print layout                                                               */
/* -------------------------------------------------------------------------- */

export type HeaderStyle = 'modern' | 'classic' | 'compact' | 'boxed'

/** Maps to a `font-paper*` Tailwind family AND to a real Word font name. */
export type PaperFont = 'serif' | 'sans' | 'book' | 'modern'

export type MarksStyle = 'bracket-right' | 'plain-right' | 'inline'

export interface PageMargins {
  /** millimetres */
  top: number
  right: number
  bottom: number
  left: number
}

export interface PaperLayout {
  headerStyle: HeaderStyle
  font: PaperFont
  /** points, 8–16 */
  fontSizePt: number
  /** unitless multiplier, 1.15–2.0 */
  lineHeight: number
  margins: PageMargins
  showLogo: boolean
  showStudentFields: boolean
  showPageNumbers: boolean
  showInstructions: boolean
  /** Horizontal rule under the paper header and between sections. */
  showSectionDividers: boolean
  marksStyle: MarksStyle
  /** Teacher's copy: print the correct answer under each objective question. */
  showAnswerKey: boolean
  /** e.g. "*** Best of Luck ***". Empty string hides it. */
  endNote: string
  /** Extra space (mm) printed between questions. */
  questionSpacingMm: number
}

/* -------------------------------------------------------------------------- */
/*  Paper                                                                      */
/* -------------------------------------------------------------------------- */

export interface Paper {
  id: string
  /** Internal name shown in "My Question Papers", not printed. */
  name: string
  templateId: string | null
  /** ISO-8601 */
  createdAt: string
  /** ISO-8601 */
  updatedAt: string
  school: SchoolInfo
  exam: ExamInfo
  instructions: Instruction[]
  sections: Section[]
  layout: PaperLayout
}

/* -------------------------------------------------------------------------- */
/*  Question bank                                                              */
/* -------------------------------------------------------------------------- */

export interface BankEntry {
  id: string
  /** A deep copy of the question. Its own `id` is regenerated on insert. */
  question: Question
  subject: string
  className: string
  chapter: string
  difficulty: Difficulty
  /** ISO-8601 */
  createdAt: string
  usageCount: number
}

export interface BankFilters {
  search: string
  subject: string
  className: string
  chapter: string
  difficulty: Difficulty | 'all'
  type: QuestionType | 'all'
}

/* -------------------------------------------------------------------------- */
/*  Templates                                                                  */
/* -------------------------------------------------------------------------- */

export interface TemplateDefinition {
  id: string
  name: string
  description: string
  /** Short chip text, e.g. "Most used". Empty string hides the chip. */
  tag: string
  /** Tailwind gradient classes for the card header. */
  accent: string
  /** Bullet points shown on the template card. */
  highlights: string[]
  /**
   * Builds a brand-new paper. MUST call `uid()` for every id so two papers
   * created from the same template never collide.
   */
  create: () => Paper
}

/* -------------------------------------------------------------------------- */
/*  Settings                                                                   */
/* -------------------------------------------------------------------------- */

export type ThemeMode = 'light' | 'dark' | 'system'

export interface AppSettings {
  theme: ThemeMode
  teacherName: string
  teacherEmail: string
  schoolPreset: SchoolInfo
  layoutPreset: PaperLayout
  /**
   * Ask before deleting a question, section or paper. Edits are *always*
   * persisted to this browser automatically (there is no "unsaved" state to
   * lose), so this is the safety net that actually matters.
   */
  confirmBeforeDelete: boolean
  /** 0.5 – 1.6 */
  previewZoom: number
  showMarksWarnings: boolean
  /** Default answer lines applied to new short/long questions. */
  defaultAnswerLines: number
}

/* -------------------------------------------------------------------------- */
/*  Pagination / export blocks                                                 */
/* -------------------------------------------------------------------------- */

export type BlockKind =
  | 'header'
  | 'student-fields'
  | 'instructions-title'
  | 'instruction-item'
  | 'section-header'
  | 'question-stem'
  | 'question-cont'
  | 'mcq-row'
  | 'match-table'
  | 'answer-line'
  | 'answer-key'
  | 'end-note'
  | 'spacer'

interface BlockBase {
  /** Unique and stable for a given paper state. Used as the React key and as
   *  the measurement handle (`data-block-id`). */
  id: string
  /** Owning question or section id. Used for widow/orphan control. */
  groupId: string
  /**
   * How many *immediately following* blocks must fit on the same page as this
   * one. A section header with `keepWithNext: 2` will be pushed to the next
   * page rather than being stranded at the bottom without its first question.
   */
  keepWithNext: number
  /** Force a page break before this block. */
  breakBefore: boolean
}

export interface HeaderBlock extends BlockBase {
  kind: 'header'
}

export interface StudentFieldsBlock extends BlockBase {
  kind: 'student-fields'
}

export interface InstructionsTitleBlock extends BlockBase {
  kind: 'instructions-title'
  label: string
}

export interface InstructionItemBlock extends BlockBase {
  kind: 'instruction-item'
  /** 1-based printed index. */
  index: number
  text: string
}

export interface SectionHeaderBlock extends BlockBase {
  kind: 'section-header'
  title: string
  note: string
  marksNote: string
  /** null = do not print a marks total. */
  marks: number | null
}

export interface SectionHeaderContext {
  sectionId: string
  title: string
}

export interface QuestionStemBlock extends BlockBase {
  kind: 'question-stem'
  questionId: string
  /** Already formatted, e.g. "1." / "iv." / "b)". */
  number: string
  /** A single top-level HTML node from the question's rich text. */
  html: string
  /** null = do not print marks for this question. */
  marks: number | null
  questionType: QuestionType
}

export interface QuestionContBlock extends BlockBase {
  kind: 'question-cont'
  questionId: string
  /** A subsequent top-level HTML node from the same question. */
  html: string
}

export interface McqRowOption {
  /** "a)" / "b)" ... */
  label: string
  html: string
  correct: boolean
}

export interface McqRowBlock extends BlockBase {
  kind: 'mcq-row'
  questionId: string
  options: McqRowOption[]
  columns: 1 | 2 | 4
}

export interface MatchTableRow {
  leftLabel: string
  left: string
  rightLabel: string
  right: string
}

export interface MatchTableBlock extends BlockBase {
  kind: 'match-table'
  questionId: string
  rows: MatchTableRow[]
  /** Printed on the first chunk only. */
  showHead: boolean
  headLeft: string
  headRight: string
}

export interface AnswerLineBlock extends BlockBase {
  kind: 'answer-line'
  questionId: string
}

export interface AnswerKeyBlock extends BlockBase {
  kind: 'answer-key'
  questionId: string
  text: string
}

export interface EndNoteBlock extends BlockBase {
  kind: 'end-note'
  text: string
}

export interface SpacerBlock extends BlockBase {
  kind: 'spacer'
  /** millimetres */
  heightMm: number
}

export type PaperBlock =
  | HeaderBlock
  | StudentFieldsBlock
  | InstructionsTitleBlock
  | InstructionItemBlock
  | SectionHeaderBlock
  | QuestionStemBlock
  | QuestionContBlock
  | McqRowBlock
  | MatchTableBlock
  | AnswerLineBlock
  | AnswerKeyBlock
  | EndNoteBlock
  | SpacerBlock

/** One rendered A4 sheet. */
export interface PaginatedPage {
  index: number
  blocks: PaperBlock[]
}

/* -------------------------------------------------------------------------- */
/*  Marks                                                                      */
/* -------------------------------------------------------------------------- */

export type MarksStatus = 'balanced' | 'under' | 'over' | 'empty'

export interface SectionMarksSummary {
  sectionId: string
  title: string
  marks: number
  questionCount: number
}

export interface MarksSummary {
  total: number
  fullMarks: number
  /** fullMarks - total. Negative when over-allocated. */
  remaining: number
  status: MarksStatus
  questionCount: number
  sectionCount: number
  perSection: SectionMarksSummary[]
  /** 0–1, clamped, for the progress meter. */
  ratio: number
}

/* -------------------------------------------------------------------------- */
/*  Page geometry                                                              */
/* -------------------------------------------------------------------------- */

/** CSS reference pixels per millimetre at 96 dpi. */
export const MM_TO_PX = 96 / 25.4

export const A4_WIDTH_MM = 210
export const A4_HEIGHT_MM = 297

/** Height reserved at the foot of every page for "Page n of m". */
export const PAGE_FOOTER_MM = 8

export interface PageGeometry {
  widthMm: number
  heightMm: number
  contentWidthMm: number
  contentHeightMm: number
  widthPx: number
  heightPx: number
  contentWidthPx: number
  contentHeightPx: number
}

/**
 * The id of the element that contains nothing but A4 sheets.
 *
 * Part of the preview/PDF contract, which is why it lives here rather than in the
 * preview component: `lib/export/pdf.ts` rasterises this element's `[data-paper-
 * sheet]` children one page at a time, so it must never contain dashboard chrome.
 * The zoom wrapper and the page-count line sit outside it for that reason.
 */
export const PAPER_STACK_ID = 'qpg-paper-stack'
