import { STORAGE_KEY } from '@/lib/storage'

/**
 * Applies the persisted theme before React hydrates.
 *
 * This runs as a blocking inline script in <head>, which is the only way to
 * avoid a white flash on a dark-mode reload: by the time the browser paints,
 * `<html>` already carries the right class. It reads zustand's persisted
 * envelope directly ({ state, version }) rather than waiting for the store.
 */
export function ThemeScript() {
  const js = `
(function () {
  try {
    var raw = window.localStorage.getItem('${STORAGE_KEY}');
    var theme = 'system';
    if (raw) {
      var parsed = JSON.parse(raw);
      var t = parsed && parsed.state && parsed.state.settings && parsed.state.settings.theme;
      if (t === 'light' || t === 'dark' || t === 'system') theme = t;
    }
    var dark =
      theme === 'dark' ||
      (theme === 'system' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', !!dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {
    /* Private browsing can throw on localStorage access. Light mode is fine. */
  }
})();
`.trim()

  return <script dangerouslySetInnerHTML={{ __html: js }} />
}
