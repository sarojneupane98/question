'use client'

import {
  AlignLeft,
  ArrowLeftRight,
  CheckSquare,
  CircleDot,
  FileText,
  MinusSquare,
  Sparkles,
  Type,
} from 'lucide-react'

import { questionTypeSpec } from '@/lib/defaults'
import type { QuestionTypeSpec } from '@/lib/defaults'
import { cn } from '@/lib/cn'
import type { QuestionType } from '@/lib/types'
import { Badge } from './Primitives'

const ICONS: Record<QuestionTypeSpec['iconKey'], React.ComponentType<{ className?: string }>> = {
  'circle-dot': CircleDot,
  'check-square': CheckSquare,
  'minus-square': MinusSquare,
  'align-left': AlignLeft,
  text: Type,
  'file-text': FileText,
  'arrow-left-right': ArrowLeftRight,
  sparkles: Sparkles,
}

export function QuestionTypeIcon({
  type,
  className,
}: {
  type: QuestionType
  className?: string
}) {
  const spec = questionTypeSpec(type)
  const Icon = ICONS[spec.iconKey] ?? Sparkles
  return <Icon className={cn('h-4 w-4', className)} />
}

/** Coloured chip naming the question type — used on every question card. */
export function QuestionTypeBadge({
  type,
  className,
  long = false,
}: {
  type: QuestionType
  className?: string
  long?: boolean
}) {
  const spec = questionTypeSpec(type)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-4',
        spec.badgeClass,
        className,
      )}
    >
      <QuestionTypeIcon type={type} className="h-3 w-3" />
      {long ? spec.label : spec.short}
    </span>
  )
}

export function DifficultyBadge({ difficulty }: { difficulty: 'easy' | 'medium' | 'hard' }) {
  const tone = difficulty === 'easy' ? 'success' : difficulty === 'hard' ? 'danger' : 'warning'
  const label = difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
  return <Badge tone={tone}>{label}</Badge>
}
