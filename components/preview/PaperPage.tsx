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
          // ever overflows; if a single block really is taller than a page (a huge
          // pasted image), clipping it is far better than letting it print on top
          // of the footer.
          overflow: 'hidden',
        }}
      >
        <PaperBlockList blocks={page.blocks} paper={paper} options={options} />
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
