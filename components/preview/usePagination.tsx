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
  const [heights, setHeights] = useState<Map<string, number>>(heightsRef.current)
  const [measured, setMeasured] = useState(false)

  const measure = useCallback(() => {
    const rig = rigRef.current
    if (!rig) return

    const next = new Map<string, number>()
    rig.querySelectorAll<HTMLElement>('[data-block-id]').forEach((node) => {
      const id = node.dataset.blockId
      if (!id) return
      // getBoundingClientRect includes fractional pixels; offsetHeight rounds and
      // would accumulate several millimetres of error over a full page.
      next.set(id, node.getBoundingClientRect().height)
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
    () => paginateBlocks(blocks, (id) => heights.get(id) ?? 0, geometry.contentHeightPx),
    [blocks, heights, geometry.contentHeightPx],
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
