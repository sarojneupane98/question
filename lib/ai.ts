/**
 * The one place this app is allowed to talk to an AI provider (spec §6).
 *
 * WHY THIS FILE IS SHAPED LIKE THIS
 * ---------------------------------
 * This app is a static export served from GitHub Pages. There is no server of
 * ours in the picture — nothing that could hold a provider key on the teacher's
 * behalf. That single fact decides the whole design:
 *
 *   - **No key is shipped.** There is no build-time key, no `NEXT_PUBLIC_…` key,
 *     no key in the repository, and nothing to find in the published bundle.
 *     Generation is *off* until somebody deliberately turns it on, and the app
 *     says so plainly rather than pretending the button works.
 *   - **A school with a backend should use it.** `mode: 'proxy'` posts to an
 *     endpoint the school runs, which holds the key server-side. This is the
 *     only arrangement where the browser never sees a secret, so it is the one
 *     the UI recommends.
 *   - **A teacher with their own key can use it, knowingly.** `mode: 'direct'`
 *     calls the provider from the browser with a key the teacher typed in.
 *
 * THE RISK IN `direct` MODE, STATED PLAINLY
 * -----------------------------------------
 * A key used from a browser is exposed to that browser: it travels in a request
 * the network tab shows, and any script running on the page could read it. That
 * is inherent — no amount of client-side cleverness fixes it. So the deliberate
 * design (§25) is to make the exposure as small and as short-lived as possible,
 * and to say out loud what it is:
 *
 *   - The key lives in `sessionStorage`, so closing the tab erases it. It is
 *     never written to `localStorage`, never into the Zustand store, never into
 *     a paper, and therefore never into a backup file the teacher might email.
 *   - It is never logged, never put in a toast, and stripped out of error text
 *     before anything is displayed.
 *   - It is only ever sent to the provider's own HTTPS endpoint.
 *   - The UI tells the teacher to use a key they can revoke, and how.
 *
 * WHY THE MODEL IS ASKED FOR PLAIN TEXT, NOT JSON
 * -----------------------------------------------
 * The reply is fed to the same parser that reads a pasted Word document
 * (`parseQuestions`), so the AI path reuses the review-and-tick screen that is
 * already there instead of adding a second one. It also fails better: a model
 * that ignores its instructions produces slightly wonky questions the teacher
 * can untick, rather than a JSON parse error and nothing at all.
 */

import { parseQuestions, splitPastedText, type DraftQuestion } from '@/lib/importQuestions'

/* -------------------------------------------------------------------------- */
/*  Configuration                                                             */
/* -------------------------------------------------------------------------- */

export type AiMode = 'off' | 'proxy' | 'direct'
export type AiProvider = 'gemini' | 'openai'

export interface AiConfig {
  mode: AiMode
  /** `proxy` mode: an endpoint the school runs, which holds the key. */
  endpoint: string
  /** `direct` mode. */
  provider: AiProvider
  /** `direct` mode. Session-only — see the note at the top of this file. */
  key: string
  model: string
}

const DEFAULT_MODELS: Record<AiProvider, string> = {
  gemini: 'gemini-2.0-flash',
  openai: 'gpt-4o-mini',
}

export const EMPTY_CONFIG: AiConfig = {
  mode: 'off',
  endpoint: '',
  provider: 'gemini',
  key: '',
  model: '',
}

/**
 * `sessionStorage`, deliberately.
 *
 * Not `localStorage`, and not the persisted Zustand store: those survive a
 * closed tab and get copied into backups, and a key that outlives the session
 * the teacher meant it for is exactly the failure this app should not have.
 */
const SESSION_KEY = 'qpg:ai:session'

function sessionRead(): string | null {
  try {
    return window.sessionStorage.getItem(SESSION_KEY)
  } catch {
    // Private-mode Safari throws on access rather than returning null.
    return null
  }
}

export function readAiConfig(): AiConfig {
  if (typeof window === 'undefined') return EMPTY_CONFIG
  const raw = sessionRead()
  if (!raw) return EMPTY_CONFIG
  try {
    const parsed = JSON.parse(raw) as Partial<AiConfig>
    const provider: AiProvider = parsed.provider === 'openai' ? 'openai' : 'gemini'
    const mode: AiMode = parsed.mode === 'proxy' || parsed.mode === 'direct' ? parsed.mode : 'off'
    return {
      mode,
      endpoint: typeof parsed.endpoint === 'string' ? parsed.endpoint : '',
      provider,
      key: typeof parsed.key === 'string' ? parsed.key : '',
      model: typeof parsed.model === 'string' ? parsed.model : '',
    }
  } catch {
    return EMPTY_CONFIG
  }
}

export function writeAiConfig(config: AiConfig): void {
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(config))
  } catch {
    // Nothing useful to do: generation simply stays unconfigured.
  }
}

export function clearAiConfig(): void {
  try {
    window.sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

/** True when a generate request could actually be made. */
export function isAiReady(config: AiConfig): boolean {
  if (config.mode === 'proxy') return isSafeEndpoint(config.endpoint)
  if (config.mode === 'direct') return config.key.trim().length > 0
  return false
}

/**
 * The config to start the setup form with.
 *
 * `mode: 'off'` is the honest stored state for "never set up", but it is not a
 * choice worth showing a teacher — so the form opens on the recommended option.
 * It is normalised *here*, rather than defaulted in the dropdown, because a
 * dropdown showing one mode while the config held another meant a perfectly
 * good endpoint could never turn the feature on.
 */
export function configForSetup(): AiConfig {
  const stored = readAiConfig()
  return stored.mode === 'off' ? { ...stored, mode: 'proxy' } : stored
}

/**
 * Refuses to send anything over plain `http:` to another machine.
 *
 * A key or an exam brief posted to `http://…` crosses the network in the clear,
 * and a wrong protocol in a settings box is a very easy mistake to make. Plain
 * HTTP on localhost is allowed, because that is somebody testing their own
 * proxy on their own computer.
 */
export function isSafeEndpoint(endpoint: string): boolean {
  const trimmed = endpoint.trim()
  if (!trimmed) return false
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return false
  }
  if (url.protocol === 'https:') return true
  return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
}

/* -------------------------------------------------------------------------- */
/*  The prompt                                                                */
/* -------------------------------------------------------------------------- */

export interface GenerateBrief {
  topic: string
  count: number
  /** Free text: "class 8 science", "two marks each", "for a unit test". */
  notes: string
}

/**
 * Asks for the plain layout of a printed exam paper, because that is what the
 * importer already reads. No JSON, no schema, no field names — and the format
 * is shown by example, which models follow far more reliably than a description
 * of a format.
 */
function buildPrompt(brief: GenerateBrief): string {
  const count = Math.min(Math.max(Math.round(brief.count) || 5, 1), 25)
  return [
    `Write ${count} exam questions about: ${brief.topic.trim()}.`,
    brief.notes.trim() ? `Requirements: ${brief.notes.trim()}` : '',
    '',
    'Format the reply exactly like a printed question paper, and nothing else:',
    '- one question per line, numbered "1.", "2.", and so on',
    '- put the marks at the end of the line in square brackets, like [2]',
    '- for a multiple choice question, put each choice on its own line as "a)", "b)", "c)", "d)"',
    '',
    'Example:',
    '1. What is photosynthesis? [2]',
    '2. Which gas do plants take in during photosynthesis? [1]',
    'a) Oxygen',
    'b) Carbon dioxide',
    'c) Nitrogen',
    'd) Hydrogen',
    '',
    'Do not add a title, a heading, an introduction, or any explanation.',
  ]
    .filter(Boolean)
    .join('\n')
}

/* -------------------------------------------------------------------------- */
/*  Talking to a provider                                                     */
/* -------------------------------------------------------------------------- */

/** Strips anything key-shaped out of text on its way to the screen or a log. */
function redact(text: string): string {
  return text
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, '[key hidden]')
    .replace(/AIza[A-Za-z0-9_-]{8,}/g, '[key hidden]')
    .replace(/(key=)[^&\s]+/gi, '$1[key hidden]')
}

function friendlyHttpError(status: number): string {
  if (status === 401 || status === 403) {
    return 'The provider rejected that key. Check it was copied whole, and that it is still active.'
  }
  if (status === 404) {
    return 'The provider did not recognise that model name. Try the default model.'
  }
  if (status === 429) {
    return 'The provider is rate-limiting or out of quota. Wait a minute and try again, or check the billing on your account.'
  }
  if (status >= 500) return 'The provider had a problem at their end. Try again in a moment.'
  return `The provider refused the request (error ${status}).`
}

/** Pulls the text out of whichever reply shape came back. Deliberately liberal. */
function extractText(data: unknown): string {
  if (typeof data === 'string') return data
  if (!data || typeof data !== 'object') return ''
  const any = data as Record<string, any>

  if (typeof any.text === 'string') return any.text
  if (typeof any.output_text === 'string') return any.output_text

  const gemini = any.candidates?.[0]?.content?.parts
  if (Array.isArray(gemini)) {
    return gemini.map((part: any) => (typeof part?.text === 'string' ? part.text : '')).join('')
  }

  const openai = any.choices?.[0]?.message?.content
  if (typeof openai === 'string') return openai

  return ''
}

async function post(url: string, body: unknown, headers: Record<string, string>): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })
  } catch {
    // fetch rejects for a genuinely dead network *and* for a blocked
    // cross-origin request, and the browser deliberately does not say which.
    throw new Error(
      'Could not reach the AI service. Check your internet connection — and if you are using your school’s own endpoint, that it allows requests from this website.',
    )
  }

  if (!response.ok) throw new Error(friendlyHttpError(response.status))

  try {
    return await response.json()
  } catch {
    throw new Error('The AI service sent back something this app could not read.')
  }
}

/**
 * Generates draft questions. Returns the same `DraftQuestion[]` a Word file
 * produces, so the caller shows the identical review screen.
 */
export async function generateQuestions(
  config: AiConfig,
  brief: GenerateBrief,
): Promise<DraftQuestion[]> {
  if (!brief.topic.trim()) throw new Error('Say what the questions should be about first.')
  if (!isAiReady(config)) throw new Error('AI generation is not set up yet.')

  const prompt = buildPrompt(brief)
  let data: unknown

  if (config.mode === 'proxy') {
    if (!isSafeEndpoint(config.endpoint)) {
      throw new Error('That endpoint address must start with https:// .')
    }
    // No key is sent: in this mode the endpoint holds it.
    data = await post(config.endpoint.trim(), { prompt }, {})
  } else if (config.provider === 'openai') {
    data = await post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: config.model.trim() || DEFAULT_MODELS.openai,
        messages: [{ role: 'user', content: prompt }],
      },
      { Authorization: `Bearer ${config.key.trim()}` },
    )
  } else {
    const model = encodeURIComponent(config.model.trim() || DEFAULT_MODELS.gemini)
    // Google takes the key as a query parameter. That is their design, not a
    // choice made here — and it is one more reason the proxy mode is the one
    // this app recommends, since query strings turn up in logs.
    data = await post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
        config.key.trim(),
      )}`,
      { contents: [{ parts: [{ text: prompt }] }] },
      {},
    )
  }

  const text = extractText(data)
  if (!text.trim()) {
    throw new Error('The AI service replied, but with no questions in it. Try rewording the topic.')
  }

  const drafts = parseQuestions(splitPastedText(redact(text)))
  if (drafts.length === 0) {
    throw new Error('The reply did not contain anything that looked like a question. Try again.')
  }
  return drafts
}

export { DEFAULT_MODELS }
