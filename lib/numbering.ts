import type { NumberStyle } from './types'

const ROMAN: Array<[number, string]> = [
  [1000, 'm'],
  [900, 'cm'],
  [500, 'd'],
  [400, 'cd'],
  [100, 'c'],
  [90, 'xc'],
  [50, 'l'],
  [40, 'xl'],
  [10, 'x'],
  [9, 'ix'],
  [5, 'v'],
  [4, 'iv'],
  [1, 'i'],
]

export function toRoman(n: number): string {
  let value = Math.max(1, Math.floor(n))
  let out = ''
  for (const [num, sym] of ROMAN) {
    while (value >= num) {
      out += sym
      value -= num
    }
  }
  return out
}

/** 1 -> a, 26 -> z, 27 -> aa */
export function toAlpha(n: number): string {
  let value = Math.max(1, Math.floor(n))
  let out = ''
  while (value > 0) {
    const rem = (value - 1) % 26
    out = String.fromCharCode(97 + rem) + out
    value = Math.floor((value - 1) / 26)
  }
  return out
}

/** The bare numeral for a given style, with no trailing punctuation. */
export function formatNumeral(n: number, style: NumberStyle): string {
  switch (style) {
    case 'lower-roman':
      return toRoman(n)
    case 'upper-roman':
      return toRoman(n).toUpperCase()
    case 'lower-alpha':
      return toAlpha(n)
    case 'upper-alpha':
      return toAlpha(n).toUpperCase()
    case 'numeric':
    default:
      return String(n)
  }
}

/** The printed question label, e.g. "1." / "iv." / "B." */
export function formatQuestionLabel(n: number, style: NumberStyle): string {
  return `${formatNumeral(n, style)}.`
}

/** Section letters for auto-generated titles: 0 -> A, 1 -> B ... */
export function sectionLetter(index: number): string {
  return toAlpha(index + 1).toUpperCase()
}

export function nextSectionTitle(existingCount: number): string {
  return `Section ${sectionLetter(existingCount)}`
}

/** MCQ option label: 0 -> "A)", 1 -> "B)" ... */
export function optionLabel(index: number): string {
  return `${toAlpha(index + 1).toUpperCase()})`
}

/** Uppercase letter alone, for the "Option A" form labels in the editor. */
export function optionLetter(index: number): string {
  return toAlpha(index + 1).toUpperCase()
}

/** Matching-table left column label: 0 -> "i." */
export function matchLeftLabel(index: number): string {
  return `${toRoman(index + 1)}.`
}

/** Matching-table right column label: 0 -> "a." */
export function matchRightLabel(index: number): string {
  return `${toAlpha(index + 1)}.`
}

export const NUMBER_STYLE_OPTIONS: Array<{ value: NumberStyle; label: string; sample: string }> = [
  { value: 'numeric', label: 'Numbers', sample: '1. 2. 3.' },
  { value: 'lower-roman', label: 'Small roman', sample: 'i. ii. iii.' },
  { value: 'upper-roman', label: 'Capital roman', sample: 'I. II. III.' },
  { value: 'lower-alpha', label: 'Small letters', sample: 'a. b. c.' },
  { value: 'upper-alpha', label: 'Capital letters', sample: 'A. B. C.' },
]
