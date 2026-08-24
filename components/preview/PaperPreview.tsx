'use client'

import { useEffect } from 'react'

import { PaperPage } from './PaperPage'
import { MeasureRig, usePagination } from './usePagination'
import { cn } from '@/lib/cn'
import { PAPER_STACK_ID, type Paper } from '@/lib/types'

/** On-screen gap between sheets, in CSS pixels. Removed when printing. */
const SHEET_GAP_PX = 20

export interface PaperPreviewProps {
  paper: Paper
  /** 0.5–1.6. Applied as a transform so the sheet's pixel size never changes. */
  zoom?: number
  className?: string
  onPageCountChange?: (count: number) => void
}

/**
 * The live A4 preview.
 *
 * Always white, always print metrics, regardless of the dashboard theme — a
 * question paper is white paper. The dark-mode styles deliberately do not reach
 * inside `.paper-sheet`.
 */
export function PaperPreview({
  paper,
  zoom = 1,
  className,
  onPageCountChange,
}: PaperPreviewProps) {
  const { blocks, pages, options, geometry, measured, rigRef } = usePagination(paper)

  useEffect(() => {
    onPageCountChange?.(pages.length)
  }, [pages.length, onPageCountChange])

  const sheetCount = pages.length
  const stackHeightPx =
    sheetCount * geometry.heightPx + Math.max(0, sheetCount - 1) * SHEET_GAP_PX

  return (
    <div className={cn('print-root', className)}>
      <MeasureRig
        paper={paper}
        blocks={blocks}
        options={options}
        geometry={geometry}
        rigRef={rigRef}
      />

      {/*
        Two nested wrappers are needed for zoom:
          • the outer one reserves the *scaled* size so the scroll container knows
            how much room the sheets take,
          • the inner one carries the transform at the sheets' natural size.
        Resizing the sheet itself instead would invalidate every measurement.
      */}
      <div
        className="print-zoom-reset mx-auto"
        style={{
          width: `${geometry.widthPx * zoom}px`,
          height: `${stackHeightPx * zoom}px`,
        }}
      >
        <div
          className="print-zoom-reset"
          style={{
            width: `${geometry.widthPx}px`,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
          }}
        >
          <div
            id={PAPER_STACK_ID}
            className="paper-stack"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: `${SHEET_GAP_PX}px`,
              // Keeps the sheets from flickering to width 0 while heights are
              // still unknown on the very first frame.
              visibility: measured ? 'visible' : 'hidden',
            }}
          >
            {pages.map((page) => (
              <PaperPage
                key={page.index}
                page={page}
                total={sheetCount}
                paper={paper}
                options={options}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
