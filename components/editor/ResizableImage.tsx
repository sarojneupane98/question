'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from '@tiptap/extension-image'
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'

/**
 * ============================================================================
 *  Pictures the teacher can resize
 * ============================================================================
 *  Tiptap's Image node with a corner grip. Drag it, or focus it and use the
 *  arrow keys, and the picture is stored with a width; press Home and the width
 *  is cleared, putting the picture back to its own size.
 *
 *  WHY THE WIDTH IS A PERCENTAGE
 *  -----------------------------
 *  The obvious unit is pixels, and it is the wrong one here. The box a teacher
 *  types into is a few hundred pixels wide; the printed text column is about
 *  170 mm. A picture dragged to "half of what I am looking at" would be some
 *  other fraction of the page, and changing the margins later would silently
 *  change every picture's share of the line.
 *
 *  A percentage means one thing everywhere: 50% is half the text column in the
 *  editor, in the A4 preview, in the PDF and in the Word file. It survives a
 *  change of margins, paper size or font, and it cannot overflow the column.
 *
 *  WHAT IS ACTUALLY SAVED
 *  ----------------------
 *  `<img src="data:image/jpeg;base64,…" style="width: 48%">` — nothing else.
 *  The markup below is editor furniture and never leaves this component.
 *  `width` is already an allowed inline style in `sanitizeRichHtml`
 *  (`lib/html.ts`), `.rich-content img` in `app/globals.css` keeps the height
 *  proportional, and `imageRun` in `lib/export/htmlToDocx.ts` reads the same
 *  percentage back to size the picture in Word. So all four outputs agree
 *  without the size having to be stored twice.
 */

/** Small enough for an inline symbol, without letting a picture vanish. */
const MIN_PERCENT = 5
const MAX_PERCENT = 100
/** One arrow key press; ten times that with Shift held. */
const STEP_PERCENT = 2

function clampPercent(value: number): number {
  return Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, Math.round(value)))
}

/** Reads `style="width: 48%"` back off an `<img>`. Anything else means "own size". */
function parsePercent(value: string | null | undefined): number | null {
  const match = /^\s*([\d.]+)\s*%\s*$/.exec(value ?? '')
  if (!match) return null
  const percent = Number(match[1])
  return Number.isFinite(percent) ? clampPercent(percent) : null
}

/* -------------------------------------------------------------------------- */

function ImageNodeView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const frameRef = useRef<HTMLSpanElement | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const gripRef = useRef<HTMLSpanElement | null>(null)
  /** Latest value of an in-flight drag, read once on release. */
  const liveRef = useRef<number | null>(null)

  const [dragPercent, setDragPercent] = useState<number | null>(null)
  const [ownPercent, setOwnPercent] = useState<number | null>(null)
  const [focused, setFocused] = useState(false)

  const attrPercent = typeof node.attrs.width === 'number' ? clampPercent(node.attrs.width) : null
  // While a drag is in flight the grip drives the width directly. Committing
  // every pointer move to the document would put hundreds of entries on the
  // undo stack with a store write behind each one.
  const percent = dragPercent ?? attrPercent
  const shown = percent ?? ownPercent ?? MAX_PERCENT

  /** Width of the line the picture sits on — what the percentage is a share of. */
  const lineWidth = useCallback(() => {
    // The frame's parent is the node-view wrapper: a full-width block, so its
    // width is the width of the text column at this point in the document.
    return frameRef.current?.parentElement?.getBoundingClientRect().width ?? 0
  }, [])

  /** What share of the line the picture takes at its own size. */
  const measure = useCallback(() => {
    const img = imgRef.current
    const line = lineWidth()
    if (!img || line <= 0) return null
    const width = img.getBoundingClientRect().width
    return width > 0 ? clampPercent((width / line) * 100) : null
  }, [lineWidth])

  // Only needed so the grip can announce a figure, and so the arrow keys have
  // somewhere to start from, for a picture nobody has resized yet.
  useEffect(() => {
    if (percent !== null) return
    setOwnPercent(measure())
  }, [percent, measure])

  /* ---- the grip -------------------------------------------------------- */

  const startDrag = (event: PointerEvent) => {
    if (event.button !== 0) return
    event.stopPropagation()

    const grip = gripRef.current
    const img = imgRef.current
    const line = lineWidth()
    if (!grip || !img || line <= 0) return

    // The mousedown that would normally do this is suppressed below, so that
    // the editor does not treat the grip as a place to put the caret.
    grip.focus()

    const startX = event.clientX
    const startWidth = img.getBoundingClientRect().width
    grip.setPointerCapture(event.pointerId)

    const onMove = (move: PointerEvent) => {
      const next = clampPercent(((startWidth + (move.clientX - startX)) / line) * 100)
      liveRef.current = next
      setDragPercent(next)
    }

    const onDone = () => {
      grip.removeEventListener('pointermove', onMove)
      grip.removeEventListener('pointerup', onDone)
      grip.removeEventListener('pointercancel', onDone)
      const final = liveRef.current
      liveRef.current = null
      setDragPercent(null)
      if (final !== null) updateAttributes({ width: final })
    }

    grip.addEventListener('pointermove', onMove)
    grip.addEventListener('pointerup', onDone)
    grip.addEventListener('pointercancel', onDone)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    const apply = (width: number | null) => {
      event.preventDefault()
      event.stopPropagation()
      updateAttributes({ width })
    }
    const step = event.shiftKey ? STEP_PERCENT * 5 : STEP_PERCENT

    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') apply(clampPercent(shown + step))
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') apply(clampPercent(shown - step))
    else if (event.key === 'End') apply(MAX_PERCENT)
    else if (event.key === 'Home') apply(null)
  }

  /*
   * Native listeners rather than React props, and this is load-bearing.
   *
   * ProseMirror listens for keydown and mousedown on the editor root; React 18
   * listens on the application root, further out. A React handler here would
   * therefore run *after* ProseMirror had already acted on the event. Listeners
   * on the grip itself see it first and stop it there. Two events matter:
   *
   *   keydown   — the arrow keys would otherwise move the selection off the
   *               picture instead of resizing it.
   *   mousedown — Tiptap's Image node is `draggable`, so ProseMirror marks the
   *               node view `draggable` too (`prosemirror-view`: a contentless
   *               node view gets `contentEditable="false"` and, when the node
   *               is draggable, `draggable = true`). Without `preventDefault`
   *               here, pulling the grip would drag the picture out of the
   *               paragraph rather than resize it.
   */
  const latest = useRef({ startDrag, onKeyDown, updateAttributes })
  useEffect(() => {
    latest.current = { startDrag, onKeyDown, updateAttributes }
  })

  useEffect(() => {
    const grip = gripRef.current
    if (!grip) return

    const down = (event: PointerEvent) => latest.current.startDrag(event)
    const key = (event: KeyboardEvent) => latest.current.onKeyDown(event)
    const swallow = (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
    }
    const reset = (event: MouseEvent) => {
      event.stopPropagation()
      latest.current.updateAttributes({ width: null })
    }

    grip.addEventListener('pointerdown', down)
    grip.addEventListener('mousedown', swallow)
    grip.addEventListener('dblclick', reset)
    grip.addEventListener('keydown', key)
    return () => {
      grip.removeEventListener('pointerdown', down)
      grip.removeEventListener('mousedown', swallow)
      grip.removeEventListener('dblclick', reset)
      grip.removeEventListener('keydown', key)
    }
  }, [editor.isEditable])

  /* ---- render ---------------------------------------------------------- */

  const sized = percent !== null

  return (
    <NodeViewWrapper className="qpg-image">
      <span
        ref={frameRef}
        className="qpg-image-frame"
        style={sized ? { width: `${percent}%` } : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a base64 data
          * URL of unknown size; next/image needs a real file and a known one. */}
        <img
          ref={imgRef}
          src={node.attrs.src}
          alt={node.attrs.alt ?? ''}
          title={node.attrs.title ?? undefined}
          style={sized ? { width: '100%' } : undefined}
          draggable={false}
          onLoad={() => {
            if (percent === null) setOwnPercent(measure())
          }}
        />

        {editor.isEditable ? (
          <span
            ref={gripRef}
            className="qpg-image-grip"
            data-visible={selected || focused || dragPercent !== null ? 'true' : undefined}
            role="slider"
            tabIndex={0}
            aria-label="Picture width"
            aria-valuemin={MIN_PERCENT}
            aria-valuemax={MAX_PERCENT}
            aria-valuenow={shown}
            aria-valuetext={`${shown}% of the line`}
            title="Drag to resize. Arrow keys work too; double-click for the picture's own size."
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        ) : null}

        {dragPercent !== null || focused ? (
          <span className="qpg-image-size" aria-hidden>
            {shown}%
          </span>
        ) : null}
      </span>
    </NodeViewWrapper>
  )
}

/* -------------------------------------------------------------------------- */

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        // Kept in the inline style rather than the `width` attribute: an HTML
        // `width` is pixels only, and `.rich-content img` would override it in
        // the preview anyway.
        parseHTML: (element) => parsePercent(element.style.width),
        renderHTML: (attributes) =>
          typeof attributes.width === 'number' ? { style: `width: ${attributes.width}%` } : {},
      },
    }
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView)
  },
})
