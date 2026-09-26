'use client'

import { PaperBlockList, paperTypography, type RenderOptions } from './PaperBlocks'
import { PAGE_FOOTER_MM, type PaginatedPage, type Paper } from '@/lib/types'

/**
 * One A4 sheet.
 *
 * GEOMETRY CONTRACT
 * -----------------
 * `.paper-sheet` is `box-sizing: border-box`, `210mm × 297mm`, `display: flex`,
 * column. The page margins are applied here as padding, and the footer is a
 * fixed `PAGE_FOOTER_MM` flex item. That makes the content box exactly:
 *
 *     297mm − top − bottom − footer  =  geometry.contentHeightMm
 *
 * which is the number `getPageGeometry` hands to the paginator. Change one and
 * you must change the other, or the last block on every page will be wrong.
 *
 * Never add a border to the sheet: with `border-box` sizing a 1px border would
 * shrink the content box and silently shift every page break.
 */
export function PaperPage({
  page,
  total,
  paper,
  options,
}: {
  page: PaginatedPage
  total: number
  paper: Paper
  options: RenderOptions
}) {
  const { margins, showPageNumbers } = paper.layout
  const type = paperTypography(paper.layout)

  return (
    <div
      className="paper-sheet shadow-sheet"
      data-paper-sheet={page.index + 1}
      style={{
        paddingTop: `${margins.top}mm`,
        paddingRight: `${margins.right}mm`,
        paddingBottom: `${margins.bottom}mm`,
        paddingLeft: `${margins.left}mm`,
      }}
    >
      <div
        className={`paper-content ${type.className}`}
        style={{
          ...type.style,
          // Clipping is the last line of defence. Pagination should mean nothing
          // ever overflows; if a single block really is taller than a page it is
          // spread over several (see `page.slice`), and this clip is what shows
          // one page-tall window of it at a time.
          overflow: 'hidden',
        }}
      >
        {page.slice ? (
          /*
            One window onto a block too tall for any page.

            The outer box is exactly as tall as the window, so the clip lands on
            the break the paginator chose — in the gap between two lines — rather
            than at the foot of the content box, which would shave the tops off
            the following line. The inner box is pulled up so the window starts
            in the right place: `marginTop` and not `transform`, because a
            transform does not affect layout and the block would still be
            measured from the top of the box.
          */
          <div style={{ height: `${page.slice.lengthPx}px`, overflow: 'hidden' }}>
            <div style={{ marginTop: `${-page.slice.offsetPx}px` }}>
              <PaperBlockList blocks={page.blocks} paper={paper} options={options} />
            </div>
          </div>
        ) : (
          <PaperBlockList blocks={page.blocks} paper={paper} options={options} />
        )}
      </div>

      {showPageNumbers ? (
        <div className="paper-footer" style={{ height: `${PAGE_FOOTER_MM}mm` }}>
          <span>
            Page {page.index + 1} of {total}
          </span>
        </div>
      ) : null}
    </div>
  )
}
