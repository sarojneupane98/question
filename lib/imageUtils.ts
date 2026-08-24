/**
 * Image helpers.
 *
 * Logos and in-question images are stored inline as base64 data URLs so a paper
 * is one self-contained object that survives localStorage and JSON export. The
 * price is size, so everything is downscaled and re-encoded on the way in:
 * a 4 MB phone photo becomes ~120 KB, which keeps the whole library comfortably
 * inside the browser storage quota and keeps html2canvas fast.
 */

export interface ImageLimits {
  maxWidth: number
  maxHeight: number
  /** JPEG/WebP quality, 0–1. Ignored for PNG output. */
  quality: number
  /** Keep PNG (and its transparency) instead of flattening to JPEG. */
  preservePng: boolean
}

export const LOGO_LIMITS: ImageLimits = {
  maxWidth: 400,
  maxHeight: 400,
  quality: 0.92,
  preservePng: true,
}

export const QUESTION_IMAGE_LIMITS: ImageLimits = {
  maxWidth: 1100,
  maxHeight: 1100,
  quality: 0.86,
  preservePng: false,
}

export const ACCEPTED_IMAGE_TYPES = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml'

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('That file does not look like an image.'))
    img.src = src
  })
}

/**
 * Downscales a data URL so its longest edge fits inside the given limits.
 * Returns the original string unchanged if it is already small enough, or if the
 * browser cannot rasterise it (SVG in some engines).
 */
export async function downscaleDataUrl(dataUrl: string, limits: ImageLimits): Promise<string> {
  if (typeof document === 'undefined') return dataUrl
  // SVG is already tiny and vector — never rasterise it.
  if (dataUrl.startsWith('data:image/svg')) return dataUrl

  try {
    const img = await loadImage(dataUrl)
    const { naturalWidth: w, naturalHeight: h } = img
    if (!w || !h) return dataUrl

    const scale = Math.min(1, limits.maxWidth / w, limits.maxHeight / h)
    const isPng = dataUrl.startsWith('data:image/png')
    if (scale >= 1 && dataUrl.length < 400_000) return dataUrl

    const targetW = Math.max(1, Math.round(w * scale))
    const targetH = Math.max(1, Math.round(h * scale))

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) return dataUrl

    const keepPng = isPng && limits.preservePng
    if (!keepPng) {
      // Flattening to JPEG needs an opaque backdrop or transparency turns black.
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, targetW, targetH)
    }
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, targetW, targetH)

    return keepPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', limits.quality)
  } catch {
    return dataUrl
  }
}

export async function prepareImageFile(file: File, limits: ImageLimits): Promise<string> {
  const raw = await readFileAsDataUrl(file)
  return downscaleDataUrl(raw, limits)
}

/** Intrinsic pixel size of a data URL, used to size images inside the DOCX. */
export async function measureDataUrl(dataUrl: string): Promise<{ width: number; height: number }> {
  try {
    const img = await loadImage(dataUrl)
    return { width: img.naturalWidth || 320, height: img.naturalHeight || 200 }
  } catch {
    return { width: 320, height: 200 }
  }
}

/** `data:image/png;base64,AAAA` -> Uint8Array, for docx `ImageRun`. */
export function dataUrlToUint8Array(dataUrl: string): Uint8Array | null {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) return null
  const meta = dataUrl.slice(0, comma)
  const payload = dataUrl.slice(comma + 1)
  try {
    if (!/;base64/i.test(meta)) {
      const decoded = decodeURIComponent(payload)
      const out = new Uint8Array(decoded.length)
      for (let i = 0; i < decoded.length; i += 1) out[i] = decoded.charCodeAt(i)
      return out
    }
    const binary = atob(payload)
    const out = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i)
    return out
  } catch {
    return null
  }
}

export function dataUrlMimeType(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;,]+)/)
  return match ? match[1] : 'image/png'
}
