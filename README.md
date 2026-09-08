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

Other scripts. `build` writes a static site to `out/`; `preview` serves it so you can
check the real build, and `preview:pages` serves it under `/question/` the way GitHub
Pages does (see [Publishing](#publishing)):

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

## Sample data

The app seeds itself the first time it runs: **three sample papers**, a **12-question
question bank**, and a saved default school. So every feature — preview, pagination,
marks totals, PDF and Word export — can be exercised immediately without typing
anything.

To get back to that state: **Settings → Start over → Reset everything**. It restores the
samples rather than emptying the app.

---

## Where things are

| Path | What it holds |
| --- | --- |
| `app/page.tsx` | Landing page |
| `app/(app)/editor/` | The two-panel editor — form on the left, live A4 preview on the right |
| `app/(app)/dashboard/` | Overview, recent papers, totals |
| `app/(app)/papers/` | My Question Papers — rename, duplicate, export to file, delete, import |
| `app/(app)/bank/` | Question Bank — filter, multi-select, insert into a section |
| `app/(app)/templates/` | The six exam formats |
| `app/(app)/settings/` | Theme, your details, default school and layout, backup, reset |
| `lib/store.ts` | The single Zustand store, `persist`ed to localStorage |
| `lib/paperBlocks.ts` | **The shared document model** (see below) |
| `lib/export/pdf.ts` | PDF via jsPDF + html2canvas, and the browser print route |
| `lib/export/docx.ts` | Word export via docx.js |
| `lib/sample.ts` | Seed papers and bank |

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

Live at **<https://sarojneupane98.github.io/question/>**, rebuilt by
`.github/workflows/deploy.yml` on every push to `main`.

The app is entirely client-side — papers live in `localStorage`, and the PDF and Word
files are generated in the browser — so `output: 'export'` in `next.config.mjs` produces a
plain folder of HTML and JS that any static host can serve. There is no server to run.

**One-time setup**, needed once per repository: **Settings → Pages → Build and deployment
→ Source: GitHub Actions**. Until that is set, the deploy step has no Pages site to publish
into and fails.

### The base path

A project page is served from a subfolder (`/question/`), so every link and asset URL has
to carry that prefix. It comes from `NEXT_PUBLIC_BASE_PATH`, which the workflow derives
from the repository name — rename the repo and the URLs follow, with nothing to edit.

Two consequences worth knowing:

- `trailingSlash: true` is required. Without it the export emits `editor.html`, and Pages
  404s on `/editor/`. It also makes `usePathname()` return a trailing slash, which is why
  `isNavActive()` in `components/layout/Sidebar.tsx` normalises before comparing.
- To move to a custom domain instead (say `question.sarojneupane98.com.np`), add a `CNAME`
  file containing the hostname and drop the `NEXT_PUBLIC_BASE_PATH` line from the workflow
  — a domain root needs no prefix.

Check a subpath build locally before pushing, since a wrong prefix is the likeliest way to
break a deploy:

```bash
npm run build && npm run preview:pages
```

---

## Data and privacy

All papers, bank questions and settings are stored in your browser's localStorage. They
are never sent anywhere. Consequences worth knowing:

- Clearing your browser's site data erases them. **Settings → Download a backup** first.
- They do not follow you to another browser or computer; move them with a backup file,
  or export a single paper from My Question Papers.
- Storage is finite (a few MB). Large logos and pasted images are downscaled
  automatically, but a paper full of photographs can still fill it.
