import Link from 'next/link'
import {
  ArrowRight,
  BookMarked,
  Calculator,
  FileDown,
  FileText,
  GraduationCap,
  LayoutTemplate,
  ListOrdered,
  Printer,
  Save,
  Sparkles,
  Type,
} from 'lucide-react'

import { LandingHeader } from '@/components/landing/LandingHeader'
import { PaperMockup } from '@/components/landing/PaperMockup'

const FEATURES = [
  {
    Icon: Type,
    title: 'Easy Question Creation',
    body:
      'Eight question types — multiple choice, true/false, fill in the blanks, short and long answer, matching and more. Type, paste or pull one from your bank.',
  },
  {
    Icon: Calculator,
    title: 'Automatic Marks Calculation',
    body:
      'A live counter tracks full marks, marks used and marks remaining. Auto-Balance spreads the total across your questions in one click.',
  },
  {
    Icon: FileText,
    title: 'Professional Formatting',
    body:
      'Real A4 geometry with proper margins, a ruled header, aligned marks and clean typography — the way a printed exam paper should look.',
  },
  {
    Icon: FileDown,
    title: 'PDF Download',
    body:
      'One click gives you a multi-page A4 PDF with page numbers, correct margins and nothing overlapping. Ready to hand to the printer.',
  },
  {
    Icon: FileText,
    title: 'Word (.DOCX) Download',
    body:
      'A genuinely editable Word file — real headings, real tables, real numbered lists — not a picture of your paper glued into a document.',
  },
  {
    Icon: Printer,
    title: 'Print Ready Layout',
    body:
      'Print straight from the browser at exactly 100%. Page breaks are decided before you print, so no question is ever cut in half.',
  },
  {
    Icon: ListOrdered,
    title: 'Auto Numbering',
    body:
      'Numbers renumber themselves the moment you add, delete or drag a question. Choose 1, 2, 3 or i, ii, iii or A, B, C per section.',
  },
  {
    Icon: BookMarked,
    title: 'Question Bank',
    body:
      'Keep your best questions. Search and filter by subject, class, chapter, difficulty or type, then drop them straight into the paper.',
  },
  {
    Icon: Save,
    title: 'Save and Edit Papers',
    body:
      'Every paper is saved in this browser as you type. Reopen it next term, duplicate it for Set B, and edit anything at any time.',
  },
]

const STEPS = [
  {
    title: 'Fill in the school and exam details',
    body: 'School name, logo, class, subject, full marks, pass marks, time and date — all in one panel.',
  },
  {
    title: 'Add your sections and questions',
    body: 'Group questions into Section A, B, C. Drag to reorder; numbering follows automatically.',
  },
  {
    title: 'Check the live A4 preview',
    body: 'The right-hand pane is the actual printed page, paginated exactly as it will come out.',
  },
  {
    title: 'Download PDF or Word',
    body: 'Both exports are built from the same layout you just approved, so nothing shifts.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-ink-950">
      <LandingHeader />

      {/* ---------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden">
        <div className="hero-grid absolute inset-0" aria-hidden />
        <div
          className="absolute -top-40 left-1/2 h-[32rem] w-[52rem] -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl dark:bg-brand-900/30"
          aria-hidden
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-24 lg:pt-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-300">
              <GraduationCap className="h-3.5 w-3.5" />
              Built for teachers and schools
            </span>

            <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight text-ink-900 text-balance sm:text-5xl lg:text-6xl dark:text-white">
              Question Paper{' '}
              <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
                Generator
              </span>
            </h1>

            <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-600 text-balance sm:text-xl dark:text-ink-300">
              Create Professional Question Papers in Minutes
            </p>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-500 dark:text-ink-400">
              Type your questions, watch the marks add themselves up, and download a
              print-ready PDF or a fully editable Word document that looks exactly like the
              preview on your screen.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/editor"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-600 px-6 text-base font-semibold text-white shadow-glow transition-colors hover:bg-brand-700"
              >
                Create Question Paper
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-ink-300 bg-white px-6 text-base font-semibold text-ink-700 transition-colors hover:bg-ink-50 dark:border-ink-600 dark:bg-ink-900 dark:text-ink-200 dark:hover:bg-ink-800"
              >
                View Features
              </a>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-ink-200 pt-6 dark:border-ink-700">
              {[
                { value: '8', label: 'Question types' },
                { value: '6', label: 'Exam templates' },
                { value: 'PDF + DOCX', label: 'Export formats' },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="text-lg font-bold text-ink-900 dark:text-white">{stat.value}</dt>
                  <dd className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{stat.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <PaperMockup />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ features */}
      <section id="features" className="scroll-mt-20 border-t border-ink-200 bg-ink-50 py-16 dark:border-ink-800 dark:bg-ink-900/40 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
              Everything you need
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 text-balance sm:text-4xl dark:text-white">
              Made for the way teachers actually set papers
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-500 dark:text-ink-400">
              Every button here does something. Nothing is a mock-up.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ Icon, title, body }) => (
              <div
                key={title}
                className="group rounded-2xl border border-ink-200 bg-white p-5 shadow-card transition-shadow hover:shadow-lift dark:border-ink-700 dark:bg-ink-900"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-300">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-ink-900 dark:text-white">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500 dark:text-ink-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- steps */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                How it works
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 text-balance sm:text-4xl dark:text-white">
                From blank page to printed paper in four steps
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-ink-500 dark:text-ink-400">
                A sample Class 8 Science paper is already loaded, so you can open the editor and
                try the whole flow — including both downloads — before typing a single question of
                your own.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/editor"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  Open the editor
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/templates"
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-ink-300 bg-white px-5 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-50 dark:border-ink-600 dark:bg-ink-900 dark:text-ink-200 dark:hover:bg-ink-800"
                >
                  <LayoutTemplate className="h-4 w-4" />
                  Browse templates
                </Link>
              </div>
            </div>

            <ol className="relative space-y-6 border-l border-ink-200 pl-8 dark:border-ink-700">
              {STEPS.map((step, index) => (
                <li key={step.title} className="relative">
                  <span className="absolute -left-[2.6rem] flex h-7 w-7 items-center justify-center rounded-full border border-brand-200 bg-white text-xs font-bold text-brand-600 dark:border-brand-800 dark:bg-ink-900 dark:text-brand-300">
                    {index + 1}
                  </span>
                  <h3 className="text-base font-semibold text-ink-900 dark:text-white">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-500 dark:text-ink-400">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- cta */}
      <section className="border-t border-ink-200 dark:border-ink-800">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-20">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 px-6 py-14 text-center sm:px-12">
            <div
              className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl"
              aria-hidden
            />
            <Sparkles className="mx-auto h-8 w-8 text-brand-200" />
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white text-balance sm:text-4xl">
              Set your next paper in minutes, not evenings
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-brand-100">
              Works entirely in your browser. Nothing to install, no account needed, and your
              papers stay on your own computer.
            </p>
            <Link
              href="/editor"
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-base font-semibold text-brand-700 transition-colors hover:bg-brand-50"
            >
              Create Question Paper
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-200 py-8 dark:border-ink-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 text-xs text-ink-400 sm:flex-row sm:px-8 dark:text-ink-500">
          <p className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" />
            Question Paper Generator
          </p>
          <p>Your papers are stored in this browser only.</p>
        </div>
      </footer>
    </div>
  )
}
