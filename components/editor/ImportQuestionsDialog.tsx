'use client'

import { useRef, useState } from 'react'
import {
  CheckCheck,
  CheckSquare,
  ClipboardType,
  FileText,
  Plus,
  ShieldAlert,
  Sparkles,
  Square,
  Upload,
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Field, Input, NumberInput, Select, Textarea } from '@/components/ui/Primitives'
import { QuestionTypeBadge } from '@/components/ui/QuestionTypeIcon'
import {
  clearAiConfig,
  configForSetup,
  DEFAULT_MODELS,
  generateQuestions,
  isAiReady,
  readAiConfig,
  writeAiConfig,
  type AiConfig,
} from '@/lib/ai'
import { cn } from '@/lib/cn'
import {
  draftToQuestion,
  parseQuestions,
  readDocxLines,
  readTextLines,
  splitPastedText,
  type DraftQuestion,
} from '@/lib/importQuestions'
import { marksWord } from '@/lib/marks'
import { useAppStore, useCurrentPaper } from '@/lib/store'
import { toast } from '@/lib/toast'

/**
 * "Bring in questions I already have" (spec §7).
 *
 * Two stages, because the first one is a guess. Stage one gets the words from a
 * Word file, a text file, the clipboard, or an AI service; stage two shows what
 * was found and asks the teacher to confirm it. Nothing reaches the paper until
 * they press Add, so a document this fails to read costs them a click, not their
 * work.
 *
 * Every source funnels into the same `DraftQuestion[]` and the same review
 * screen. That is the point of the shape: adding AI generation added no second
 * review UI, no second insert path, and no second set of bugs.
 *
 * There is no "Upload PDF" button, deliberately. Reading text out of a PDF needs
 * a real PDF engine, and half-reading one produces plausible-looking nonsense —
 * ligatures joined up, columns interleaved, tables shredded — which is worse
 * than an honest no. Opening the PDF and copying from it takes seconds and gives
 * a far better result, so that is what the dialog asks for.
 */
export function ImportQuestionsDialog({
  sectionId,
  onClose,
}: {
  /** The section the chosen questions are appended to. */
  sectionId: string
  onClose: () => void
}) {
  const paper = useCurrentPaper()
  const insertQuestions = useAppStore((s) => s.insertQuestions)

  const wordRef = useRef<HTMLInputElement | null>(null)
  const textRef = useRef<HTMLInputElement | null>(null)

  const [panel, setPanel] = useState<'sources' | 'ai'>('sources')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pasted, setPasted] = useState('')
  const [drafts, setDrafts] = useState<DraftQuestion[] | null>(null)
  const [skipped, setSkipped] = useState<string[]>([])

  const section = paper?.sections.find((item) => item.id === sectionId) ?? null

  // Rows are tracked by what the teacher has *turned off*, not what they have
  // turned on, so a freshly parsed document arrives with everything ticked and
  // they only have to touch the ones that came out wrong.
  const skippedSet = new Set(skipped)
  const chosen = (drafts ?? []).filter((draft) => !skippedSet.has(draft.id))

  const run = async (read: () => Promise<DraftQuestion[]>) => {
    setBusy(true)
    setError(null)
    try {
      const result = await read()
      if (result.length === 0) {
        setError(
          'No questions were found in that. Check it has some text in it, or paste the questions in below instead.',
        )
        return
      }
      setDrafts(result)
      setSkipped([])
    } catch (problem) {
      setError(
        problem instanceof Error && problem.message
          ? problem.message
          : 'That could not be read. Try pasting the questions in instead.',
      )
    } finally {
      setBusy(false)
      if (wordRef.current) wordRef.current.value = ''
      if (textRef.current) textRef.current.value = ''
    }
  }

  const insert = () => {
    if (chosen.length === 0) return
    insertQuestions(sectionId, chosen.map(draftToQuestion))
    toast.success(
      `${chosen.length} question${chosen.length === 1 ? '' : 's'} added`,
      `Added to the end of ${section?.title || 'the section'}. Check the marks — they were read from the text.`,
    )
    onClose()
  }

  const title = drafts
    ? 'Check what was found'
    : panel === 'ai'
      ? 'Generate questions with AI'
      : 'Bring in questions you already have'

  const description = drafts
    ? `Untick anything that came out wrong. The rest are added to the end of ${
        section?.title || 'this section'
      }.`
    : panel === 'ai'
      ? 'Everything the AI writes is a draft. You will see it and pick what to keep before anything is added.'
      : 'Nothing leaves your computer — the file is read here in your browser.'

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={title}
      description={description}
      footer={
        drafts ? (
          <>
            <span className="mr-auto text-xs text-ink-400">
              {chosen.length} of {drafts.length} selected
            </span>
            <Button variant="outline" onClick={() => setDrafts(null)}>
              Start again
            </Button>
            <Button disabled={chosen.length === 0} onClick={insert}>
              <Plus className="h-4 w-4" />
              Add {chosen.length} question{chosen.length === 1 ? '' : 's'}
            </Button>
          </>
        ) : panel === 'ai' ? (
          <Button
            variant="outline"
            onClick={() => {
              setPanel('sources')
              setError(null)
            }}
          >
            Back
          </Button>
        ) : (
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        )
      }
    >
      {drafts ? (
        <div className="space-y-3">
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setSkipped(skipped.length > 0 ? [] : drafts.map((draft) => draft.id))}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {skipped.length > 0 ? 'Select all' : 'Clear selection'}
          </Button>

          <ul className="max-h-[48vh] space-y-1.5 overflow-y-auto scroll-slim pr-1">
            {drafts.map((draft) => (
              <DraftRow
                key={draft.id}
                draft={draft}
                selected={!skippedSet.has(draft.id)}
                onToggle={() =>
                  setSkipped((current) =>
                    current.includes(draft.id)
                      ? current.filter((id) => id !== draft.id)
                      : [...current, draft.id],
                  )
                }
              />
            ))}
          </ul>

          <p className="rounded-lg bg-ink-50 px-3 py-2 text-[11px] leading-relaxed text-ink-500 dark:bg-ink-800 dark:text-ink-400">
            Question types and marks are worked out from how the text was laid out, so check them.
            Everything can still be edited once it is in.
          </p>
        </div>
      ) : panel === 'ai' ? (
        <AiPanel
          busy={busy}
          error={error}
          onGenerate={(config, brief) => void run(() => generateQuestions(config, brief))}
        />
      ) : (
        <div className="space-y-4">
          {error ? (
            <p
              role="alert"
              className="rounded-xl bg-rose-50 px-3 py-2.5 text-xs leading-relaxed text-rose-800 dark:bg-rose-950/60 dark:text-rose-200"
            >
              {error}
            </p>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-3">
            <SourceButton
              icon={<FileText className="h-4 w-4" />}
              title="Upload a Word file"
              detail="A .docx from Word, Google Docs or LibreOffice."
              disabled={busy}
              onClick={() => wordRef.current?.click()}
            />
            <SourceButton
              icon={<Upload className="h-4 w-4" />}
              title="Upload a text file"
              detail="A plain .txt or .md file."
              disabled={busy}
              onClick={() => textRef.current?.click()}
            />
            <SourceButton
              icon={<Sparkles className="h-4 w-4" />}
              title="Generate with AI"
              detail="Needs setting up once with your own AI account."
              disabled={busy}
              onClick={() => {
                setError(null)
                setPanel('ai')
              }}
            />
          </div>

          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-700 dark:text-ink-200">
              <ClipboardType className="h-3.5 w-3.5 text-ink-400" aria-hidden />
              Or paste the questions
            </p>
            <Textarea
              rows={7}
              value={pasted}
              onChange={(event) => setPasted(event.target.value)}
              aria-label="Paste your questions"
              placeholder={
                '1. What is photosynthesis?  [2]\n2. Which gas do plants take in?  (1 mark)\n   a) Oxygen\n   b) Carbon dioxide\n   c) Nitrogen'
              }
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                loading={busy}
                disabled={busy || pasted.trim().length === 0}
                onClick={() => void run(async () => parseQuestions(splitPastedText(pasted)))}
              >
                Find questions
              </Button>
              {/*
               * The one honest answer to "can I upload a PDF?". Said here, next
               * to the thing that actually works, rather than as a disabled
               * button the teacher has to click to find out.
               */}
              <span className="text-[11px] leading-relaxed text-ink-400">
                Have a PDF? Open it, select everything, copy, and paste it here.
              </span>
            </div>
          </div>

          <input
            ref={wordRef}
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void run(async () => parseQuestions(await readDocxLines(file)))
            }}
          />
          <input
            ref={textRef}
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void run(async () => parseQuestions(await readTextLines(file)))
            }}
          />
        </div>
      )}
    </Modal>
  )
}

/**
 * Asking for questions, and the one-time setup that has to happen first.
 *
 * The setup is *in the dialog*, not on the settings page, because it belongs to
 * the moment the teacher wants the feature — and because what it stores is
 * deliberately temporary. See `lib/ai.ts`: the key is held in `sessionStorage`
 * for this tab only, so a permanent-looking home on a settings page would be a
 * lie about how long it lasts.
 */
function AiPanel({
  busy,
  error,
  onGenerate,
}: {
  busy: boolean
  error: string | null
  onGenerate: (config: AiConfig, brief: { topic: string; count: number; notes: string }) => void
}) {
  const [config, setConfig] = useState<AiConfig>(() => configForSetup())
  // Whether the setup form is showing is decided once, on open, and then only
  // by the two buttons that mean it. Deriving it from "is the config usable
  // yet?" made the form disappear the moment a key became non-empty — which is
  // after the *first character* for anyone typing rather than pasting.
  const [setupOpen, setSetupOpen] = useState(() => !isAiReady(readAiConfig()))
  const [topic, setTopic] = useState('')
  const [count, setCount] = useState(5)
  const [notes, setNotes] = useState('')

  const ready = isAiReady(config)

  const update = (patch: Partial<AiConfig>) => {
    const next = { ...config, ...patch }
    setConfig(next)
    writeAiConfig(next)
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 px-3 py-2.5 text-xs leading-relaxed text-rose-800 dark:bg-rose-950/60 dark:text-rose-200"
        >
          {error}
        </p>
      ) : null}

      {setupOpen ? (
        <div className="space-y-3 rounded-xl border border-ink-200 p-3 dark:border-ink-700">
          <div>
            <p className="text-xs font-semibold text-ink-800 dark:text-ink-100">
              This needs setting up once
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-500 dark:text-ink-400">
              This app has no AI service of its own, and no account is included. It uses one you
              already have, so nothing is charged to anybody but you.
            </p>
          </div>

          <Field label="How should it connect?">
            <Select
              fieldSize="sm"
              value={config.mode}
              onChange={(event) => update({ mode: event.target.value as AiConfig['mode'] })}
              options={[
                { value: 'proxy', label: 'Through my school’s own AI address (safest)' },
                { value: 'direct', label: 'Straight from this browser with my own key' },
              ]}
            />
          </Field>

          {config.mode === 'direct' ? (
            <>
              {/*
               * Not a soft warning. A key used from a browser really is exposed
               * to that browser, and a teacher agreeing to that should know
               * exactly what they are agreeing to before they paste it in.
               */}
              <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden />
                <span>
                  A key used from a web page can be read by that page. Use a key you can cancel,
                  set a spending limit on it, and do not use a school-wide or shared key here. It is
                  kept for this tab only — closing the tab erases it, and it is never saved with
                  your papers or included in a backup.
                </span>
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="AI service">
                  <Select
                    fieldSize="sm"
                    value={config.provider}
                    onChange={(event) =>
                      update({ provider: event.target.value as AiConfig['provider'] })
                    }
                    options={[
                      { value: 'gemini', label: 'Google Gemini' },
                      { value: 'openai', label: 'OpenAI' },
                    ]}
                  />
                </Field>
                <Field label="Model" hint={`Leave blank for ${DEFAULT_MODELS[config.provider]}.`}>
                  <Input
                    fieldSize="sm"
                    value={config.model}
                    placeholder={DEFAULT_MODELS[config.provider]}
                    onChange={(event) => update({ model: event.target.value })}
                  />
                </Field>
              </div>

              <Field label="Your API key" hint="Kept in this tab only, never written to disk.">
                <Input
                  fieldSize="sm"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={config.key}
                  placeholder="Paste your key"
                  onChange={(event) => update({ key: event.target.value })}
                />
              </Field>
            </>
          ) : (
            <Field
              label="Your school’s AI address"
              hint="Must start with https:// . Your school’s own service keeps the key, so this browser never sees it."
            >
              <Input
                fieldSize="sm"
                type="url"
                inputMode="url"
                spellCheck={false}
                value={config.endpoint}
                placeholder="https://ai.myschool.edu.np/questions"
                onChange={(event) => update({ endpoint: event.target.value })}
              />
            </Field>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-ink-200 pt-2.5 dark:border-ink-700">
            <Button
              size="sm"
              variant="outline"
              disabled={!ready}
              onClick={() => setSetupOpen(false)}
            >
              Done
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                clearAiConfig()
                setConfig(configForSetup())
                setSetupOpen(true)
              }}
            >
              Forget these details
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Field label="What should the questions be about?">
            <Input
              fieldSize="sm"
              value={topic}
              placeholder="Photosynthesis, for class 8 science"
              onChange={(event) => setTopic(event.target.value)}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-[7rem_1fr]">
            <Field label="How many?">
              <NumberInput fieldSize="sm" value={count} onValueChange={setCount} min={1} max={25} />
            </Field>
            <Field label="Anything else?" hint="Optional.">
              <Input
                fieldSize="sm"
                value={notes}
                placeholder="Two marks each, multiple choice"
                onChange={(event) => setNotes(event.target.value)}
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              loading={busy}
              disabled={busy || topic.trim().length === 0}
              onClick={() => onGenerate(config, { topic, count, notes })}
            >
              <Sparkles className="h-4 w-4" />
              Write questions
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSetupOpen(true)}>
              Change the AI settings
            </Button>
          </div>

          <p className="text-[11px] leading-relaxed text-ink-400">
            An AI can be confidently wrong. Read every question before you use it in a real exam.
          </p>
        </div>
      )}
    </div>
  )
}

function SourceButton({
  icon,
  title,
  detail,
  disabled,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  detail: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-start gap-3 rounded-xl border border-ink-200 px-3 py-3 text-left transition-colors hover:border-brand-400 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-ink-700 dark:hover:border-brand-600 dark:hover:bg-brand-950/40"
    >
      <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink-900 dark:text-white">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-500 dark:text-ink-400">
          {detail}
        </span>
      </span>
    </button>
  )
}

function DraftRow({
  draft,
  selected,
  onToggle,
}: {
  draft: DraftQuestion
  selected: boolean
  onToggle: () => void
}) {
  const Icon = selected ? CheckSquare : Square
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        className={cn(
          'flex w-full items-start gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors',
          selected
            ? 'border-brand-500 bg-brand-50 dark:border-brand-600 dark:bg-brand-950/60'
            : 'border-ink-200 opacity-60 hover:opacity-100 dark:border-ink-700',
        )}
      >
        <Icon
          className={cn(
            'mt-0.5 h-4 w-4 flex-none',
            selected ? 'text-brand-600 dark:text-brand-300' : 'text-ink-300 dark:text-ink-600',
          )}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <QuestionTypeBadge type={draft.type} />
            <span className="text-[11px] font-medium text-ink-500 dark:text-ink-400">
              {draft.marks === null ? 'marks not found' : marksWord(draft.marks)}
            </span>
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-ink-800 dark:text-ink-100">
            {draft.text}
          </span>
          {draft.options.length > 0 ? (
            <span className="mt-1 block truncate text-[11px] text-ink-400">
              {draft.options.join('  ·  ')}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  )
}
