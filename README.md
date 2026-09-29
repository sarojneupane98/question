# Question Paper Generator

One model, three outputs

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

### The site is public even if the repository is not

