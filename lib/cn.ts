import clsx, { type ClassValue } from 'clsx'

/** Conditional className joiner. Kept tiny on purpose — no tailwind-merge. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}
