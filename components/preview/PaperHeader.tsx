'use client'

import { getFontSpec } from '@/lib/geometry'
import { paperHeadline, paperMetaItems, STUDENT_FIELDS, type PaperMetaItem } from '@/lib/paperBlocks'
import type { Paper } from '@/lib/types'

/* -------------------------------------------------------------------------- */
/*  Header meta row                                                            */
/* -------------------------------------------------------------------------- */

type MetaItem = PaperMetaItem

/**
 * Lays the meta items out three to a row: left, centre, right.
 *
 * Chunking rather than one long flex line is deliberate — it keeps "Full Marks"
 * and "Time" on a predictable edge no matter which optional fields the teacher
 * has filled in, and it never produces a lonely orphan item on its own line
 * halfway across the page.
 */
function MetaGrid({ items, className = '' }: { items: MetaItem[]; className?: string }) {
  if (items.length === 0) return null

  const rows: MetaItem[][] = []
  for (let i = 0; i < items.length; i += 3) rows.push(items.slice(i, i + 3))

  return (
    <div className={className}>
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          style={{ display: 'flex', justifyContent: 'space-between', gap: '4mm' }}
        >
          {[0, 1, 2].map((column) => {
            const item = row[column]
            const align = column === 0 ? 'left' : column === 1 ? 'center' : 'right'
            return (
              <span
                key={column}
                style={{
                  flex: '1 1 0',
                  textAlign: align,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {item ? (
                  <>
                    <span style={{ fontWeight: 600 }}>{item.label}:</span> {item.value}
                  </>
                ) : (
                  ' '
                )}
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Logo                                                                       */
/* -------------------------------------------------------------------------- */

function Logo({ src, size }: { src: string; size: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        display: 'block',
      }}
    />
  )
}

/* -------------------------------------------------------------------------- */
/*  Header                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The printed paper header, in four styles.
 *
 * All sizing is in millimetres and points rather than Tailwind classes, because
 * this markup is measured for pagination and rasterised for the PDF: absolute
 * units keep the three outputs identical, whereas rem-based classes would drift
 * with the root font size.
 */
export function PaperHeader({ paper }: { paper: Paper }) {
  const { school, exam, layout } = paper
  const items = paperMetaItems(paper)
  const showLogo = layout.showLogo && Boolean(school.logoDataUrl)
  const fontClass = getFontSpec(layout.font).className

  const title = paperHeadline(paper)

  if (layout.headerStyle === 'compact') {
    return (
      <div className={fontClass}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3mm' }}>
          {showLogo ? <Logo src={school.logoDataUrl!} size="11mm" /> : null}
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <div style={{ fontSize: '13pt', fontWeight: 700, lineHeight: 1.15 }}>
              {school.name || 'School name'}
            </div>
            <div style={{ fontSize: '9.5pt', lineHeight: 1.3 }}>
              {[school.address, title].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>
        <hr className="paper-divider" style={{ marginTop: '1.6mm' }} />
        <MetaGrid items={items} className="mt-[1.4mm] text-[9.5pt]" />
        <hr className="paper-divider" style={{ marginTop: '1.4mm' }} />
      </div>
    )
  }

  if (layout.headerStyle === 'modern') {
    return (
      <div className={fontClass}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4mm' }}>
          {showLogo ? <Logo src={school.logoDataUrl!} size="17mm" /> : null}
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <div style={{ fontSize: '16pt', fontWeight: 700, lineHeight: 1.12, letterSpacing: '-0.01em' }}>
              {school.name || 'School name'}
            </div>
            {school.address ? (
              <div style={{ fontSize: '9.5pt', lineHeight: 1.35 }}>{school.address}</div>
            ) : null}
            {school.affiliation ? (
              <div style={{ fontSize: '8.5pt', lineHeight: 1.35, fontStyle: 'italic' }}>
                {school.affiliation}
              </div>
            ) : null}
            {school.contact ? (
              <div style={{ fontSize: '8.5pt', lineHeight: 1.35 }}>{school.contact}</div>
            ) : null}
          </div>
          <div style={{ flex: '0 0 auto', textAlign: 'right', maxWidth: '58mm' }}>
            <div style={{ fontSize: '11.5pt', fontWeight: 700, lineHeight: 1.2 }}>
              {exam.title || 'Examination'}
            </div>
            {exam.academicYear ? (
              <div style={{ fontSize: '9pt', lineHeight: 1.3 }}>{exam.academicYear}</div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            marginTop: '2.4mm',
            borderTop: '2px solid #000000',
            borderBottom: '1px solid #000000',
            paddingTop: '1.4mm',
            paddingBottom: '1.4mm',
          }}
        >
          <MetaGrid items={items} className="text-[9.5pt]" />
        </div>
      </div>
    )
  }

  const inner = (
    <>
      <div style={{ position: 'relative', textAlign: 'center' }}>
        {showLogo ? (
          <div style={{ position: 'absolute', left: 0, top: 0 }}>
            <Logo src={school.logoDataUrl!} size="16mm" />
          </div>
        ) : null}
        <div
          style={{
            fontSize: '15pt',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            lineHeight: 1.15,
            // Keep the centred title optically centred despite the floating logo.
            paddingLeft: showLogo ? '18mm' : 0,
            paddingRight: showLogo ? '18mm' : 0,
          }}
        >
          {school.name || 'School name'}
        </div>
        {school.address ? (
          <div style={{ fontSize: '9.5pt', lineHeight: 1.35 }}>{school.address}</div>
        ) : null}
        {school.affiliation ? (
          <div style={{ fontSize: '8.5pt', fontStyle: 'italic', lineHeight: 1.35 }}>
            {school.affiliation}
          </div>
        ) : null}
        {school.contact ? (
          <div style={{ fontSize: '8.5pt', lineHeight: 1.35 }}>{school.contact}</div>
        ) : null}
        {title ? (
          <div style={{ fontSize: '12pt', fontWeight: 700, marginTop: '1.6mm', lineHeight: 1.25 }}>
            {title}
          </div>
        ) : null}
      </div>

      <div
        style={{
          marginTop: '2mm',
          borderTop: '1px solid #000000',
          borderBottom: '1px solid #000000',
          paddingTop: '1.3mm',
          paddingBottom: '1.3mm',
        }}
      >
        <MetaGrid items={items} className="text-[9.5pt]" />
      </div>
    </>
  )

  if (layout.headerStyle === 'boxed') {
    return (
      <div className={fontClass} style={{ border: '1px solid #000000', padding: '3mm 3.5mm' }}>
        {inner}
      </div>
    )
  }

  return <div className={fontClass}>{inner}</div>
}

/* -------------------------------------------------------------------------- */
/*  Student fields                                                             */
/* -------------------------------------------------------------------------- */

/** The "Name / Roll No / Section / Invigilator" line students fill in. */
export function StudentFields() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '5mm',
        fontSize: '9.5pt',
        lineHeight: 1.5,
      }}
    >
      {STUDENT_FIELDS.map((field) => (
        <div
          key={field.label}
          style={{ display: 'flex', alignItems: 'flex-end', gap: '1.4mm', flex: `${field.grow} 1 0`, minWidth: 0 }}
        >
          <span style={{ whiteSpace: 'nowrap' }}>{field.label}:</span>
          <span className="paper-dots" />
        </div>
      ))}
    </div>
  )
}
