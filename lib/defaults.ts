import { uid, nowIso } from './ids'
import type {
  AppSettings,
  Difficulty,
  ExamInfo,
  Instruction,
  Paper,
  PaperLayout,
  Question,
  QuestionType,
  SchoolInfo,
  Section,
} from './types'

/* -------------------------------------------------------------------------- */
/*  Question type registry                                                     */
/* -------------------------------------------------------------------------- */

export interface QuestionTypeSpec {
  id: QuestionType
  label: string
  /** Compact label for chips. */
  short: string
  description: string
  /** Key consumed by `components/ui/QuestionTypeIcon.tsx`. */
  iconKey:
    | 'circle-dot'
    | 'check-square'
    | 'minus-square'
    | 'align-left'
    | 'text'
    | 'file-text'
    | 'arrow-left-right'
    | 'sparkles'
  defaultMarks: number
  defaultAnswerLines: number
  hasOptions: boolean
  hasPairs: boolean
  /** Printed hint appended to the stem, e.g. "(Choose the best answer.)" */
  stemHint: string
  /** Tailwind classes for the type badge. */
  badgeClass: string
}

export const QUESTION_TYPES: QuestionTypeSpec[] = [
  {
    id: 'mcq',
    label: 'Multiple Choice',
    short: 'MCQ',
    description: 'Four or more options, one correct answer.',
    iconKey: 'circle-dot',
    defaultMarks: 1,
    defaultAnswerLines: 0,
    hasOptions: true,
    hasPairs: false,
    stemHint: '',
    badgeClass: 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300',
  },
  {
    id: 'truefalse',
    label: 'True / False',
    short: 'T/F',
    description: 'Statement the student marks true or false.',
    iconKey: 'check-square',
    defaultMarks: 1,
    defaultAnswerLines: 0,
    hasOptions: false,
    hasPairs: false,
    stemHint: '',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  },
  {
    id: 'fillblank',
    label: 'Fill in the Blanks',
    short: 'Fill',
    description: 'Use ____ in the text to mark each blank.',
    iconKey: 'minus-square',
    defaultMarks: 1,
    defaultAnswerLines: 0,
    hasOptions: false,
    hasPairs: false,
    stemHint: '',
    badgeClass: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  },
  {
    id: 'veryshort',
    label: 'Very Short Answer',
    short: 'V. Short',
    description: 'One word or one sentence answer.',
    iconKey: 'text',
    defaultMarks: 2,
    defaultAnswerLines: 2,
    hasOptions: false,
    hasPairs: false,
    stemHint: '',
    badgeClass: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  },
  {
    id: 'short',
    label: 'Short Answer',
    short: 'Short',
    description: 'A short paragraph, usually 3–5 marks.',
    iconKey: 'align-left',
    defaultMarks: 3,
    defaultAnswerLines: 4,
    hasOptions: false,
    hasPairs: false,
    stemHint: '',
    badgeClass: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  },
  {
    id: 'long',
    label: 'Long Answer',
    short: 'Long',
    description: 'Essay style answer with plenty of writing space.',
    iconKey: 'file-text',
    defaultMarks: 5,
    defaultAnswerLines: 8,
    hasOptions: false,
    hasPairs: false,
    stemHint: '',
    badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  },
  {
    id: 'matching',
    label: 'Matching',
    short: 'Match',
    description: 'Two columns the student joins together.',
    iconKey: 'arrow-left-right',
    defaultMarks: 4,
    defaultAnswerLines: 0,
    hasOptions: false,
    hasPairs: true,
    stemHint: '',
    badgeClass: 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
  },
  {
    id: 'custom',
    label: 'Custom Question',
    short: 'Custom',
    description: 'A free-form question — tables, images, anything.',
    iconKey: 'sparkles',
    defaultMarks: 2,
    defaultAnswerLines: 0,
    hasOptions: false,
    hasPairs: false,
    stemHint: '',
    badgeClass: 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200',
  },
]

const TYPE_MAP: Record<QuestionType, QuestionTypeSpec> = QUESTION_TYPES.reduce(
  (acc, spec) => {
    acc[spec.id] = spec
    return acc
  },
  {} as Record<QuestionType, QuestionTypeSpec>,
)

export function questionTypeSpec(type: QuestionType): QuestionTypeSpec {
  return TYPE_MAP[type] ?? TYPE_MAP.custom
}

/* -------------------------------------------------------------------------- */
/*  Layout / header defaults                                                   */
/* -------------------------------------------------------------------------- */

export const DEFAULT_LAYOUT: PaperLayout = {
  headerStyle: 'classic',
  font: 'serif',
  fontSizePt: 11,
  lineHeight: 1.45,
  margins: { top: 18, right: 16, bottom: 16, left: 18 },
  showLogo: true,
  showStudentFields: true,
  showPageNumbers: true,
  showInstructions: true,
  showSectionDividers: true,
  marksStyle: 'bracket-right',
  showAnswerKey: false,
  endNote: '*** Best of Luck ***',
  questionSpacingMm: 2,
}

export const DEFAULT_SCHOOL: SchoolInfo = {
  name: '',
  address: '',
  contact: '',
  affiliation: '',
  logoDataUrl: null,
}

/**
 * The school the seed papers belong to, and the school preset a first-run user
 * starts with.
 *
 * It is here rather than in `sample.ts` because `DEFAULT_SETTINGS` needs it and
 * `sample.ts` already imports from this file — the other direction would be a
 * cycle. Seeding the preset matters: without it, "Create Question Paper" would
 * produce a sheet with a blank header, which reads as broken rather than empty.
 */
export const SAMPLE_SCHOOL: SchoolInfo = {
  name: 'Step by Step English Secondary School',
  address: 'Baneshwor, Kathmandu, Nepal',
  contact: 'Tel: 01-4567890  •  info@stepbystep.edu.np',
  affiliation: 'Affiliated to National Examinations Board',
  logoDataUrl: null,
}

export const DEFAULT_EXAM: ExamInfo = {
  title: 'First Terminal Examination',
  academicYear: '',
  className: '',
  subject: '',
  subjectCode: '',
  fullMarks: 50,
  passMarks: 20,
  timeAllowed: '1 hr 30 mins',
  examDate: '',
  set: '',
}

export const HEADER_STYLE_OPTIONS: Array<{
  value: PaperLayout['headerStyle']
  label: string
  hint: string
}> = [
  { value: 'classic', label: 'Classic', hint: 'Centred school name, ruled meta row' },
  { value: 'modern', label: 'Modern', hint: 'Logo on the left, details on the right' },
  { value: 'compact', label: 'Compact', hint: 'Two tight lines — saves vertical space' },
  { value: 'boxed', label: 'Boxed', hint: 'Everything inside a printed border' },
]

export const MARKS_STYLE_OPTIONS: Array<{
  value: PaperLayout['marksStyle']
  label: string
  hint: string
}> = [
  { value: 'bracket-right', label: '[2]', hint: 'Bracketed, right aligned' },
  { value: 'plain-right', label: '2', hint: 'Plain number, right aligned' },
  { value: 'inline', label: '(2 marks)', hint: 'Inline after the question' },
]

/**
 * Difficulty is bank metadata only — it is never printed on the paper, so the
 * labels here are the whole of its user-facing vocabulary.
 */
export const DIFFICULTY_OPTIONS: Array<{ value: Difficulty; label: string }> = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
]

/* -------------------------------------------------------------------------- */
/*  Factories                                                                  */
/* -------------------------------------------------------------------------- */

export function createOption(html = ''): { id: string; html: string } {
  return { id: uid('opt'), html }
}

export function createMatchPair(left = '', right = ''): { id: string; left: string; right: string } {
  return { id: uid('pair'), left, right }
}

export function createQuestion(type: QuestionType = 'short', overrides: Partial<Question> = {}): Question {
  const spec = questionTypeSpec(type)
  const base: Question = {
    id: uid('q'),
    type,
    html: '',
    marks: spec.defaultMarks,
    options: spec.hasOptions
      ? [createOption(''), createOption(''), createOption(''), createOption('')]
      : [],
    correctOptionId: null,
    matchPairs: spec.hasPairs
      ? [createMatchPair(), createMatchPair(), createMatchPair(), createMatchPair()]
      : [],
    tfAnswer: null,
    answerLines: spec.defaultAnswerLines,
    optionColumns: type === 'mcq' ? 2 : 1,
    meta: { chapter: '', difficulty: 'medium', tags: [] },
  }
  return { ...base, ...overrides }
}

/**
 * Converts a question to a different type, keeping the stem and marks and
 * filling in whatever the new type needs. Used by the type dropdown on each
 * question card.
 */
export function convertQuestionType(question: Question, type: QuestionType): Question {
  const spec = questionTypeSpec(type)
  const next: Question = { ...question, type }

  if (spec.hasOptions && next.options.length === 0) {
    next.options = [createOption(''), createOption(''), createOption(''), createOption('')]
    next.optionColumns = 2
  }
  if (!spec.hasOptions) {
    next.correctOptionId = null
  }
  if (spec.hasPairs && next.matchPairs.length === 0) {
    next.matchPairs = [createMatchPair(), createMatchPair(), createMatchPair(), createMatchPair()]
  }
  if (type !== 'truefalse') {
    next.tfAnswer = null
  }
  // Only adopt the new type's writing space if the teacher hasn't customised it.
  const previousSpec = questionTypeSpec(question.type)
  if (question.answerLines === previousSpec.defaultAnswerLines) {
    next.answerLines = spec.defaultAnswerLines
  }
  return next
}

export function createSection(index: number, overrides: Partial<Section> = {}): Section {
  const base: Section = {
    id: uid('sec'),
    title: `Section ${String.fromCharCode(65 + (index % 26))}`,
    note: '',
    marksNote: '',
    questions: [],
    numberStyle: 'numeric',
    restartNumbering: false,
    showSectionMarks: true,
    pageBreakBefore: false,
    collapsed: false,
  }
  return { ...base, ...overrides }
}

export function createInstruction(text = ''): Instruction {
  return { id: uid('ins'), text }
}

export function createPaper(overrides: Partial<Paper> = {}): Paper {
  const ts = nowIso()
  const base: Paper = {
    id: uid('paper'),
    name: 'Untitled question paper',
    templateId: null,
    createdAt: ts,
    updatedAt: ts,
    school: { ...DEFAULT_SCHOOL },
    exam: { ...DEFAULT_EXAM },
    instructions: [
      createInstruction('All questions are compulsory.'),
      createInstruction('Write your answers neatly and legibly.'),
      createInstruction('Figures in the margin indicate full marks.'),
    ],
    sections: [createSection(0, { title: 'Section A' })],
    layout: { ...DEFAULT_LAYOUT, margins: { ...DEFAULT_LAYOUT.margins } },
  }
  return { ...base, ...overrides }
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  teacherName: '',
  teacherEmail: '',
  schoolPreset: { ...SAMPLE_SCHOOL },
  layoutPreset: { ...DEFAULT_LAYOUT, margins: { ...DEFAULT_LAYOUT.margins } },
  confirmBeforeDelete: true,
  previewZoom: 0.85,
  showMarksWarnings: true,
  defaultAnswerLines: 4,
}
