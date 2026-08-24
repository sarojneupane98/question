/**
 * A decorative, non-interactive illustration of a printed question paper.
 *
 * Intentionally hand-built rather than rendered from the real preview engine:
 * the landing page is a server component and must not pull in the store, the
 * pagination measuring pass or Tiptap. Nothing here is exported data — it is a
 * picture.
 */
export function PaperMockup() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* two offset sheets behind, to hint at multi-page output */}
      <div
        className="absolute left-6 top-6 h-full w-full rotate-2 rounded-lg bg-white shadow-card dark:bg-ink-800"
        aria-hidden
      />
      <div
        className="absolute left-3 top-3 h-full w-full rotate-1 rounded-lg bg-white shadow-card dark:bg-ink-800"
        aria-hidden
      />

      <div className="relative rounded-lg bg-white p-6 shadow-sheet ring-1 ring-ink-900/5">
        {/* header */}
        <div className="text-center">
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
            SBS
          </div>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-ink-900">
            Step by Step English Secondary School
          </p>
          <p className="text-[8px] text-ink-500">Baneshwor, Kathmandu, Nepal</p>
          <p className="mt-1.5 text-[9px] font-semibold text-ink-800">
            First Terminal Examination — 2082
          </p>
        </div>

        <div className="mt-2 border-y border-ink-900 py-1">
          <div className="flex justify-between text-[8px] font-medium text-ink-700">
            <span>Class: 8</span>
            <span>Subject: Science</span>
            <span>F.M.: 50</span>
            <span>Time: 2 hrs</span>
          </div>
        </div>

        {/* section A */}
        <p className="mt-3 text-[9px] font-bold text-ink-900">Section A: Objective Questions</p>
        <div className="mt-1.5 space-y-2">
          {[
            { q: 'Which one of the following is a chemical change?', opts: ['Melting of ice', 'Rusting of iron'] },
            { q: 'The SI unit of force is', opts: ['joule', 'newton'] },
          ].map((item, index) => (
            <div key={item.q} className="flex gap-1.5">
              <span className="text-[8px] font-semibold text-ink-800">{index + 1}.</span>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[8px] leading-relaxed text-ink-700">{item.q}</p>
                  <span className="text-[8px] font-semibold text-ink-800">[1]</span>
                </div>
                <div className="mt-0.5 grid grid-cols-2 gap-x-2">
                  {item.opts.map((opt, i) => (
                    <p key={opt} className="text-[8px] text-ink-600">
                      {String.fromCharCode(97 + i)}) {opt}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* section B with ruled answer space */}
        <p className="mt-3 text-[9px] font-bold text-ink-900">Section B: Short Answer</p>
        <div className="mt-1.5 flex gap-1.5">
          <span className="text-[8px] font-semibold text-ink-800">3.</span>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[8px] leading-relaxed text-ink-700">
                Define photosynthesis and write its balanced equation.
              </p>
              <span className="text-[8px] font-semibold text-ink-800">[4]</span>
            </div>
            <div className="mt-1.5 space-y-[7px]">
              {[0, 1, 2].map((line) => (
                <div key={line} className="h-px bg-ink-200" />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-dashed border-ink-200 pt-1.5 text-center text-[7px] text-ink-400">
          Page 1 of 2
        </div>
      </div>

      {/* floating export chips */}
      <div className="absolute -bottom-4 -left-4 flex gap-2">
        <span className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-rose-600 shadow-lift dark:border-ink-700 dark:bg-ink-800">
          PDF
        </span>
        <span className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-blue-600 shadow-lift dark:border-ink-700 dark:bg-ink-800">
          DOCX
        </span>
      </div>

      <div className="absolute -right-3 top-10 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-emerald-600 shadow-lift dark:border-ink-700 dark:bg-ink-800">
        50 / 50 marks
      </div>
    </div>
  )
}
