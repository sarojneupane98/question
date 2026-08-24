'use client'

import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/cn'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'outline'
  | 'danger'
  | 'success'
  | 'subtle'

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800 disabled:hover:bg-brand-600',
  secondary:
    'bg-ink-900 text-white shadow-sm hover:bg-ink-800 active:bg-ink-950 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100',
  outline:
    'border border-ink-300 bg-white text-ink-700 hover:bg-ink-50 hover:text-ink-900 dark:border-ink-600 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700',
  ghost:
    'text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-white',
  subtle:
    'bg-ink-100 text-ink-700 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700',
  danger:
    'bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:bg-rose-800 disabled:hover:bg-rose-600',
  success:
    'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 disabled:hover:bg-emerald-600',
}

const SIZES: Record<ButtonSize, string> = {
  xs: 'h-7 gap-1 px-2 text-xs rounded-md',
  sm: 'h-8 gap-1.5 px-2.5 text-sm rounded-lg',
  md: 'h-10 gap-2 px-4 text-sm rounded-xl',
  lg: 'h-12 gap-2.5 px-6 text-base rounded-xl',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  iconOnly?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading = false, iconOnly = false, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        iconOnly && 'aspect-square px-0',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  )
})

/** Small square icon button used in dense toolbars and card headers. */
export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonProps & { label: string; active?: boolean }
>(function IconButton({ label, active = false, className, variant = 'ghost', size = 'sm', ...rest }, ref) {
  return (
    <Button
      ref={ref}
      aria-label={label}
      title={label}
      variant={variant}
      size={size}
      iconOnly
      aria-pressed={active}
      className={cn(
        active && 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-200',
        className,
      )}
      {...rest}
    />
  )
})
