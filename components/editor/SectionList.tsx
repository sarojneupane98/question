'use client'

import { useMemo, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Layers, Plus } from 'lucide-react'

import { BankPickerDialog } from './BankPickerDialog'
import { SectionCard } from './SectionCard'
import { Button } from '@/components/ui/Button'
import { questionLabelMap } from '@/lib/paperBlocks'
import { useAppStore, useCurrentPaper } from '@/lib/store'

/**
 * The section/question list, and the single `DndContext` behind all of its
 * dragging (spec §3).
 *
 * One context rather than one per section: that is what makes a question
 * draggable from Section A into Section B. dnd-kit reports the id it dropped on,
 * so every drop is resolved by looking that id up in the paper — never by
 * trusting a `data` payload that a re-render could have left stale.
 */
export function SectionList({ className }: { className?: string }) {
  const paper = useCurrentPaper()
  const addSection = useAppStore((s) => s.addSection)
  const reorderSections = useAppStore((s) => s.reorderSections)
  const reorderQuestions = useAppStore((s) => s.reorderQuestions)
  const moveQuestion = useAppStore((s) => s.moveQuestion)

  const [bankSectionId, setBankSectionId] = useState<string | null>(null)

  const sensors = useSensors(
    // A few pixels of slop, so clicking a drag handle (or a button beside it)
    // cannot be mistaken for the start of a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const labels = useMemo(
    () => (paper ? questionLabelMap(paper) : new Map<string, string>()),
    [paper],
  )

  if (!paper) return null

  const sectionIds = paper.sections.map((section) => section.id)

  const findSectionIndex = (id: string) => paper.sections.findIndex((section) => section.id === id)

  const findQuestion = (id: string) => {
    for (let s = 0; s < paper.sections.length; s += 1) {
      const questionIndex = paper.sections[s].questions.findIndex((question) => question.id === id)
      if (questionIndex >= 0) {
        return { section: paper.sections[s], sectionIndex: s, questionIndex }
      }
    }
    return null
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeId = String(active.id)
    const overId = String(over.id)

    /* ---- a section was dragged ------------------------------------------ */
    const fromSection = findSectionIndex(activeId)
    if (fromSection >= 0) {
      // Dropping a section onto a question means "put me where that question's
      // section is" — the section card is what the teacher was aiming at.
      const direct = findSectionIndex(overId)
      const toSection = direct >= 0 ? direct : (findQuestion(overId)?.sectionIndex ?? -1)
      if (toSection >= 0 && toSection !== fromSection) reorderSections(fromSection, toSection)
      return
    }

    /* ---- a question was dragged ----------------------------------------- */
    const from = findQuestion(activeId)
    if (!from) return

    const overSection = findSectionIndex(overId)
    if (overSection >= 0) {
      // Dropped on the body of a section rather than on one of its questions
      // (the usual way to reach an empty section): append it.
      const target = paper.sections[overSection]
      if (target.id !== from.section.id) {
        moveQuestion(activeId, target.id, target.questions.length)
      }
      return
    }

    const to = findQuestion(overId)
    if (!to) return

    if (to.section.id === from.section.id) {
      reorderQuestions(from.section.id, from.questionIndex, to.questionIndex)
    } else {
      moveQuestion(activeId, to.section.id, to.questionIndex)
    }
  }

  return (
    <div className={className}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
        // Cards change height as questions expand and sections collapse, so
        // droppable rects have to be re-measured rather than cached once.
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      >
        <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {paper.sections.map((section, index) => (
              <SectionCard
                key={section.id}
                section={section}
                index={index}
                total={paper.sections.length}
                labels={labels}
                onInsertFromBank={setBankSectionId}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => addSection()}>
          <Plus className="h-4 w-4" />
          Add section
        </Button>
        <span className="inline-flex items-center gap-1.5 text-xs text-ink-400">
          <Layers className="h-3.5 w-3.5" />
          {paper.sections.length} section{paper.sections.length === 1 ? '' : 's'} · drag the handles to
          reorder
        </span>
      </div>

      {/*
       * Mounted only while open and keyed on the target section, so the dialog's
       * filters and selection reset between uses instead of carrying over.
       */}
      {bankSectionId ? (
        <BankPickerDialog
          key={bankSectionId}
          sectionId={bankSectionId}
          onClose={() => setBankSectionId(null)}
        />
      ) : null}
    </div>
  )
}
