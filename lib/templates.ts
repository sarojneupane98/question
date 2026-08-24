import {
  DEFAULT_LAYOUT,
  createInstruction,
  createPaper,
  createQuestion,
  createSection,
} from './defaults'
import type { Paper, PaperLayout, Question, QuestionType, Section, TemplateDefinition } from './types'

/**
 * Templates are *structural scaffolds*, not content. Each one lays out the
 * sections, question types, counts and marks that a given exam format demands,
 * so a teacher opens it and immediately has "Group A — 11 questions × 1 mark"
 * ready to type into, with the marks total already landing on full marks.
 */

interface QuestionSpec {
  type: QuestionType
  count: number
  marks: number
  answerLines?: number
  optionColumns?: 1 | 2 | 4
}

function buildQuestions(spec: QuestionSpec): Question[] {
  return Array.from({ length: spec.count }, () =>
    createQuestion(spec.type, {
      marks: spec.marks,
      ...(spec.answerLines === undefined ? {} : { answerLines: spec.answerLines }),
      ...(spec.optionColumns === undefined ? {} : { optionColumns: spec.optionColumns }),
    }),
  )
}

interface SectionSpec {
  title: string
  note?: string
  marksNote?: string
  numberStyle?: Section['numberStyle']
  restartNumbering?: boolean
  pageBreakBefore?: boolean
  questions: QuestionSpec[]
}

function buildSection(index: number, spec: SectionSpec): Section {
  return createSection(index, {
    title: spec.title,
    note: spec.note ?? '',
    marksNote: spec.marksNote ?? '',
    numberStyle: spec.numberStyle ?? 'numeric',
    restartNumbering: spec.restartNumbering ?? false,
    pageBreakBefore: spec.pageBreakBefore ?? false,
    questions: spec.questions.flatMap(buildQuestions),
  })
}

interface TemplateSpec {
  name: string
  paperName: string
  examTitle: string
  fullMarks: number
  passMarks: number
  time: string
  instructions: string[]
  layout?: Partial<PaperLayout>
  sections: SectionSpec[]
}

function buildPaper(templateId: string, spec: TemplateSpec): Paper {
  const paper = createPaper({
    name: spec.paperName,
    templateId,
    instructions: spec.instructions.map((text) => createInstruction(text)),
    sections: spec.sections.map((section, i) => buildSection(i, section)),
    layout: {
      ...DEFAULT_LAYOUT,
      ...(spec.layout ?? {}),
      margins: { ...DEFAULT_LAYOUT.margins, ...(spec.layout?.margins ?? {}) },
    },
  })
  paper.exam = {
    ...paper.exam,
    title: spec.examTitle,
    fullMarks: spec.fullMarks,
    passMarks: spec.passMarks,
    timeAllowed: spec.time,
  }
  return paper
}

/* -------------------------------------------------------------------------- */

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: 'school-exam',
    name: 'School Examination',
    description:
      'The full three-section school paper: objective, short answer and long answer, adding up to 100 marks.',
    tag: 'Most used',
    accent: 'from-brand-500 to-brand-700',
    highlights: ['100 full marks', '3 sections', '35 questions laid out'],
    create: () =>
      buildPaper('school-exam', {
        name: 'School Examination',
        paperName: 'School Examination',
        examTitle: 'Annual Examination',
        fullMarks: 100,
        passMarks: 40,
        time: '3 hrs',
        instructions: [
          'All questions are compulsory.',
          'Write your answers in clear and legible handwriting.',
          'Figures in the margin indicate full marks.',
          'Draw diagrams wherever necessary.',
        ],
        sections: [
          {
            title: 'Section A: Objective Questions',
            note: 'Tick (✓) the best answer.',
            marksNote: '(20 × 1 = 20)',
            questions: [{ type: 'mcq', count: 20, marks: 1, optionColumns: 2 }],
          },
          {
            title: 'Section B: Short Answer Questions',
            note: 'Answer in brief.',
            marksNote: '(10 × 4 = 40)',
            questions: [{ type: 'short', count: 10, marks: 4, answerLines: 5 }],
          },
          {
            title: 'Section C: Long Answer Questions',
            note: 'Answer in detail.',
            marksNote: '(5 × 8 = 40)',
            questions: [{ type: 'long', count: 5, marks: 8, answerLines: 10 }],
          },
        ],
      }),
  },
  {
    id: 'unit-test',
    name: 'Unit Test',
    description: 'A quick 20-mark check after finishing one chapter or unit. Fits on a single page.',
    tag: '',
    accent: 'from-emerald-500 to-teal-600',
    highlights: ['20 full marks', '45 minutes', 'Single page'],
    create: () =>
      buildPaper('unit-test', {
        name: 'Unit Test',
        paperName: 'Unit Test',
        examTitle: 'Unit Test',
        fullMarks: 20,
        passMarks: 8,
        time: '45 mins',
        instructions: ['Attempt all questions.', 'Marks are shown against each question.'],
        layout: { showStudentFields: true, questionSpacingMm: 1.5, fontSizePt: 11 },
        sections: [
          {
            title: 'Section A: Objective Questions',
            marksNote: '(10 × 1 = 10)',
            questions: [{ type: 'mcq', count: 10, marks: 1, optionColumns: 4 }],
          },
          {
            title: 'Section B: Short Answer Questions',
            marksNote: '(5 × 2 = 10)',
            questions: [{ type: 'veryshort', count: 5, marks: 2, answerLines: 2 }],
          },
        ],
      }),
  },
  {
    id: 'monthly-test',
    name: 'Monthly Test',
    description: 'Balanced 30-mark monthly assessment covering objective, short and long questions.',
    tag: '',
    accent: 'from-sky-500 to-blue-600',
    highlights: ['30 full marks', '1 hour', 'Mixed question types'],
    create: () =>
      buildPaper('monthly-test', {
        name: 'Monthly Test',
        paperName: 'Monthly Test',
        examTitle: 'Monthly Test',
        fullMarks: 30,
        passMarks: 12,
        time: '1 hr',
        instructions: [
          'All questions are compulsory.',
          'Figures in the margin indicate full marks.',
        ],
        sections: [
          {
            title: 'Section A',
            note: 'Choose the correct answer.',
            marksNote: '(10 × 1 = 10)',
            questions: [{ type: 'mcq', count: 10, marks: 1, optionColumns: 2 }],
          },
          {
            title: 'Section B',
            note: 'Answer in short.',
            marksNote: '(5 × 2 = 10)',
            questions: [{ type: 'veryshort', count: 5, marks: 2, answerLines: 3 }],
          },
          {
            title: 'Section C',
            note: 'Answer in detail.',
            marksNote: '(2 × 5 = 10)',
            questions: [{ type: 'long', count: 2, marks: 5, answerLines: 8 }],
          },
        ],
      }),
  },
  {
    id: 'terminal-exam',
    name: 'Terminal Examination',
    description:
      'First / second / third terminal format used by most secondary schools — 75 marks over three hours.',
    tag: 'Popular',
    accent: 'from-violet-500 to-purple-700',
    highlights: ['75 full marks', '3 sections', 'Terminal wording ready'],
    create: () =>
      buildPaper('terminal-exam', {
        name: 'Terminal Examination',
        paperName: 'Terminal Examination',
        examTitle: 'First Terminal Examination',
        fullMarks: 75,
        passMarks: 30,
        time: '3 hrs',
        instructions: [
          'All questions are compulsory.',
          'Answers should be to the point.',
          'Figures in the margin indicate full marks.',
        ],
        sections: [
          {
            title: 'Section A: Objective Questions',
            note: 'Rewrite the correct answer.',
            marksNote: '(15 × 1 = 15)',
            questions: [{ type: 'mcq', count: 15, marks: 1, optionColumns: 2 }],
          },
          {
            title: 'Section B: Short Answer Questions',
            note: 'Answer any ten questions.',
            marksNote: '(10 × 3 = 30)',
            questions: [{ type: 'short', count: 10, marks: 3, answerLines: 4 }],
          },
          {
            title: 'Section C: Long Answer Questions',
            note: 'Answer all questions.',
            marksNote: '(6 × 5 = 30)',
            questions: [{ type: 'long', count: 6, marks: 5, answerLines: 9 }],
          },
        ],
      }),
  },
  {
    id: 'see-style',
    name: 'SEE Style Question Paper',
    description:
      'Secondary Education Examination pattern: Group A very short, Group B short and Group C long, 75 marks.',
    tag: 'Board pattern',
    accent: 'from-amber-500 to-orange-600',
    highlights: ['75 full marks', 'Group A / B / C', 'Roman numbering in Group A'],
    create: () =>
      buildPaper('see-style', {
        name: 'SEE Model Question Paper',
        paperName: 'SEE Model Question Paper',
        examTitle: 'Secondary Education Examination (Model)',
        fullMarks: 75,
        passMarks: 30,
        time: '3 hrs',
        instructions: [
          'All the questions are compulsory.',
          'The answers should be written in clear and legible handwriting.',
          'Candidates are required to give their answers in their own words as far as practicable.',
          'Figures in the margin indicate full marks.',
        ],
        layout: { headerStyle: 'classic', showSectionDividers: true },
        sections: [
          {
            title: 'Group A: Very Short Answer Questions',
            note: 'Answer all the questions.',
            marksNote: '(11 × 1 = 11)',
            numberStyle: 'numeric',
            questions: [{ type: 'veryshort', count: 11, marks: 1, answerLines: 1 }],
          },
          {
            title: 'Group B: Short Answer Questions',
            note: 'Answer all the questions.',
            marksNote: '(8 × 5 = 40)',
            questions: [{ type: 'short', count: 8, marks: 5, answerLines: 6 }],
          },
          {
            title: 'Group C: Long Answer Questions',
            note: 'Answer all the questions.',
            marksNote: '(3 × 8 = 24)',
            questions: [{ type: 'long', count: 3, marks: 8, answerLines: 12 }],
          },
        ],
      }),
  },
  {
    id: 'blank',
    name: 'Custom Template',
    description: 'An empty paper with sensible print settings. Build the structure exactly how you want it.',
    tag: '',
    accent: 'from-ink-500 to-ink-700',
    highlights: ['One empty section', 'Your school preset applied', 'Full control'],
    create: () => {
      const paper = createPaper({ name: 'Untitled question paper', templateId: 'blank' })
      paper.sections = [createSection(0, { title: 'Section A' })]
      return paper
    },
  },
]

export function getTemplate(templateId: string): TemplateDefinition | null {
  return TEMPLATES.find((t) => t.id === templateId) ?? null
}

export function templateName(templateId: string | null): string {
  if (!templateId) return 'Custom'
  return getTemplate(templateId)?.name ?? 'Custom'
}
