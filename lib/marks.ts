import { clone } from './ids'
import type {
  MarksStatus,
  MarksSummary,
  Paper,
  Question,
  Section,
  SectionMarksSummary,
} from './types'

export function sectionMarks(section: Section): number {
  return section.questions.reduce((sum, q) => sum + (Number.isFinite(q.marks) ? q.marks : 0), 0)
}

export function allQuestions(paper: Paper): Question[] {
  return paper.sections.flatMap((s) => s.questions)
}

export function computeMarks(paper: Paper): MarksSummary {
  const perSection: SectionMarksSummary[] = paper.sections.map((section) => ({
    sectionId: section.id,
    title: section.title,
    marks: sectionMarks(section),
    questionCount: section.questions.length,
  }))

  const total = perSection.reduce((sum, s) => sum + s.marks, 0)
  const questionCount = perSection.reduce((sum, s) => sum + s.questionCount, 0)
  const fullMarks = Number.isFinite(paper.exam.fullMarks) ? paper.exam.fullMarks : 0
  const remaining = fullMarks - total

  let status: MarksStatus
  if (questionCount === 0) status = 'empty'
  else if (remaining === 0) status = 'balanced'
  else if (remaining < 0) status = 'over'
  else status = 'under'

  const ratio = fullMarks > 0 ? Math.min(1, Math.max(0, total / fullMarks)) : 0

  return {
    total,
    fullMarks,
    remaining,
    status,
    questionCount,
    sectionCount: paper.sections.length,
    perSection,
    ratio,
  }
}

export interface MarksStatusCopy {
  tone: 'neutral' | 'good' | 'warn' | 'bad'
  title: string
  detail: string
}

export function describeMarksStatus(summary: MarksSummary): MarksStatusCopy {
  switch (summary.status) {
    case 'empty':
      return {
        tone: 'neutral',
        title: 'No questions yet',
        detail: 'Add your first question to start counting marks.',
      }
    case 'balanced':
      return {
        tone: 'good',
        title: 'Marks balanced',
        detail: `Question marks add up to exactly ${summary.fullMarks}.`,
      }
    case 'under':
      return {
        tone: 'warn',
        title: `${summary.remaining} mark${summary.remaining === 1 ? '' : 's'} remaining`,
        detail: `Questions total ${summary.total} of ${summary.fullMarks}. Add more questions or raise marks.`,
      }
    case 'over':
    default:
      return {
        tone: 'bad',
        title: `${Math.abs(summary.remaining)} mark${Math.abs(summary.remaining) === 1 ? '' : 's'} over`,
        detail: `Questions total ${summary.total} but full marks is ${summary.fullMarks}.`,
      }
  }
}

/**
 * Distributes `exam.fullMarks` across every question in the paper, preserving
 * the teacher's relative weighting.
 *
 *  • Existing marks act as weights; if every question is 0 they are weighted
 *    equally.
 *  • Results are whole numbers — nobody prints "2.33 marks".
 *  • Each question keeps at least 1 mark whenever there are enough marks to go
 *    round; if full marks is smaller than the question count the shortfall is
 *    taken from the last questions rather than producing fractions.
 *  • The remainder is handed to the questions with the largest fractional part,
 *    so the total lands exactly on full marks.
 */
export function autoBalanceMarks(paper: Paper): Paper {
  const next = clone(paper)
  const questions = allQuestions(next)
  const count = questions.length
  const target = Math.max(0, Math.round(next.exam.fullMarks || 0))

  if (count === 0 || target === 0) return next

  const weights = questions.map((q) => (Number.isFinite(q.marks) && q.marks > 0 ? q.marks : 0))
  const weightSum = weights.reduce((a, b) => a + b, 0)
  const effective = weightSum > 0 ? weights : questions.map(() => 1)
  const effectiveSum = effective.reduce((a, b) => a + b, 0)

  const minPer = target >= count ? 1 : 0
  const distributable = target - minPer * count

  const raw = effective.map((w) => (distributable * w) / effectiveSum)
  const floors = raw.map((v) => Math.floor(v))
  let assigned = floors.reduce((a, b) => a + b, 0)

  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i)

  let cursor = 0
  while (assigned < distributable && order.length > 0) {
    floors[order[cursor % order.length].i] += 1
    assigned += 1
    cursor += 1
  }

  questions.forEach((q, i) => {
    q.marks = minPer + floors[i]
  })

  // If full marks is smaller than the number of questions, `minPer` is 0 and
  // some questions legitimately end up at 0 — surface that rather than hide it.
  return next
}

/**
 * Rebalances a single section to a target total, leaving other sections alone.
 */
export function balanceSectionTo(paper: Paper, sectionId: string, target: number): Paper {
  const next = clone(paper)
  const section = next.sections.find((s) => s.id === sectionId)
  if (!section || section.questions.length === 0) return next

  const count = section.questions.length
  const goal = Math.max(0, Math.round(target))
  const base = Math.floor(goal / count)
  let remainder = goal - base * count

  section.questions.forEach((q) => {
    q.marks = base + (remainder > 0 ? 1 : 0)
    if (remainder > 0) remainder -= 1
  })

  return next
}

/** "3 marks" / "1 mark" */
export function marksWord(marks: number): string {
  return `${marks} ${Math.abs(marks) === 1 ? 'mark' : 'marks'}`
}

/**
 * Builds the "(5 × 2 = 10)" style arithmetic note for a section, when every
 * question in it carries the same marks. Returns '' when marks are mixed.
 */
export function suggestMarksNote(section: Section): string {
  if (section.questions.length === 0) return ''
  const first = section.questions[0].marks
  const uniform = section.questions.every((q) => q.marks === first)
  if (!uniform) return ''
  return `(${section.questions.length} × ${first} = ${section.questions.length * first})`
}
