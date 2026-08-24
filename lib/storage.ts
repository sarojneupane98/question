/**
 * localStorage plumbing.
 *
 * Two things make this more than a `JSON.parse` wrapper:
 *
 *  1. QUOTA. Papers embed their logo and any question images as base64 data
 *     URLs so a paper is a single portable object. localStorage caps out around
 *     5 MB, so a write can genuinely fail. Rather than losing the teacher's work
 *     silently we surface the failure through `onStorageError` so the UI can
 *     show a real warning. (`lib/imageUtils.ts` downscales images on the way in
 *     to keep us well under the cap in the first place.)
 *
 *  2. SAFETY. A corrupt or half-written value must not white-screen the app.
 *     Every read is defensive.
 */

export const STORAGE_KEY = 'qpg:store:v1'

export type StorageErrorKind = 'quota' | 'unavailable' | 'unknown'

export interface StorageError {
  kind: StorageErrorKind
  message: string
}

type StorageErrorListener = (error: StorageError) => void

const listeners = new Set<StorageErrorListener>()

export function onStorageError(listener: StorageErrorListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function emit(error: StorageError) {
  listeners.forEach((listener) => {
    try {
      listener(error)
    } catch {
      /* a broken listener must not break persistence */
    }
  })
}

function isQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    /quota/i.test(error.message)
  )
}

function available(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage
  } catch {
    return false
  }
}

/**
 * Storage object shaped for zustand's `createJSONStorage`. Returning `null` from
 * `getItem` makes zustand fall back to the store's initial state, which is
 * exactly what we want for a first visit or a corrupt payload.
 */
export const safeLocalStorage = {
  getItem(name: string): string | null {
    if (!available()) return null
    try {
      return window.localStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem(name: string, value: string): void {
    if (!available()) {
      emit({ kind: 'unavailable', message: 'Browser storage is unavailable, so changes are not being saved.' })
      return
    }
    try {
      window.localStorage.setItem(name, value)
    } catch (error) {
      if (isQuotaError(error)) {
        emit({
          kind: 'quota',
          message:
            'Browser storage is full — most likely because of large images or logos. Remove a few images, or delete old papers, then try again.',
        })
      } else {
        emit({ kind: 'unknown', message: 'Could not save to browser storage.' })
      }
    }
  },
  removeItem(name: string): void {
    if (!available()) return
    try {
      window.localStorage.removeItem(name)
    } catch {
      /* ignore */
    }
  },
}

/** Rough size of the persisted payload, for the Settings page. */
export function getStorageFootprint(): { bytes: number; readable: string } {
  const raw = safeLocalStorage.getItem(STORAGE_KEY) ?? ''
  // UTF-16 code units in most browsers; 2 bytes each is the honest estimate.
  const bytes = raw.length * 2
  const readable =
    bytes > 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`
  return { bytes, readable }
}

export function clearStoredState(): void {
  safeLocalStorage.removeItem(STORAGE_KEY)
}
