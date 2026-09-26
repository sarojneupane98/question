# Question Paper Generator

Create professional question papers in minutes — live A4 preview, print-ready PDF and
editable Word (.docx) export.

Built with Next.js (App Router), React, TypeScript, Tailwind CSS, Zustand, dnd-kit,
Tiptap, jsPDF and docx.js. Everything runs in the browser; there is no server, no
account and no upload.

---

## Running it

You need **Node.js 18.18 or newer** (this project was verified on Node 24).

```bash
npm install
```

```bash
npm run dev
```

Then open <http://localhost:3000>.

Other scripts. `build` writes a static site to `out/`, and `preview` serves it so you can
check the real build rather than the dev server (see [Publishing](#publishing)):

```bash
npm run build
```

```bash
npm run preview
```

```bash
npm run typecheck
```

```bash
npm run lint
```

### If `npm` is "not found" on Windows

The Node installer puts `npm` on the PATH of *new* shells. An already-open terminal
(or an editor that inherited its environment) will not see it. Either reopen the
terminal, or prepend it for the current session:

```bash
export PATH="/c/Program Files/nodejs:$PATH"
```

`.claude/launch.json` calls Next through the absolute path to `node.exe` for the same
reason, and because Node 20+ refuses to spawn `.cmd` shims without a shell.

### A note on the project path

This project lives in a directory whose name contains a space. That is fine, but quote
paths in shell commands (`cd "F:/Website/question paper solution"`).

---

## Starting with nothing, or with an example

The app starts **empty**. It does not seed itself with demo papers, because a teacher
cannot tell a sample paper they have never seen from one a colleague left behind, and
sample content mixed into a real library is worse than an empty one.

To see a finished paper instead, use **See an example paper** on the dashboard. It creates
one ordinary paper you own — editable, renameable and deletable like any other.

**Settings → Start over → Reset everything** deletes everything: papers, bank questions
and settings. It does not put samples back.

---

## Bringing in questions you already have

Each section has **Bring in questions**, which offers four routes to the same
review-and-tick screen:

| Route | What it reads |
| --- | --- |
| Upload a Word file | A real `.docx` — read in the browser, including Word's own auto-numbering |
| Upload a text file | `.txt` or `.md` |
| Paste | Anything you can copy, including out of a PDF reader |
| Generate with AI | Needs setting up once — see below |

Nothing is added to the paper until you press **Add**: the parse is a guess, so it is
shown to you first and every row can be unticked.

There is deliberately **no "Upload PDF" button**. Extracting text from a PDF needs a
font- and glyph-aware engine; a partial one returns mangled text — joined ligatures,
interleaved columns, shredded tables — which is worse than an honest no. Open the PDF,
select all, copy, and paste instead.

### AI generation, and why it is off by default

**This app ships with no AI account and no API key, and never will.** It is a static site
with no backend of ours, so there is nowhere for a key to live that is not somebody's
browser. Generation is therefore off until you configure it, and the dialog says so
rather than offering a button that fails.

Two ways to turn it on, in the dialog itself:

- **Through your school's own AI address** (recommended). You post to an endpoint your
  school runs, which holds the key server-side. The browser never sees a secret. The
  endpoint must be `https://` — this is enforced, not advised.
- **Straight from this browser with your own key.** Convenient, and honestly labelled: a
  key used from a web page can be read by that page. Use a key you can revoke, put a
  spending limit on it, and never use a shared or school-wide key.

In the second mode the key is held in **`sessionStorage` for that tab only**. Closing the
tab erases it. It is never written to `localStorage`, never into the Zustand store, and
therefore never into a paper or a backup file you might email. `lib/ai.ts` is the only
file that touches a provider, and it explains the reasoning at the top.

---

## Where things are

| Path | What it holds |
| --- | --- |
| `app/page.tsx` | Landing page |
| `app/(app)/editor/` | The two-panel editor — form on the left, live A4 preview on the right |
| `app/(app)/dashboard/` | Overview, recent papers, totals |
| `app/(app)/papers/` | My Question Papers — rename, duplicate, back up to a file, delete, restore |
| `app/(app)/bank/` | Question Bank — filter, multi-select, insert into a section |
| `app/(app)/templates/` | The six exam formats |
| `app/(app)/settings/` | Theme, your details, default school and layout, backup, reset |
| `lib/store.ts` | The single Zustand store, `persist`ed to localStorage |
| `lib/paperBlocks.ts` | **The shared document model** (see below) |
| `lib/export/pdf.ts` | PDF via jsPDF + html2canvas, and the browser print route |
| `lib/export/docx.ts` | Word export via docx.js |
| `lib/importQuestions.ts` | Reads `.docx`, text and pasted input into draft questions |
| `lib/ai.ts` | The only file that talks to an AI provider — read its header first |
| `lib/upload.ts` | One gate every uploaded file passes through |
| `lib/sample.ts` | The example paper, created only when asked for |

### One model, three outputs

A paper is flattened once into an ordered `PaperBlock[]` — header, instructions, section
headings, questions, options, answer lines, end note. The preview, the PDF and the Word
file are all rendered **from that same list**, which is what keeps them consistent as
the paper is edited. Adding a feature means adding a block type and teaching three
renderers about it, rather than editing three independent layout engines.

Pagination is measured, not guessed: blocks are laid out and measured against the real
A4 content box, so a question is never split across a page break and a section heading
is never orphaned at the foot of a page.

---

## Two ways to get a PDF

Both are in the editor's export bar, and they are genuinely different:

- **Download PDF** — one click. Rasterises each sheet, so it is pixel-identical to the
  preview, but the text is an image (not selectable, larger file). Quality is switchable
  under the ⋯ menu.
- **Print → Save as PDF** — the browser's own engine. Keeps text selectable and the file
  small. Use this when the PDF needs to be searchable.

---

## Known preview ↔ Word differences

The Word file is a real, editable document rather than a picture, and Word's layout
model is not CSS. Four deliberate compromises:

1. Marks sit at the end of the last line of a wrapped question stem, rather than
   floating at the top right of the block.
2. The logo is centred above the school name instead of being pinned to the left edge.
3. The `modern` header's right-aligned exam title becomes its own centred line.
4. A centred or right-aligned first line of a stem falls back to left alignment when the
   marks are tabbed into it.

Everything else — bold, italic, underline, superscript, subscript, bullet and numbered
lists, tables, images, code blocks, section numbering, margins, fonts and sizes —
carries across.

---

## Publishing

Live at **<https://question.sarojneupane98.com.np>**, rebuilt by
`.github/workflows/deploy.yml` on every push to `main`.

The app is entirely client-side — papers live in `localStorage`, and the PDF and Word
files are generated in the browser — so `output: 'export'` in `next.config.mjs` produces a
plain folder of HTML and JS that any static host can serve. There is no server to run.

The workflow enables the Pages site itself (`enablement: true`), so there is normally no
manual setup. If your account or organisation forbids that, the run fails with the
three-line manual fix written into its summary: **Settings → Pages → Source: GitHub
Actions**, then re-run.

### The domain, and why `public/CNAME` exists

The site is served from the **root of a custom domain**, so no path prefix is wanted and
`NEXT_PUBLIC_BASE_PATH` stays unset.

`public/CNAME` is what keeps that domain attached. Setting a custom domain in the
repository's Pages settings writes a `CNAME` file into the published branch — but an
Actions deploy publishes only what the build produced, so a build without that file can
drop the domain. Keeping it in `public/` means every deploy re-asserts it.

Two consequences worth knowing:

- `trailingSlash: true` is required. Without it the export emits `editor.html` and Pages
  404s on `/editor/`. It also makes `usePathname()` return a trailing slash, which is why
  `isNavActive()` in `components/layout/Sidebar.tsx` normalises before comparing.
- To serve from a project page instead (`https://<user>.github.io/question/`), delete
  `public/CNAME` and set `NEXT_PUBLIC_BASE_PATH="/${GITHUB_REPOSITORY#*/}"` in the build
  step — a subfolder needs the prefix that a domain root does not. The build step carries
  that line in a comment.

Check the real build before pushing:

```bash
npm run build && npm run preview
```

---

## Data and privacy

All papers, bank questions and settings are stored in your browser's localStorage, and
nothing is uploaded. Uploaded Word and text files are read in the browser too — they are
never sent to a server. Consequences worth knowing:

- Clearing your browser's site data erases them. **Settings → Download a backup** first.
- They do not follow you to another browser or computer; move them with a backup file,
  or back up a single paper from My Question Papers.
- Storage is finite (a few MB). Large logos and pasted images are downscaled
  automatically, but a paper full of photographs can still fill it.
- **The one exception is AI generation**, which you have to switch on yourself. When you
  use it, the topic and instructions you type are sent to the AI service you configured —
  and to nowhere else. Your papers are not sent. Nothing is sent at all unless you press
  *Write questions*.

### The site is public even if the repository is not

This is a published website: anybody who knows the address can open it. That is fine,
because every paper stays in the visitor's own browser and there is no shared database —
but it does mean the repository is not a private place. Do not commit real pupil or staff
data, and do not put confidential material in `public/`, which is served verbatim.
