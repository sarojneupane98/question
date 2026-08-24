import { DEFAULT_LAYOUT, SAMPLE_SCHOOL } from './defaults'
import type { BankEntry, Paper, Question, Section } from './types'

/**
 * Seed content, loaded the first time the app runs.
 *
 * EVERY id in this file is a hard-coded literal. Nothing here may call `uid()`
 * or `Date.now()`: seed data is constructed during the very first render pass,
 * and a value that differed between the server render and the client hydration
 * would blow up React. Timestamps are fixed ISO strings for the same reason.
 *
 * The rich text is written in the exact shape Tiptap emits — `<li><p>…</p></li>`,
 * `<table><tbody><tr><td colspan="1" rowspan="1"><p>…</p></td>` — so that opening
 * a sample question in the editor round-trips it losslessly instead of silently
 * normalising content away.
 */

const T0 = '2026-08-18T04:15:00.000Z'
const T1 = '2026-08-21T10:40:00.000Z'
const T2 = '2026-08-12T06:05:00.000Z'
const T3 = '2026-08-05T11:20:00.000Z'

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

/* ========================================================================== */
/*  Paper 2 — Class 10 Mathematics unit test                                   */
/* ========================================================================== */

const MATHS_PAPER: Paper = {
  id: 'paper-sample-maths',
  name: 'Class 10 Maths — Unit Test (Mensuration)',
  templateId: 'unit-test',
  createdAt: T2,
  updatedAt: T2,
  school: { ...SAMPLE_SCHOOL },
  exam: {
    title: 'Unit Test — Mensuration',
    academicYear: '2082 / 2083 B.S.',
    className: 'Class 10',
    subject: 'Mathematics',
    subjectCode: 'MAT-10',
    fullMarks: 20,
    passMarks: 8,
    timeAllowed: '45 mins',
    examDate: '2083-04-12 B.S.',
    set: '',
  },
  instructions: [
    { id: 'ins-mat-1', text: 'Attempt all questions.' },
    { id: 'ins-mat-2', text: 'Show all necessary steps of your working.' },
    { id: 'ins-mat-3', text: 'Take π = 22/7 unless stated otherwise.' },
  ],
  sections: [
    section({
      id: 'sec-mat-a',
      title: 'Section A: Objective Questions',
      marksNote: '(5 × 1 = 5)',
      questions: [
        q({
          id: 'q-mat-a1',
          type: 'mcq',
          marks: 1,
          optionColumns: 4,
          html: '<p>The volume of a cube of edge <em>a</em> is</p>',
          options: [
            { id: 'o-m1-1', html: '<p>6<em>a</em><sup>2</sup></p>' },
            { id: 'o-m1-2', html: '<p><em>a</em><sup>3</sup></p>' },
            { id: 'o-m1-3', html: '<p>3<em>a</em><sup>2</sup></p>' },
            { id: 'o-m1-4', html: '<p>4<em>a</em><sup>2</sup></p>' },
          ],
          correctOptionId: 'o-m1-2',
          meta: { chapter: 'Mensuration', difficulty: 'easy', tags: [] },
        }),
        q({
          id: 'q-mat-a2',
          type: 'mcq',
          marks: 1,
          optionColumns: 4,
          html: '<p>The curved surface area of a cylinder of radius <em>r</em> and height <em>h</em> is</p>',
          options: [
            { id: 'o-m2-1', html: '<p>2π<em>rh</em></p>' },
            { id: 'o-m2-2', html: '<p>π<em>r</em><sup>2</sup><em>h</em></p>' },
            { id: 'o-m2-3', html: '<p>2π<em>r</em>(<em>r</em> + <em>h</em>)</p>' },
            { id: 'o-m2-4', html: '<p>π<em>rl</em></p>' },
          ],
          correctOptionId: 'o-m2-1',
          meta: { chapter: 'Mensuration', difficulty: 'medium', tags: [] },
        }),
        q({
          id: 'q-mat-a3',
          type: 'fillblank',
          marks: 1,
          html: '<p>The total surface area of a sphere of radius <em>r</em> is ________.</p>',
          meta: { chapter: 'Mensuration', difficulty: 'easy', tags: [] },
        }),
        q({
          id: 'q-mat-a4',
          type: 'truefalse',
          marks: 1,
          html: '<p>A cone and a cylinder of the same base and height have the same volume.</p>',
          tfAnswer: false,
          meta: { chapter: 'Mensuration', difficulty: 'medium', tags: [] },
        }),
        q({
          id: 'q-mat-a5',
          type: 'veryshort',
          marks: 1,
          answerLines: 1,
          html: '<p>Write the formula for the volume of a pyramid.</p>',
          meta: { chapter: 'Mensuration', difficulty: 'easy', tags: [] },
        }),
      ],
    }),
    section({
      id: 'sec-mat-b',
      title: 'Section B: Problem Solving',
      note: 'Show your working clearly.',
      marksNote: '(3 × 5 = 15)',
      questions: [
        q({
          id: 'q-mat-b1',
          type: 'short',
          marks: 5,
          answerLines: 7,
          html:
            '<p>The radius of the base of a cylindrical water tank is 1.4 m and its height is 3 m. Find:</p>' +
            '<ol><li><p>its curved surface area,</p></li><li><p>the volume of water it can hold in litres.</p></li></ol>',
          meta: { chapter: 'Mensuration', difficulty: 'medium', tags: [] },
        }),
        q({
          id: 'q-mat-b2',
          type: 'short',
          marks: 5,
          answerLines: 7,
          html:
            '<p>A solid metallic sphere of radius 6 cm is melted and recast into small spheres of radius 2 cm. How many small spheres are obtained?</p>',
          meta: { chapter: 'Mensuration', difficulty: 'hard', tags: [] },
        }),
        q({
          id: 'q-mat-b3',
          type: 'long',
          marks: 5,
          answerLines: 9,
          html:
            '<p>A tent is in the shape of a cylinder surmounted by a cone. The diameter of the base is 14 m, the height of the cylindrical part is 3 m and the slant height of the cone is 5 m. Find the area of the canvas required and its cost at Rs 120 per m<sup>2</sup>.</p>',
          meta: { chapter: 'Mensuration', difficulty: 'hard', tags: [] },
        }),
      ],
    }),
  ],
  layout: {
    ...DEFAULT_LAYOUT,
    margins: { top: 14, right: 14, bottom: 12, left: 16 },
    headerStyle: 'compact',
    fontSizePt: 11,
    questionSpacingMm: 1.5,
    endNote: 'All the best!',
  },
}

/* ========================================================================== */
/*  Paper 3 — Class 6 English monthly test                                     */
/* ========================================================================== */

const ENGLISH_PAPER: Paper = {
  id: 'paper-sample-english',
  name: 'Class 6 English — Monthly Test',
  templateId: 'monthly-test',
  createdAt: T3,
  updatedAt: T3,
  school: {
    name: 'Step by Step English Secondary School',
    address: 'Baneshwor, Kathmandu, Nepal',
    contact: 'Tel: 01-4567890',
    affiliation: '',
    logoDataUrl: null,
  },
  exam: {
    title: 'Monthly Test — Bhadra',
    academicYear: '2082 / 2083 B.S.',
    className: 'Class 6',
    subject: 'English',
    subjectCode: 'ENG-06',
    fullMarks: 30,
    passMarks: 12,
    timeAllowed: '1 hr',
    examDate: '2083-05-10 B.S.',
    set: '',
  },
  instructions: [
    { id: 'ins-eng-1', text: 'All questions are compulsory.' },
    { id: 'ins-eng-2', text: 'Write neatly and check your spelling.' },
  ],
  sections: [
    section({
      id: 'sec-eng-a',
      title: 'Section A: Grammar',
      marksNote: '(10 × 1 = 10)',
      questions: [
        q({
          id: 'q-eng-a1',
          type: 'fillblank',
          marks: 1,
          html: '<p>She ________ (go) to school every morning.</p>',
          meta: { chapter: 'Tenses', difficulty: 'easy', tags: ['grammar'] },
        }),
        q({
          id: 'q-eng-a2',
          type: 'fillblank',
          marks: 1,
          html: '<p>There isn’t ________ milk in the jug.</p>',
          meta: { chapter: 'Quantifiers', difficulty: 'easy', tags: ['grammar'] },
        }),
        q({
          id: 'q-eng-a3',
          type: 'mcq',
          marks: 1,
          optionColumns: 4,
          html: '<p>Choose the correct plural form of <em>child</em>.</p>',
          options: [
            { id: 'o-e3-1', html: '<p>childs</p>' },
            { id: 'o-e3-2', html: '<p>childes</p>' },
            { id: 'o-e3-3', html: '<p>children</p>' },
            { id: 'o-e3-4', html: '<p>childrens</p>' },
          ],
          correctOptionId: 'o-e3-3',
          meta: { chapter: 'Nouns', difficulty: 'easy', tags: ['grammar'] },
        }),
        q({
          id: 'q-eng-a4',
          type: 'truefalse',
          marks: 1,
          html: '<p>"Quickly" is an adjective.</p>',
          tfAnswer: false,
          meta: { chapter: 'Adverbs', difficulty: 'easy', tags: ['grammar'] },
        }),
      ],
    }),
    section({
      id: 'sec-eng-b',
      title: 'Section B: Writing',
      note: 'Write in your own words.',
      marksNote: '(2 × 10 = 20)',
      questions: [
        q({
          id: 'q-eng-b1',
          type: 'long',
          marks: 10,
          answerLines: 12,
          html:
            '<p>Write a paragraph of about 100 words on <strong>"A Festival I Enjoy the Most"</strong>. Use the hints given below.</p>' +
            '<ul><li><p>name of the festival and when it is celebrated</p></li><li><p>how your family prepares for it</p></li><li><p>why you enjoy it</p></li></ul>',
          meta: { chapter: 'Paragraph writing', difficulty: 'medium', tags: ['writing'] },
        }),
        q({
          id: 'q-eng-b2',
          type: 'long',
          marks: 10,
          answerLines: 12,
          html:
            '<p>Write a letter to your friend inviting them to spend the winter holidays at your home. Write about 80 words.</p>',
          meta: { chapter: 'Letter writing', difficulty: 'medium', tags: ['writing'] },
        }),
      ],
    }),
  ],
  layout: {
    ...DEFAULT_LAYOUT,
    headerStyle: 'modern',
    font: 'modern',
    fontSizePt: 12,
    lineHeight: 1.5,
    margins: { top: 18, right: 18, bottom: 16, left: 20 },
    endNote: 'Good luck!',
  },
}

export function createSamplePapers(): Paper[] {
  // Newest first — matches the ordering the "My Question Papers" page expects.
  return [
    JSON.parse(JSON.stringify(SCIENCE_PAPER)) as Paper,
    JSON.parse(JSON.stringify(MATHS_PAPER)) as Paper,
    JSON.parse(JSON.stringify(ENGLISH_PAPER)) as Paper,
  ]
}

/* ========================================================================== */
/*  Question bank seed                                                         */
/* ========================================================================== */

interface BankSeed {
  id: string
  subject: string
  className: string
  chapter: string
  difficulty: BankEntry['difficulty']
  usageCount: number
  createdAt: string
  question: Question
}

const BANK_SEED: BankSeed[] = [
  {
    id: 'bank-1',
    subject: 'Science',
    className: 'Class 8',
    chapter: 'Force and motion',
    difficulty: 'easy',
    usageCount: 4,
    createdAt: T3,
    question: q({
      id: 'bq-1',
      type: 'mcq',
      marks: 1,
      optionColumns: 4,
      html: '<p>Which quantity is a vector?</p>',
      options: [
        { id: 'bo-1-1', html: '<p>Mass</p>' },
        { id: 'bo-1-2', html: '<p>Speed</p>' },
        { id: 'bo-1-3', html: '<p>Velocity</p>' },
        { id: 'bo-1-4', html: '<p>Time</p>' },
      ],
      correctOptionId: 'bo-1-3',
      meta: { chapter: 'Force and motion', difficulty: 'easy', tags: ['vectors'] },
    }),
  },
  {
    id: 'bank-2',
    subject: 'Science',
    className: 'Class 8',
    chapter: 'Electricity',
    difficulty: 'medium',
    usageCount: 2,
    createdAt: T3,
    question: q({
      id: 'bq-2',
      type: 'short',
      marks: 3,
      answerLines: 4,
      html: '<p>State <strong>Ohm’s law</strong> and write its mathematical form. Define the unit of resistance.</p>',
      meta: { chapter: 'Electricity', difficulty: 'medium', tags: ['ohm'] },
    }),
  },
  {
    id: 'bank-3',
    subject: 'Science',
    className: 'Class 9',
    chapter: 'Chemical reactions',
    difficulty: 'hard',
    usageCount: 0,
    createdAt: T2,
    question: q({
      id: 'bq-3',
      type: 'long',
      marks: 5,
      answerLines: 9,
      html:
        '<p>Balance the following chemical equations and name the type of each reaction.</p>' +
        '<ol><li><p>Fe + H<sub>2</sub>O → Fe<sub>3</sub>O<sub>4</sub> + H<sub>2</sub></p></li>' +
        '<li><p>Zn + HCl → ZnCl<sub>2</sub> + H<sub>2</sub></p></li>' +
        '<li><p>CaCO<sub>3</sub> → CaO + CO<sub>2</sub></p></li></ol>',
      meta: { chapter: 'Chemical reactions', difficulty: 'hard', tags: ['balancing'] },
    }),
  },
  {
    id: 'bank-4',
    subject: 'Science',
    className: 'Class 8',
    chapter: 'Light',
    difficulty: 'medium',
    usageCount: 1,
    createdAt: T2,
    question: q({
      id: 'bq-4',
      type: 'truefalse',
      marks: 1,
      html: '<p>The image formed by a plane mirror is always laterally inverted.</p>',
      tfAnswer: true,
      meta: { chapter: 'Light', difficulty: 'medium', tags: ['mirrors'] },
    }),
  },
  {
    id: 'bank-5',
    subject: 'Mathematics',
    className: 'Class 10',
    chapter: 'Trigonometry',
    difficulty: 'medium',
    usageCount: 6,
    createdAt: T3,
    question: q({
      id: 'bq-5',
      type: 'short',
      marks: 4,
      answerLines: 6,
      html: '<p>If sin θ = 3/5 and θ is acute, find the value of cos θ and tan θ.</p>',
      meta: { chapter: 'Trigonometry', difficulty: 'medium', tags: [] },
    }),
  },
  {
    id: 'bank-6',
    subject: 'Mathematics',
    className: 'Class 10',
    chapter: 'Algebra',
    difficulty: 'easy',
    usageCount: 3,
    createdAt: T3,
    question: q({
      id: 'bq-6',
      type: 'mcq',
      marks: 1,
      optionColumns: 4,
      html: '<p>The value of <em>x</em> in 2<em>x</em> + 6 = 14 is</p>',
      options: [
        { id: 'bo-6-1', html: '<p>2</p>' },
        { id: 'bo-6-2', html: '<p>4</p>' },
        { id: 'bo-6-3', html: '<p>6</p>' },
        { id: 'bo-6-4', html: '<p>10</p>' },
      ],
      correctOptionId: 'bo-6-2',
      meta: { chapter: 'Algebra', difficulty: 'easy', tags: [] },
    }),
  },
  {
    id: 'bank-7',
    subject: 'Mathematics',
    className: 'Class 9',
    chapter: 'Geometry',
    difficulty: 'hard',
    usageCount: 0,
    createdAt: T2,
    question: q({
      id: 'bq-7',
      type: 'long',
      marks: 5,
      answerLines: 10,
      html:
        '<p>Prove that the sum of the interior angles of a triangle is 180°. Draw a neat figure and write the statements with reasons.</p>',
      meta: { chapter: 'Geometry', difficulty: 'hard', tags: ['proof'] },
    }),
  },
  {
    id: 'bank-8',
    subject: 'English',
    className: 'Class 6',
    chapter: 'Tenses',
    difficulty: 'easy',
    usageCount: 5,
    createdAt: T3,
    question: q({
      id: 'bq-8',
      type: 'fillblank',
      marks: 1,
      html: '<p>By the time we reached the hall, the programme ________ (start).</p>',
      meta: { chapter: 'Tenses', difficulty: 'easy', tags: ['grammar'] },
    }),
  },
  {
    id: 'bank-9',
    subject: 'English',
    className: 'Class 8',
    chapter: 'Vocabulary',
    difficulty: 'medium',
    usageCount: 1,
    createdAt: T2,
    question: q({
      id: 'bq-9',
      type: 'matching',
      marks: 4,
      html: '<p>Match the words in Column A with their meanings in Column B.</p>',
      matchPairs: [
        { id: 'bp-9-1', left: '<p>Abundant</p>', right: '<p>Very old</p>' },
        { id: 'bp-9-2', left: '<p>Ancient</p>', right: '<p>Plenty</p>' },
        { id: 'bp-9-3', left: '<p>Fragile</p>', right: '<p>Easily broken</p>' },
        { id: 'bp-9-4', left: '<p>Generous</p>', right: '<p>Willing to give</p>' },
      ],
      meta: { chapter: 'Vocabulary', difficulty: 'medium', tags: [] },
    }),
  },
  {
    id: 'bank-10',
    subject: 'Social Studies',
    className: 'Class 8',
    chapter: 'Civic sense',
    difficulty: 'medium',
    usageCount: 0,
    createdAt: T2,
    question: q({
      id: 'bq-10',
      type: 'short',
      marks: 3,
      answerLines: 4,
      html: '<p>Write any three duties of a responsible citizen towards their community.</p>',
      meta: { chapter: 'Civic sense', difficulty: 'medium', tags: [] },
    }),
  },
  {
    id: 'bank-11',
    subject: 'Computer Science',
    className: 'Class 9',
    chapter: 'Programming basics',
    difficulty: 'medium',
    usageCount: 2,
    createdAt: T1,
    question: q({
      id: 'bq-11',
      type: 'custom',
      marks: 4,
      answerLines: 5,
      html:
        '<p>Read the program given below and write its output.</p>' +
        '<pre><code>x = 5\nfor i in range(3):\n    x = x + i\nprint(x)</code></pre>',
      meta: { chapter: 'Programming basics', difficulty: 'medium', tags: ['python', 'code'] },
    }),
  },
  {
    id: 'bank-12',
    subject: 'Science',
    className: 'Class 8',
    chapter: 'Human body systems',
    difficulty: 'easy',
    usageCount: 7,
    createdAt: T1,
    question: q({
      id: 'bq-12',
      type: 'veryshort',
      marks: 2,
      answerLines: 2,
      html: '<p>Name the four chambers of the human heart.</p>',
      meta: { chapter: 'Human body systems', difficulty: 'easy', tags: [] },
    }),
  },
]

export function createSampleBank(): BankEntry[] {
  return BANK_SEED.map((seed) => ({
    id: seed.id,
    question: JSON.parse(JSON.stringify(seed.question)) as Question,
    subject: seed.subject,
    className: seed.className,
    chapter: seed.chapter,
    difficulty: seed.difficulty,
    createdAt: seed.createdAt,
    usageCount: seed.usageCount,
  }))
}
