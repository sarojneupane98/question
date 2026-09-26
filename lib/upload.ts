/**
 * One gate for every file the app accepts.
 *
 * Uploads are the only untrusted input this app has — everything else is typed
 * by the teacher — so the same three questions get asked in one place rather
 * than three times with three different answers: is it the right kind of file,
 * is it small enough to hold in memory, and is there actually anything in it.
 *
 * The messages are written for a teacher, not a developer: they say what is
 * wrong with *their* file and what to do instead, and never mention MIME types,
 * buffers or parsers.
 */

export interface UploadRule {
  /** Lower-case extensions, with the dot. Checked first — browsers lie about types. */
  extensions: string[]
  /** Accepted MIME types. An empty `file.type` is tolerated; a wrong one is not. */
  mimeTypes: string[]
  /** Hard ceiling in bytes. */
  maxBytes: number
  /** Human name of the kind, e.g. "Word document". Used in the error messages. */
  label: string
}

export function describeSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} bytes`
}

/**
 * Returns `null` when the file may be read, or a sentence to show the teacher.
 *
 * Extension and type are treated as *independent* claims and both must hold:
 * a browser will happily report `application/pdf` for a renamed file, and will
 * equally report an empty type for a file it does not recognise, so neither
 * alone is worth much.
 */
export function checkUpload(file: File, rule: UploadRule): string | null {
  const name = file.name || 'that file'
  const dot = name.lastIndexOf('.')
  const ext = dot > 0 ? name.slice(dot).toLowerCase() : ''

  if (!rule.extensions.includes(ext)) {
    const list = rule.extensions.join(', ')
    return `“${name}” is not a ${rule.label}. Choose a file ending in ${list}.`
  }

  // An empty type means the browser had no opinion, which is common for .docx
  // on some systems — the extension check above already covered that case.
  if (file.type && !rule.mimeTypes.includes(file.type)) {
    return `“${name}” is named like a ${rule.label} but does not contain one. Try opening it and saving it again.`
  }

  if (file.size === 0) {
    return `“${name}” is empty. Check the file and try again.`
  }

  if (file.size > rule.maxBytes) {
    return `“${name}” is ${describeSize(file.size)}, and the limit is ${describeSize(
      rule.maxBytes,
    )}. Everything happens inside your browser, so a file this large would freeze the page.`
  }

  return null
}

export const IMAGE_UPLOAD: UploadRule = {
  label: 'picture',
  extensions: ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
  mimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
  maxBytes: 20 * 1024 * 1024,
}

export const BACKUP_UPLOAD: UploadRule = {
  label: 'backup file',
  extensions: ['.json'],
  mimeTypes: ['application/json', 'text/json', 'text/plain'],
  maxBytes: 25 * 1024 * 1024,
}

export const WORD_UPLOAD: UploadRule = {
  label: 'Word document',
  extensions: ['.docx'],
  mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  maxBytes: 15 * 1024 * 1024,
}

export const PDF_UPLOAD: UploadRule = {
  label: 'PDF',
  extensions: ['.pdf'],
  mimeTypes: ['application/pdf'],
  maxBytes: 25 * 1024 * 1024,
}

export const TEXT_UPLOAD: UploadRule = {
  label: 'text file',
  extensions: ['.txt', '.md'],
  mimeTypes: ['text/plain', 'text/markdown'],
  maxBytes: 5 * 1024 * 1024,
}
