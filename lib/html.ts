/**
 * HTML helpers shared by the preview, the PDF path and the DOCX walker.
 *
 * Every function here is SSR-safe: when `DOMParser` is unavailable it falls back
 * to a conservative regex implementation. The fallbacks may return coarser
 * results (e.g. a single un-split block), which is why any component whose
 * markup depends on these must wait for mount before rendering — see
 * `components/preview/PaperPreview.tsx`.
 */

const BLOCK_TAGS = new Set([
  'P',
  'UL',
  'OL',
  'PRE',
  'TABLE',
  'BLOCKQUOTE',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'DIV',
  'FIGURE',
  'HR',
  'IMG',
])

/**
 * The only elements allowed to survive sanitising.
 *
 * Derived from what this app can actually render and export rather than from
 * what HTML offers: the Tiptap schema in `RichTextEditor.tsx`, the block list
 * above, and the tags the DOCX walker understands (`lib/export/htmlToDocx.ts`).
 * Headings and blockquotes are switched off in the editor but stay allowed,
 * because the preview and the DOCX walker both handle them and an imported
 * paper may carry them.
 *
 * Anything not listed is *unwrapped* rather than deleted — its text survives,
 * its element does not — so an unexpected wrapper cannot silently swallow a
 * teacher's question.
 */
const ALLOWED_TAGS = new Set([
  // blocks
  'p', 'div', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'pre', 'blockquote',
  'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
  'img',
  // inline
  'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'ins',
  'sup', 'sub', 'code', 'span', 'mark', 'small', 'a',
])

/**
 * Elements removed with their whole subtree instead of being unwrapped.
 *
 * Unwrapping these would be worse than useless: `<style>` would spill CSS into
 * the paper as visible text, and `<svg>`/`<math>` open foreign-content
 * namespaces where tag names stay case-sensitive and `<script>` is legal — the
 * classic way past a sanitiser that compares uppercase HTML tag names only.
 */
const DROP_SUBTREE = [
  'script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'base',
  'form', 'input', 'button', 'select', 'option', 'textarea', 'label',
  'svg', 'math', 'template', 'noscript', 'frame', 'frameset', 'applet',
  'audio', 'video', 'source', 'track', 'canvas', 'map', 'area', 'portal',
].join(',')

/** Attributes worth keeping, per element. Everything else is dropped. */
const GLOBAL_ATTRS = new Set(['style', 'class'])
const ATTRS_BY_TAG: Record<string, string[]> = {
  img: ['src', 'alt', 'width', 'height'],
  a: ['href', 'title'],
  ol: ['start'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan', 'scope'],
  table: ['border'],
}

/** CSS properties an inline `style` may declare. `text-align` is the load-bearing one. */
const ALLOWED_STYLE_PROPS = new Set([
  'text-align',
  'width',
  'height',
  'font-weight',
  'font-style',
  'text-decoration',
  'vertical-align',
])

/**
 * Link targets that cannot execute anything: the three real schemes, plus
 * anchors and relative paths. Anything else — `javascript:`, `data:`, `vbscript:`,
 * `file:` — fails to match and the `href` is dropped.
 */
const SAFE_HREF = /^(?:https?:\/\/|mailto:|tel:|#|\/|\.{0,2}\/|[^:]*$)/i

/**
 * Keeps only the declarations this app understands, and only when the value is a
 * plain literal — no `url(...)`, no `expression(...)`, no CSS variables.
 */
function sanitizeStyle(style: string): string {
  return style
    .split(';')
    .map((decl) => {
      const at = decl.indexOf(':')
      if (at < 0) return ''
      const prop = decl.slice(0, at).trim().toLowerCase()
      const value = decl.slice(at + 1).trim()
      if (!ALLOWED_STYLE_PROPS.has(prop)) return ''
      if (!value || /[()\\]|url|expression|var|@import/i.test(value)) return ''
      return `${prop}: ${value}`
    })
    .filter(Boolean)
    .join('; ')
}

function hasDom(): boolean {
  return typeof window !== 'undefined' && typeof DOMParser !== 'undefined'
}

function parseFragment(html: string): HTMLElement | null {
  if (!hasDom()) return null
  try {
    const doc = new DOMParser().parseFromString(
      `<!doctype html><html><body><div id="qpg-root">${html}</div></body></html>`,
      'text/html',
    )
    return doc.getElementById('qpg-root')
  } catch {
    return null
  }
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function decodeBasicEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

/**
 * Reduces arbitrary HTML to the small subset this app can render, print and
 * export. Everything that reaches `dangerouslySetInnerHTML`, jsPDF or docx.js
 * passes through here first.
 *
 * The content is usually authored locally by the teacher — but a paper can
 * arrive from a backup file or a Word document, so this is a real trust
 * boundary and works as an allowlist: unknown elements are unwrapped, unknown
 * attributes are dropped, and the handful of elements that would be dangerous
 * even when emptied are deleted with their children.
 *
 * Images are held to a stricter rule than the rest. Every image this app
 * produces is a `data:image/...` URL from `prepareImageFile`, so an off-origin
 * `src` can only have come from a hand-edited or hostile file, where it would
 * make the page fetch a remote resource the teacher never chose — and would
 * leak the fact that the paper was opened, to whoever owns that URL. Such
 * images are dropped whole rather than left with a stripped `src`, which would
 * print a broken-image box in the middle of a question. SVG is excluded even as
 * a data URL: it is a document format, not a picture, and neither the PDF
 * rasteriser nor the DOCX writer handles it usefully.
 */
export function sanitizeRichHtml(html: string): string {
  if (!html) return ''
  const root = parseFragment(html)
  if (!root) return sanitizeWithoutDom(html)

  // Whole subtrees first: emptying these would leave their text behind.
  root.querySelectorAll(DROP_SUBTREE).forEach((el) => el.remove())

  // `querySelectorAll` returns a static list in document order, so parents are
  // always seen before their children — an unwrapped element's children are
  // still visited after being promoted.
  root.querySelectorAll('*').forEach((el) => {
    const tag = el.localName.toLowerCase()

    if (!ALLOWED_TAGS.has(tag)) {
      el.replaceWith(...Array.from(el.childNodes))
      return
    }

    if (tag === 'img' && !/^data:image\/(?!svg)[a-z0-9.+-]+[;,]/i.test(el.getAttribute('src') ?? '')) {
      el.remove()
      return
    }

    const allowed = ATTRS_BY_TAG[tag]
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase()
      if (!GLOBAL_ATTRS.has(name) && !allowed?.includes(name)) {
        el.removeAttribute(attr.name)
        return
      }
      if (name === 'style') {
        const safe = sanitizeStyle(attr.value)
        if (safe) el.setAttribute('style', safe)
        else el.removeAttribute(attr.name)
        return
      }
      if (name === 'href' && !SAFE_HREF.test(attr.value.trim())) {
        el.removeAttribute(attr.name)
      }
    })
  })

  return root.innerHTML
}

/**
 * Server-side fallback for when `DOMParser` is unavailable.
 *
 * Regexes cannot parse HTML, so this errs hard towards deletion: dangerous
 * subtrees go first, then every remaining tag not on the allowlist is stripped
 * to its text. The result may be plainer than the DOM path would give, which is
 * the right way round — the DOM path runs in the browser, where the markup is
 * actually rendered.
 */
function sanitizeWithoutDom(html: string): string {
  return html
    .replace(
      /<\s*(script|style|iframe|object|embed|form|svg|math|template|noscript|canvas|video|audio)\b[\s\S]*?<\s*\/\s*\1\s*>/gi,
      '',
    )
    .replace(/<\s*(script|style|iframe|object|embed|form|svg|math)\b[^>]*>/gi, '')
    .replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (tag, name: string) =>
      ALLOWED_TAGS.has(name.toLowerCase()) ? tag : '',
    )
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
}


/**
 * Splits a rich-text string into its top-level block nodes.
 *
 * This is what makes a long question break cleanly across pages: instead of one
 * un-splittable monolith, a three-paragraph question becomes three blocks that
 * the paginator can distribute. Loose inline content is wrapped in a `<p>`.
 */
export function splitHtmlIntoTopLevelBlocks(html: string): string[] {
  const trimmed = (html ?? '').trim()
  if (!trimmed) return []

  const root = parseFragment(trimmed)
  if (!root) return [trimmed]

  const out: string[] = []
  let inline = ''

  const flush = () => {
    if (inline.trim()) out.push(`<p>${inline}</p>`)
    inline = ''
  }

  Array.from(root.childNodes).forEach((node) => {
    if (node.nodeType === 1) {
      const el = node as Element
      if (BLOCK_TAGS.has(el.tagName)) {
        flush()
        out.push(el.outerHTML)
      } else {
        inline += el.outerHTML
      }
    } else if (node.nodeType === 3) {
      inline += escapeHtml(node.textContent ?? '')
    }
  })
  flush()

  return out.filter((chunk) => chunk.trim().length > 0)
}

export function htmlToPlainText(html: string): string {
  if (!html) return ''
  const root = parseFragment(html)
  if (root) {
    // Preserve visual line breaks so excerpts read sensibly.
    root.querySelectorAll('br').forEach((br) => br.replaceWith(' '))
    root.querySelectorAll('p, li, tr, div, pre').forEach((el) => el.append(' '))
    return (root.textContent ?? '').replace(/\s+/g, ' ').trim()
  }
  return decodeBasicEntities(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

/** True when there is no visible content at all (no text, no image, no table). */
export function isHtmlEmpty(html: string): boolean {
  if (!html) return true
  if (/<(img|table)\b/i.test(html)) return false
  return htmlToPlainText(html).length === 0
}

/**
 * Unwraps a lone `<p>` wrapper so short rich text can be rendered inline
 * (MCQ options, matching cells, section notes).
 */
export function toInlineHtml(html: string): string {
  const trimmed = (html ?? '').trim()
  if (!trimmed) return ''
  const root = parseFragment(trimmed)
  if (!root) return trimmed.replace(/^<p>/i, '').replace(/<\/p>$/i, '')
  const children = Array.from(root.children)
  if (children.length === 1 && children[0].tagName === 'P') {
    return children[0].innerHTML
  }
  return root.innerHTML
}

export function richTextExcerpt(html: string, max = 130): string {
  const text = htmlToPlainText(html)
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}

export function countWords(html: string): number {
  const text = htmlToPlainText(html)
  if (!text) return 0
  return text.split(/\s+/).filter(Boolean).length
}

/** Collects every `<img src="data:...">` in a rich-text string. */
export function extractImageSources(html: string): string[] {
  const root = parseFragment(html)
  if (root) {
    return Array.from(root.querySelectorAll('img'))
      .map((img) => img.getAttribute('src') ?? '')
      .filter(Boolean)
  }
  const matches = html.match(/<img[^>]+src=["']([^"']+)["']/gi) ?? []
  return matches
    .map((tag) => {
      const m = tag.match(/src=["']([^"']+)["']/i)
      return m ? m[1] : ''
    })
    .filter(Boolean)
}
