import { DEFAULT_LAYOUT, SAMPLE_SCHOOL } from './defaults'
import { nowIso, uid } from './ids'
import type { Paper, Question, Section } from './types'

/**
 * The one example paper, loaded only when a teacher asks for it.
 *
 * Nothing here is ever seeded automatically. A teacher who opens the app for the
 * first time sees an empty library and a single "Create question paper" button;
 * the example arrives only through "See an example paper", and says on its face
 * that it is an example. That way there is never a moment where the app's own
 * demo content is mistaken for the teacher's work — or, worse, gets exported to
 * a real class.
 *
 * EVERY id in the literal below is hard-coded and every timestamp is a fixed ISO
 * string. That is deliberate: this module is imported during the first render
 * pass, and a value that differed between the server render and the client
 * hydration would blow up React. `createExamplePaper()` swaps in fresh ids at
 * call time — by then we are safely in an event handler.
 *
 * The rich text is written in the exact shape Tiptap emits — `<li><p>…</p></li>`,
 * `<table><tbody><tr><td colspan="1" rowspan="1"><p>…</p></td>` — so that opening
 * an example question in the editor round-trips it losslessly instead of
 * silently normalising content away.
 */

const T0 = '2026-08-18T04:15:00.000Z'
const T1 = '2026-08-21T10:40:00.000Z'

function q(partial: Partial<Question> & { id: string; type: Question['type'] }): Question {
  return {
    html: '',
    marks: 1,
    options: [],
    correctOptionId: null,
    matchPairs: [],
    tfAnswer: null,
    answerLines: 0,
    optionColumns: 1,
    meta: { chapter: '', difficulty: 'medium', tags: [] },
    ...partial,
  }
}

function section(partial: Partial<Section> & { id: string; title: string }): Section {
  return {
    note: '',
    marksNote: '',
    questions: [],
    numberStyle: 'numeric',
    restartNumbering: false,
    showSectionMarks: true,
    pageBreakBefore: false,
    collapsed: false,
    ...partial,
  }
}

/* ========================================================================== */
/*  Paper 1 — Class 8 Science, First Terminal Examination (fully written)      */
/* ========================================================================== */

const SCIENCE_SECTION_A = section({
  id: 'sec-sci-a',
  title: 'Section A: Objective Questions',
  note: 'Write the correct answer in your answer sheet.',
  marksNote: '(10 × 1 = 10)',
  questions: [
    q({
      id: 'q-sci-a1',
      type: 'mcq',
      marks: 1,
      optionColumns: 2,
      html: '<p>Which one of the following is a <strong>chemical change</strong>?</p>',
      options: [
        { id: 'o-a1-1', html: '<p>Melting of ice</p>' },
        { id: 'o-a1-2', html: '<p>Rusting of iron</p>' },
        { id: 'o-a1-3', html: '<p>Breaking of glass</p>' },
        { id: 'o-a1-4', html: '<p>Boiling of water</p>' },
      ],
      correctOptionId: 'o-a1-2',
      meta: { chapter: 'Matter and its changes', difficulty: 'easy', tags: ['change'] },
    }),
    q({
      id: 'q-sci-a2',
      type: 'mcq',
      marks: 1,
      optionColumns: 4,
      html: '<p>The SI unit of force is</p>',
      options: [
        { id: 'o-a2-1', html: '<p>joule</p>' },
        { id: 'o-a2-2', html: '<p>newton</p>' },
        { id: 'o-a2-3', html: '<p>watt</p>' },
        { id: 'o-a2-4', html: '<p>pascal</p>' },
      ],
      correctOptionId: 'o-a2-2',
      meta: { chapter: 'Force and motion', difficulty: 'easy', tags: ['units'] },
    }),
    q({
      id: 'q-sci-a3',
      type: 'mcq',
      marks: 1,
      optionColumns: 4,
      html: '<p>The chemical formula of water is</p>',
      options: [
        { id: 'o-a3-1', html: '<p>H<sub>2</sub>O</p>' },
        { id: 'o-a3-2', html: '<p>HO<sub>2</sub></p>' },
        { id: 'o-a3-3', html: '<p>H<sub>2</sub>O<sub>2</sub></p>' },
        { id: 'o-a3-4', html: '<p>OH</p>' },
      ],
      correctOptionId: 'o-a3-1',
      meta: { chapter: 'Matter and its changes', difficulty: 'easy', tags: ['formula'] },
    }),
    q({
      id: 'q-sci-a4',
      type: 'mcq',
      marks: 1,
      optionColumns: 4,
      html: '<p>The approximate speed of light in vacuum is</p>',
      options: [
        { id: 'o-a4-1', html: '<p>3 × 10<sup>6</sup> m/s</p>' },
        { id: 'o-a4-2', html: '<p>3 × 10<sup>8</sup> m/s</p>' },
        { id: 'o-a4-3', html: '<p>3 × 10<sup>10</sup> m/s</p>' },
        { id: 'o-a4-4', html: '<p>3 × 10<sup>5</sup> m/s</p>' },
      ],
      correctOptionId: 'o-a4-2',
      meta: { chapter: 'Light', difficulty: 'medium', tags: ['light'] },
    }),
    q({
      id: 'q-sci-a5',
      type: 'mcq',
      marks: 1,
      optionColumns: 2,
      html: '<p>Which organ of the human body pumps blood to all parts of the body?</p>',
      options: [
        { id: 'o-a5-1', html: '<p>Lungs</p>' },
        { id: 'o-a5-2', html: '<p>Heart</p>' },
        { id: 'o-a5-3', html: '<p>Kidney</p>' },
        { id: 'o-a5-4', html: '<p>Liver</p>' },
      ],
      correctOptionId: 'o-a5-2',
      meta: { chapter: 'Human body systems', difficulty: 'easy', tags: ['circulation'] },
    }),
    q({
      id: 'q-sci-a6',
      type: 'truefalse',
      marks: 1,
      html: '<p>Sound travels faster in air than in water.</p>',
      tfAnswer: false,
      meta: { chapter: 'Sound', difficulty: 'medium', tags: ['sound'] },
    }),
    q({
      id: 'q-sci-a7',
      type: 'truefalse',
      marks: 1,
      html: '<p>Photosynthesis takes place in the chloroplast of a plant cell.</p>',
      tfAnswer: true,
      meta: { chapter: 'Plant life', difficulty: 'easy', tags: ['photosynthesis'] },
    }),
    q({
      id: 'q-sci-a8',
      type: 'truefalse',
      marks: 1,
      html: '<p>Copper is a bad conductor of electricity.</p>',
      tfAnswer: false,
      meta: { chapter: 'Electricity', difficulty: 'easy', tags: ['conductors'] },
    }),
    q({
      id: 'q-sci-a9',
      type: 'fillblank',
      marks: 1,
      html: '<p>The process by which plants lose water through their leaves is called ________.</p>',
      meta: { chapter: 'Plant life', difficulty: 'medium', tags: ['transpiration'] },
    }),
    q({
      id: 'q-sci-a10',
      type: 'fillblank',
      marks: 1,
      html: '<p>The SI unit of electric current is ________ and it is measured using a ________.</p>',
      meta: { chapter: 'Electricity', difficulty: 'medium', tags: ['units'] },
    }),
  ],
})

const SCIENCE_SECTION_B = section({
  id: 'sec-sci-b',
  title: 'Section B: Short Answer Questions',
  note: 'Answer any five questions in brief.',
  marksNote: '(5 × 4 = 20)',
  questions: [
    q({
      id: 'q-sci-b1',
      type: 'short',
      marks: 4,
      answerLines: 5,
      html:
        '<p>Define <strong>photosynthesis</strong> and write its balanced chemical equation.</p>' +
        '<p>6CO<sub>2</sub> + 6H<sub>2</sub>O → C<sub>6</sub>H<sub>12</sub>O<sub>6</sub> + 6O<sub>2</sub></p>',
      meta: { chapter: 'Plant life', difficulty: 'medium', tags: ['photosynthesis'] },
    }),
    q({
      id: 'q-sci-b2',
      type: 'short',
      marks: 4,
      answerLines: 5,
      html:
        '<p>Write any <strong>four</strong> differences between a physical change and a chemical change with one example of each.</p>',
      meta: { chapter: 'Matter and its changes', difficulty: 'medium', tags: ['change'] },
    }),
    q({
      id: 'q-sci-b3',
      type: 'short',
      marks: 4,
      answerLines: 6,
      html:
        "<p>State Newton's three laws of motion.</p>" +
        '<ul><li><p>First law — law of inertia</p></li><li><p>Second law — <em>F</em> = <em>ma</em></p></li><li><p>Third law — action and reaction</p></li></ul>',
      meta: { chapter: 'Force and motion', difficulty: 'hard', tags: ['newton'] },
    }),
    q({
      id: 'q-sci-b4',
      type: 'short',
      marks: 4,
      answerLines: 6,
      html:
        '<p>Write the function of each of the following parts of a plant cell:</p>' +
        '<ol><li><p>Cell wall</p></li><li><p>Chloroplast</p></li><li><p>Vacuole</p></li><li><p>Nucleus</p></li></ol>',
      meta: { chapter: 'Plant life', difficulty: 'medium', tags: ['cell'] },
    }),
    q({
      id: 'q-sci-b5',
      type: 'short',
      marks: 4,
      answerLines: 5,
      html:
        '<p>What is meant by <em>renewable source of energy</em>? Write any three renewable sources of energy that are used in Nepal.</p>',
      meta: { chapter: 'Energy', difficulty: 'medium', tags: ['energy'] },
    }),
  ],
})

const SCIENCE_SECTION_C = section({
  id: 'sec-sci-c',
  title: 'Section C: Long Answer Questions',
  note: 'Answer all questions in detail.',
  marksNote: '(4 × 5 = 20)',
  questions: [
    q({
      id: 'q-sci-c1',
      type: 'matching',
      marks: 5,
      html: '<p>Match the instruments in Column A with the quantity they measure in Column B.</p>',
      matchPairs: [
        { id: 'p-c1-1', left: '<p>Thermometer</p>', right: '<p>Electric current</p>' },
        { id: 'p-c1-2', left: '<p>Barometer</p>', right: '<p>Temperature</p>' },
        { id: 'p-c1-3', left: '<p>Ammeter</p>', right: '<p>Wind speed</p>' },
        { id: 'p-c1-4', left: '<p>Anemometer</p>', right: '<p>Atmospheric pressure</p>' },
        { id: 'p-c1-5', left: '<p>Spring balance</p>', right: '<p>Weight</p>' },
      ],
      meta: { chapter: 'Measurement', difficulty: 'easy', tags: ['instruments'] },
    }),
    q({
      id: 'q-sci-c2',
      type: 'long',
      marks: 5,
      answerLines: 10,
      html:
        '<p>Explain the <strong>water cycle</strong> with the help of a labelled diagram. Mention any three human activities that disturb it.</p>',
      meta: { chapter: 'Environment', difficulty: 'medium', tags: ['water cycle'] },
    }),
    q({
      id: 'q-sci-c3',
      type: 'long',
      marks: 5,
      answerLines: 10,
      html:
        '<p>Describe an experiment to prove that <u>air exerts pressure</u>. Your answer should include:</p>' +
        '<ol><li><p>Apparatus required</p></li><li><p>Procedure</p></li><li><p>Observation</p></li><li><p>Conclusion</p></li></ol>',
      meta: { chapter: 'Air and pressure', difficulty: 'hard', tags: ['experiment'] },
    }),
    q({
      id: 'q-sci-c4',
      type: 'custom',
      marks: 5,
      answerLines: 6,
      html:
        '<p>Study the table given below and answer the questions that follow.</p>' +
        '<table><tbody>' +
        '<tr><th colspan="1" rowspan="1"><p>Metal</p></th><th colspan="1" rowspan="1"><p>Reaction with cold water</p></th><th colspan="1" rowspan="1"><p>Reaction with dilute acid</p></th></tr>' +
        '<tr><td colspan="1" rowspan="1"><p>Sodium</p></td><td colspan="1" rowspan="1"><p>Very fast</p></td><td colspan="1" rowspan="1"><p>Violent</p></td></tr>' +
        '<tr><td colspan="1" rowspan="1"><p>Zinc</p></td><td colspan="1" rowspan="1"><p>No reaction</p></td><td colspan="1" rowspan="1"><p>Steady</p></td></tr>' +
        '<tr><td colspan="1" rowspan="1"><p>Copper</p></td><td colspan="1" rowspan="1"><p>No reaction</p></td><td colspan="1" rowspan="1"><p>No reaction</p></td></tr>' +
        '</tbody></table>' +
        '<ol><li><p>Arrange the three metals in decreasing order of reactivity.</p></li>' +
        '<li><p>Why is sodium stored under kerosene?</p></li>' +
        '<li><p>Name the gas produced when zinc reacts with dilute hydrochloric acid.</p></li></ol>',
      meta: { chapter: 'Metals and non-metals', difficulty: 'hard', tags: ['reactivity', 'table'] },
    }),
  ],
})

const SCIENCE_PAPER: Paper = {
  id: 'paper-sample-science',
  name: 'Class 8 Science — First Terminal',
  templateId: 'terminal-exam',
  createdAt: T0,
  updatedAt: T1,
  school: { ...SAMPLE_SCHOOL },
  exam: {
    title: 'First Terminal Examination',
    academicYear: '2082 / 2083 B.S.',
    className: 'Class 8',
    subject: 'Science',
    subjectCode: 'SCI-08',
    fullMarks: 50,
    passMarks: 20,
    timeAllowed: '2 hrs',
    examDate: '2083-04-25 B.S. (10 August 2026)',
    set: 'Set A',
  },
  instructions: [
    { id: 'ins-sci-1', text: 'All questions are compulsory unless stated otherwise.' },
    { id: 'ins-sci-2', text: 'Write your answers in clear and legible handwriting.' },
    { id: 'ins-sci-3', text: 'Figures in the margin indicate full marks.' },
    { id: 'ins-sci-4', text: 'Draw neat diagrams wherever necessary.' },
    { id: 'ins-sci-5', text: 'Use of a calculator is not permitted.' },
  ],
  sections: [SCIENCE_SECTION_A, SCIENCE_SECTION_B, SCIENCE_SECTION_C],
  layout: {
    ...DEFAULT_LAYOUT,
    margins: { top: 16, right: 16, bottom: 14, left: 18 },
    headerStyle: 'classic',
    fontSizePt: 11,
    lineHeight: 1.45,
  },
}

/**
 * A fresh copy of the example paper, with new ids and today's date.
 *
 * Ids are regenerated on every call so that loading the example twice gives two
 * independent papers rather than one that overwrites the other — and so that
 * deleting it really deletes it.
 */
export function createExamplePaper(): Paper {
  const source = JSON.parse(JSON.stringify(SCIENCE_PAPER)) as Paper
  const stamp = nowIso()
  return {
    ...source,
    id: uid('paper'),
    isExample: true,
    createdAt: stamp,
    updatedAt: stamp,
    instructions: source.instructions.map((instruction) => ({ ...instruction, id: uid('ins') })),
    sections: source.sections.map((section) => ({
      ...section,
      id: uid('sec'),
      questions: section.questions.map((question) => ({
        ...question,
        id: uid('q'),
        options: question.options.map((option) => ({ ...option, id: uid('opt') })),
        matchPairs: question.matchPairs.map((pair) => ({ ...pair, id: uid('pair') })),
      })),
    })),
  }
}
