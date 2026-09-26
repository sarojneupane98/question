'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { PaperBlockList, paperTypography, type RenderOptions } from './PaperBlocks'
import { getPageGeometry } from '@/lib/geometry'
import { answerLineHeightMm, computeNumberGutter, flattenPaper, paginateBlocks } from '@/lib/paperBlocks'
import type { PageGeometry, PaginatedPage, Paper, PaperBlock } from '@/lib/types'

/**
 * ============================================================================
 *  Measurement-based pagination
 * ============================================================================
 *  Browsers will not tell you where a page break *will* fall, and CSS
 *  `break-inside` alone cannot keep a section heading with its first question or
 *  align marks across a break. So this hook does the layout arithmetic itself:
 *
 *    1. Flatten the paper into blocks (`flattenPaper`).
 *    2. Render every block once, off-screen, at the exact content width the sheet
 *       will use, with the exact same font, size and leading.
 *    3. Read each block's real rendered height out of the DOM.
 *    4. Feed those heights to `paginateBlocks`, which fills pages greedily with
 *       keep-with-next lookahead.
 *
 *  Step 2 is the part that has to be exactly right. The rig and the sheet share
 *  `<PaperBlockList />` and `paperTypography()`, so there is no opportunity for
 *  the measured markup to differ from the printed markup.
 *
 *  RE-MEASURE TRIGGERS
 *  -------------------
 *  Heights change after the first paint for reasons that are easy to forget:
 *  webfonts finish loading, base64 images decode, the teacher changes the body
 *  size. All three are handled — fonts via `document.fonts.ready`, images via
 *  per-image load listeners, everything else via a ResizeObserver on the rig.
 */

export interface PaginationResult {
  blocks: PaperBlock[]
  pages: PaginatedPage[]
  options: RenderOptions
  geometry: PageGeometry
  /** false until the first successful measurement pass. */
  measured: boolean
  /** Attach to the inner element of `<MeasureRig />`. */
  rigRef: React.RefObject<HTMLDivElement>
  /** Force a re-measure (used after an export re-render). */
  remeasure: () => void
}

/** Ignore sub-pixel jitter; anything smaller cannot move a page break. */
const HEIGHT_EPSILON = 0.5

/**
 * Where to break a block that is taller than a page, measured from the rig.
 *
 * A window is a fixed page-tall clip, so the only thing this can choose is where
 * each window *starts*. Stepping by exactly the page height would put the clip
 * through the middle of a line, slicing the last line of one page and the first
 * of the next. Instead each window starts at the top of the first line that did
 * not fit in the previous one, so every break lands in the gap between two lines.
 *
 * Line boxes come from `Range.getClientRects()`, which returns one rect per
 * rendered line — the only way to learn where the browser actually wrapped.
 * Images and tables contribute their own rectangles, since they have no text to
 * measure and a single tall image is exactly the case a break must not slice.
 *
 * Returns null when the block yields no measurable rectangles at all, so the
 * caller can fall back to even page-sized steps.
 */
function measureSliceOffsets(element: HTMLElement, contentHeightPx: number): number[] | null {
  if (contentHeightPx <= 0) return null

  const elementRect = element.getBoundingClientRect()
  const elementTop = elementRect.top
  const total = elementRect.height

  /** Rendered lines, as offsets from the block's top. */
  const lines: Array<{ top: number; bottom: number }> = []

  const push = (top: number, bottom: number) => {
    if (bottom - top > 1) lines.push({ top: top - elementTop, bottom: bottom - elementTop })
  }

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
  let node: Node | null = walker.currentNode
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.nodeValue && node.nodeValue.trim()) {
        const range = document.createRange()
        range.selectNodeContents(node)
        Array.from(range.getClientRects()).forEach((rect) => push(rect.top, rect.bottom))
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      if (el.tagName === 'IMG' || el.tagName === 'TABLE' || el.tagName === 'HR') {
        const rect = el.getBoundingClientRect()
        push(rect.top, rect.bottom)
      }
    }
    node = walker.nextNode()
  }

  if (lines.length === 0) return null

  /*
   * Inline children put several rects on the same visual line (`<strong>` inside
   * a paragraph, for instance), so merge by rounded top and keep the lowest
   * bottom. Sorting by top then gives lines in reading order.
   */
  const merged = new Map<number, number>()
  lines.forEach(({ top, bottom }) => {
    const key = Math.round(top)
    merged.set(key, Math.max(merged.get(key) ?? 0, bottom))
  })
  const ordered = [...merged.entries()]
    .map(([top, bottom]) => ({ top, bottom }))
    .sort((a, b) => a.top - b.top)

  const offsets: number[] = [0]
  let start = 0

  // Bounded so a pathological measurement can never spin forever.
  for (let guard = 0; guard < 500; guard += 1) {
    if (start + contentHeightPx >= total - 1) break

    const limit = start + contentHeightPx

    // The last line that is completely inside this window.
    let lastFitting = -1
    ordered.forEach((line, i) => {
      if (line.bottom <= limit + 0.5) lastFitting = i
    })

    let next: number
    if (lastFitting < 0) {
      /*
       * Not one line fits in this window — a single image or table taller than a
       * whole page. There is nothing to snap to, and snapping to the top of that
       * oversized line would advance by its leading padding alone: a window nine
       * pixels tall, printed as a sheet with a sliver of white on it. So step a
       * full page and let the break fall where it must. An image taller than the
       * paper has to be cut somewhere.
       */
      next = start + contentHeightPx
    } else {
      const following = ordered[lastFitting + 1]
      next = following ? following.top : start + contentHeightPx
    }

    // Overlapping line boxes could otherwise stall the walk on one offset.
    if (next <= start + 1) next = start + contentHeightPx

    offsets.push(next)
    start = next
  }

  return offsets
}

export function usePagination(paper: Paper): PaginationResult {
  const blocks = useMemo(() => flattenPaper(paper), [paper])
  const geometry = useMemo(() => getPageGeometry(paper.layout), [paper.layout])

  const options = useMemo<RenderOptions>(
    () => ({
      gutterCh: computeNumberGutter(blocks),
      lineHeightMm: answerLineHeightMm(paper.layout.fontSizePt),
    }),
    [blocks, paper.layout.fontSizePt],
  )

  const rigRef = useRef<HTMLDivElement>(null)
  const heightsRef = useRef<Map<string, number>>(new Map())
  const slicesRef = useRef<Map<string, number[]>>(new Map())
  /*
   * `measure` must keep a stable identity — it is a dependency of the effect
   * that installs the ResizeObserver, and a new identity would tear the observer
   * down and rebuild it on every render. It therefore reads the current geometry
   * through a ref rather than closing over it.
   */
  const contentHeightRef = useRef(geometry.contentHeightPx)
  contentHeightRef.current = geometry.contentHeightPx
  const [heights, setHeights] = useState<Map<string, number>>(heightsRef.current)
  const [slices, setSlices] = useState<Map<string, number[]>>(slicesRef.current)
  const [measured, setMeasured] = useState(false)

  const measure = useCallback(() => {
    const rig = rigRef.current
    if (!rig) return

    /*
     * A rig with no width means the preview is not laid out — the editor hides
     * the preview column below `lg`, and a hidden column gives every block a
     * height of zero. Measuring then would say a fifty-mark paper fits on one
     * page, and that wrong page count is what the export bar reports to the
     * teacher. Better to keep the last honest measurement and wait: the
     * ResizeObserver fires again the moment the column is shown.
     */
    if (rig.clientWidth === 0) return

    const contentHeightPx = contentHeightRef.current

    const next = new Map<string, number>()
    const nextSlices = new Map<string, number[]>()
    rig.querySelectorAll<HTMLElement>('[data-block-id]').forEach((node) => {
      const id = node.dataset.blockId
      if (!id) return
      // getBoundingClientRect includes fractional pixels; offsetHeight rounds and
      // would accumulate several millimetres of error over a full page.
      const height = node.getBoundingClientRect().height
      next.set(id, height)

      // Only blocks that cannot fit on a page need slice offsets, and computing
      // line rects for every block would be wasted work on a long paper.
      if (height > contentHeightPx + HEIGHT_EPSILON) {
        const offsets = measureSliceOffsets(node, contentHeightPx)
        if (offsets && offsets.length > 1) nextSlices.set(id, offsets)
      }
    })

    const prev = heightsRef.current
    let changed = next.size !== prev.size
    if (!changed) {
      next.forEach((height, id) => {
        const before = prev.get(id)
        if (before === undefined || Math.abs(before - height) > HEIGHT_EPSILON) changed = true
      })
    }

    if (changed) {
      heightsRef.current = next
      setHeights(next)
      slicesRef.current = nextSlices
      setSlices(nextSlices)
    }
    setMeasured(true)
  }, [])

  useEffect(() => {
    const rig = rigRef.current
    if (!rig) return

    let cancelled = false
    let frame = 0

    const run = () => {
      if (!cancelled) measure()
    }

    /**
     * Two frames, not one. The first lets React commit the rig; the second lets
     * the browser finish style and layout for it. Measuring inside the first
     * frame returns pre-layout heights on Safari.
     */
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(run)
      })
    }

    schedule()

    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(schedule).catch(() => {})
    }

    // Base64 images decode asynchronously and change the height of their block.
    const images = Array.from(rig.querySelectorAll('img'))
    const pending = images.filter((img) => !img.complete)
    pending.forEach((img) => {
      img.addEventListener('load', schedule, { once: true })
      img.addEventListener('error', schedule, { once: true })
    })

    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(schedule)
      observer.observe(rig)
    }

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      pending.forEach((img) => {
        img.removeEventListener('load', schedule)
        img.removeEventListener('error', schedule)
      })
      observer?.disconnect()
    }
    // The rig re-renders whenever any of these change, so re-measure after it
    // does. They are dependencies of the *rendered output*, not of the callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure, blocks, options, geometry.contentWidthPx])

  const pages = useMemo(
    () =>
      paginateBlocks(
        blocks,
        (id) => heights.get(id) ?? 0,
        geometry.contentHeightPx,
        (id) => slices.get(id) ?? null,
      ),
    [blocks, heights, slices, geometry.contentHeightPx],
  )

  return { blocks, pages, options, geometry, measured, rigRef, remeasure: measure }
}

/**
 * The hidden measuring rig.
 *
 * The outer wrapper is a zero-height, clipped, positioned box: `overflow: hidden`
 * hides the rig without affecting the layout of its children (unlike
 * `display: none`, which would give every block a height of zero), and the zero
 * height keeps a ten-page paper's worth of off-screen content from adding
 * scrollbars to the editor.
 */
export function MeasureRig({
  paper,
  blocks,
  options,
  geometry,
  rigRef,
}: {
  paper: Paper
  blocks: PaperBlock[]
  options: RenderOptions
  geometry: PageGeometry
  rigRef: React.RefObject<HTMLDivElement>
}) {
  const type = paperTypography(paper.layout)

  return (
    <div
      aria-hidden="true"
      className="no-print"
      style={{ position: 'relative', height: 0, overflow: 'hidden' }}
    >
      <div
        ref={rigRef}
        className={`measure-rig ${type.className}`}
        style={{
          ...type.style,
          width: `${geometry.contentWidthPx}px`,
          // The sheet is always white; measuring against a themed background
          // would be harmless, but keeping them identical avoids surprises if a
          // future style ever depends on the background.
          backgroundColor: '#ffffff',
        }}
      >
        <PaperBlockList blocks={blocks} paper={paper} options={options} />
      </div>
    </div>
  )
}
