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

const DANGEROUS_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'FORM'])

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
 * Removes anything that must never be injected via `dangerouslySetInnerHTML`.
 * The content is authored locally by the teacher, but papers can be imported
 * from a JSON file, so this is a real boundary.
 *
 * Images are held to a stricter rule than the rest: every image this app
 * produces is a `data:image/...` URL from `prepareImageFile`, so an off-origin
 * `src` can only have come from a hand-edited or hostile file, where it would
 * make the page fetch a remote resource the teacher never chose. Such images are
 * dropped whole rather than left with a stripped `src`, which would print a
 * broken-image box in the middle of a question.
 */
export function sanitizeRichHtml(html: string): string {
  if (!html) return ''
  const root = parseFragment(html)
  if (!root) {
    return html
      .replace(/<\s*(script|style|iframe|object|embed|form)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
      .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/javascript:/gi, '')
  }

  const walker = root.querySelectorAll('*')
  walker.forEach((el) => {
    if (DANGEROUS_TAGS.has(el.tagName)) {
      el.remove()
      return
    }
    if (el.tagName === 'IMG' && !/^data:image\//i.test(el.getAttribute('src') ?? '')) {
      el.remove()
      return
    }
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase()
      const value = attr.value
      if (name.startsWith('on')) el.removeAttribute(attr.name)
      if ((name === 'href' || name === 'src') && /^\s*javascript:/i.test(value)) {
        el.removeAttribute(attr.name)
      }
    })
  })
  return root.innerHTML
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
