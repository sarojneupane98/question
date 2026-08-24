/**
 * Handing a Blob to the browser as a download.
 *
 * This wrapper exists for one specific reason. `file-saver` is a UMD bundle
 * whose CommonJS export *is* the function — it ends with
 * `f.saveAs = g.saveAs = g, module.exports = g`. Webpack's ESM interop therefore
 * exposes it as the namespace's `default`, so the obvious
 *
 *     const { saveAs } = await import('file-saver')
 *
 * destructures `undefined` and fails at the call with "saveAs is not a
 * function". TypeScript cannot catch it: `@types/file-saver` declares a named
 * `saveAs` export, so the broken form typechecks cleanly. Both export routes
 * (Word and .json) hit this, which is why the interop lives here once instead of
 * being repeated — and repeated wrongly — at each call site.
 *
 * The dependency is worth keeping despite the wart: it carries the iOS/Safari
 * fallback that reads the blob through a `FileReader` and navigates to a data
 * URL, because those browsers ignore an anchor's `download` attribute.
 */

type SaveAs = (data: Blob, fileName?: string) => void

/** The three shapes the module can arrive in, depending on the bundler. */
interface FileSaverModule {
  saveAs?: SaveAs
  default?: (SaveAs & { saveAs?: SaveAs }) | { saveAs?: SaveAs }
}

function resolveSaveAs(mod: FileSaverModule): SaveAs | null {
  if (typeof mod.saveAs === 'function') return mod.saveAs
  if (typeof mod.default === 'function') return mod.default
  const nested = mod.default?.saveAs
  if (typeof nested === 'function') return nested
  return null
}

/**
 * Saves `blob` under `fileName`. Throws rather than failing quietly, so the
 * caller's toast can say something true.
 */
export async function saveBlob(blob: Blob, fileName: string): Promise<void> {
  const mod = (await import('file-saver')) as unknown as FileSaverModule
  const saveAs = resolveSaveAs(mod)

  if (!saveAs) {
    throw new Error('Could not start the download — the file-saver module did not load as expected.')
  }

  saveAs(blob, fileName)
}

/** Convenience for the text formats: builds the Blob with an explicit charset. */
export async function saveTextBlob(
  text: string,
  fileName: string,
  mime = 'application/json',
): Promise<void> {
  await saveBlob(new Blob([text], { type: `${mime};charset=utf-8` }), fileName)
}
