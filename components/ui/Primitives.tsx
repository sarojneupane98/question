'use client'

import { forwardRef, useId } from 'react'

import { cn } from '@/lib/cn'

/* -------------------------------------------------------------------------- */
/*  Card                                                                       */
/* -------------------------------------------------------------------------- */

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-ink-200 bg-white shadow-card dark:border-ink-700 dark:bg-ink-900',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  description,
  icon,
  actions,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3 px-4 py-3.5 sm:px-5', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-ink-900 dark:text-white">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs leading-relaxed text-ink-500 dark:text-ink-400">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-none items-center gap-1.5">{actions}</div> : null}
    </div>
  )
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('px-4 pb-4 sm:px-5 sm:pb-5', className)}>{children}</div>
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px bg-ink-200 dark:bg-ink-700', className)} />
}

/* -------------------------------------------------------------------------- */
/*  Field wrapper                                                              */
/* -------------------------------------------------------------------------- */

export function Field({
  label,
  hint,
  error,
  htmlFor,
  className,
  children,
  required,
}: {
  label?: React.ReactNode
  hint?: React.ReactNode
  error?: React.ReactNode
  htmlFor?: string
  className?: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <div className={cn('min-w-0', className)}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="mb-1.5 block text-xs font-medium text-ink-600 dark:text-ink-300"
        >
          {label}
          {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-400 dark:text-ink-500">{hint}</p>
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Inputs                                                                     */
/* -------------------------------------------------------------------------- */

const CONTROL =
  'w-full rounded-lg border border-ink-300 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-400 ' +
  'transition-shadow focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 ' +
  'disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400 ' +
  'dark:border-ink-600 dark:bg-ink-800 dark:text-white dark:placeholder:text-ink-500 dark:disabled:bg-ink-900'

/**
 * Control height, chosen with a prop rather than a `className` override.
 *
 * `cn` is plain clsx with no tailwind-merge, so passing `h-9` alongside the
 * base `h-10` would leave both classes on the element and let CSS source order
 * decide — and Tailwind emits `h-10` after `h-9`, so the override would silently
 * lose. Picking exactly one class here removes the conflict.
 */
export type FieldSize = 'sm' | 'md'

const FIELD_HEIGHT: Record<FieldSize, string> = {
  sm: 'h-9',
  md: 'h-10',
}

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { fieldSize?: FieldSize }
>(function Input({ className, fieldSize = 'md', ...rest }, ref) {
  return <input ref={ref} className={cn(CONTROL, FIELD_HEIGHT[fieldSize], className)} {...rest} />
})

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 3, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={cn(CONTROL, 'py-2 leading-relaxed', className)} {...rest} />
})

export interface SelectOption {
  value: string
  label: string
}

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { options?: SelectOption[]; fieldSize?: FieldSize }
>(function Select({ className, options, children, fieldSize = 'md', ...rest }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          CONTROL,
          FIELD_HEIGHT[fieldSize],
          'cursor-pointer appearance-none pr-9',
          className,
        )}
        {...rest}
      >
        {options ? options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>) : children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden
      >
        <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
})

/** Number input that reports a clamped number instead of a string. */
export function NumberInput({
  value,
  onValueChange,
  min = 0,
  max = 9999,
  step = 1,
  className,
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: number
  onValueChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  fieldSize?: FieldSize
}) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      value={Number.isFinite(value) ? String(value) : ''}
      min={min}
      max={max}
      step={step}
      className={cn('tabular-nums', className)}
      onChange={(event) => {
        const raw = event.target.value
        if (raw === '') {
          onValueChange(min)
          return
        }
        const parsed = Number(raw)
        if (Number.isNaN(parsed)) return
        onValueChange(Math.max(min, Math.min(max, parsed)))
      }}
      {...rest}
    />
  )
}

/* -------------------------------------------------------------------------- */
/*  Toggle                                                                     */
/* -------------------------------------------------------------------------- */

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
  className,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: React.ReactNode
  hint?: React.ReactNode
  disabled?: boolean
  className?: string
}) {
  const id = useId()
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <label htmlFor={id} className="block cursor-pointer text-sm font-medium text-ink-800 dark:text-ink-100">
          {label}
        </label>
        {hint ? <p className="mt-0.5 text-xs text-ink-400 dark:text-ink-500">{hint}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-5 w-9 flex-none rounded-full transition-colors disabled:opacity-50',
          checked ? 'bg-brand-600' : 'bg-ink-300 dark:bg-ink-600',
        )}
      >
        <span
          className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? 'translateX(1rem)' : 'translateX(0)' }}
        />
      </button>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Segmented control                                                          */
/* -------------------------------------------------------------------------- */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = 'md',
}: {
  value: T
  onChange: (next: T) => void
  options: Array<{ value: T; label: React.ReactNode; title?: string }>
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        'inline-flex w-full rounded-lg bg-ink-100 p-0.5 dark:bg-ink-800',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex-1 rounded-[0.4rem] font-medium transition-colors',
              size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
              active
                ? 'bg-white text-ink-900 shadow-sm dark:bg-ink-600 dark:text-white'
                : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Badge                                                                      */
/* -------------------------------------------------------------------------- */

export function Badge({
  children,
  className,
  tone = 'neutral',
}: {
  children: React.ReactNode
  className?: string
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger'
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
    brand: 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    warning: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    danger: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-4',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/*  Empty state                                                                */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 px-6 py-12 text-center dark:border-ink-700',
        className,
      )}
    >
      {icon ? (
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-ink-100 text-ink-400 dark:bg-ink-800 dark:text-ink-500">
          {icon}
        </span>
      ) : null}
      <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-ink-500 dark:text-ink-400">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
