'use client'

import { ArrowDown, ArrowUp, ListChecks, Plus, Trash2 } from 'lucide-react'

import { Button, IconButton } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, EmptyState, Textarea } from '@/components/ui/Primitives'
import { useAppStore, useCurrentPaper } from '@/lib/store'

/**
 * The instructions block (spec §2).
 *
 * Numbering is never stored — the printed "1." comes from the array index in
 * `flattenPaper`, and the chip beside each row here is the same index. Deleting
 * instruction 2 therefore renumbers the rest in the preview and in both exports
 * without any bookkeeping.
 */

/** Offered as one-click chips; the ones already in the list are filtered out. */
const SUGGESTIONS = [
  'All questions are compulsory.',
  'Figures in the margin indicate full marks.',
  'Write your answers in clear and legible handwriting.',
  'Draw neat diagrams wherever necessary.',
  'Use of a calculator is not permitted.',
  'The first 15 minutes are for reading the question paper only.',
]

function normalise(text: string): string {
  return text.trim().toLowerCase()
}

export function InstructionsEditor({ className }: { className?: string }) {
  const paper = useCurrentPaper()
  const addInstruction = useAppStore((s) => s.addInstruction)
  const updateInstruction = useAppStore((s) => s.updateInstruction)
  const removeInstruction = useAppStore((s) => s.removeInstruction)
  const reorderInstructions = useAppStore((s) => s.reorderInstructions)
  const updateLayout = useAppStore((s) => s.updateLayout)

  if (!paper) return null

  const { instructions } = paper
  const existing = new Set(instructions.map((item) => normalise(item.text)))
  const unused = SUGGESTIONS.filter((text) => !existing.has(normalise(text)))
  const hidden = instructions.length > 0 && !paper.layout.showInstructions

  return (
    <Card className={className}>
      <CardHeader
        title="Instructions"
        description="Numbered automatically in the order shown."
        icon={<ListChecks className="h-4 w-4" />}
        actions={
          <Button size="xs" variant="subtle" onClick={() => addInstruction()}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        }
      />

      <CardBody className="space-y-3">
        {hidden ? (
          <p className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
            Instructions are switched off in the layout panel, so they will not print.
            <button
              type="button"
              onClick={() => updateLayout({ showInstructions: true })}
              className="font-semibold underline decoration-dotted underline-offset-2"
            >
              Show them
            </button>
          </p>
        ) : null}

        {instructions.length === 0 ? (
          <EmptyState
            icon={<ListChecks className="h-5 w-5" />}
            title="No instructions yet"
            description="Add your own, or start from one of the suggestions below."
            action={
              <Button size="sm" variant="outline" onClick={() => addInstruction()}>
                <Plus className="h-4 w-4" />
                Add instruction
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2">
            {instructions.map((instruction, index) => (
              <li key={instruction.id} className="flex items-start gap-2">
                <span className="mt-2 w-5 flex-none text-right text-xs font-semibold tabular-nums text-ink-400">
                  {index + 1}.
                </span>

                <Textarea
                  rows={2}
                  value={instruction.text}
                  aria-label={`Instruction ${index + 1}`}
                  placeholder="Type an instruction…"
                  onChange={(event) => updateInstruction(instruction.id, event.target.value)}
                  className="flex-1"
                />

                <div className="mt-0.5 flex flex-none flex-col">
                  <IconButton
                    label={`Move instruction ${index + 1} up`}
                    disabled={index === 0}
                    onClick={() => reorderInstructions(index, index - 1)}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </IconButton>
                  <IconButton
                    label={`Move instruction ${index + 1} down`}
                    disabled={index === instructions.length - 1}
                    onClick={() => reorderInstructions(index, index + 1)}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </IconButton>
                </div>

                <IconButton
                  label={`Delete instruction ${index + 1}`}
                  className="mt-0.5"
                  onClick={() => removeInstruction(instruction.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              </li>
            ))}
          </ul>
        )}

        {unused.length > 0 ? (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
              Common instructions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {unused.map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => addInstruction(text)}
                  title="Add this instruction"
                  className="rounded-full border border-ink-200 px-2.5 py-1 text-[11px] text-ink-600 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 dark:border-ink-600 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-brand-300"
                >
                  + {text}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </CardBody>
    </Card>
  )
}
