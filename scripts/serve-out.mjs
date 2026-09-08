/**
 * Serves the static export in `out/` the way GitHub Pages will.
 *
 *   node scripts/serve-out.mjs                        -> http://localhost:3001/
 *   node scripts/serve-out.mjs --base /question       -> http://localhost:3001/question/
 *
 * Why this exists rather than `npx serve out`: previewing the build should not
 * depend on a package download, and — more importantly — Pages serves this site
 * under a path prefix (`/question/`), which a plain root-directory server cannot
 * reproduce. Getting the prefix wrong is the single most likely way for a deploy
 * to break, so the preview has to be able to model it.
 *
 * The two behaviours worth matching, because `trailingSlash: true` in
 * next.config.mjs depends on them:
 *   - `/editor/` resolves to `out/editor/index.html`
 *   - `/editor`  redirects to `/editor/` rather than 404ing
 */

import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname, join, normalize, resolve, sep } from 'node:path'

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(name)
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback
}

const ROOT = resolve(process.cwd(), flag('--dir', 'out'))
const PORT = Number(flag('--port', '3001'))
/** Normalised to a leading slash with no trailing slash, or '' for the root. */
const BASE = flag('--base', '').replace(/\/+$/, '').replace(/^(?!$)\/?/, '/')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
}

/** Resolves `pathname` to a file on disk, or null. Refuses to escape ROOT. */
async function resolveFile(pathname) {
  const decoded = decodeURIComponent(pathname)
  const candidate = resolve(join(ROOT, normalize(decoded)))
  if (candidate !== ROOT && !candidate.startsWith(ROOT + sep)) return null

  try {
    const info = await stat(candidate)
    if (info.isFile()) return candidate
    if (info.isDirectory()) {
      const index = join(candidate, 'index.html')
      const indexInfo = await stat(index)
      if (indexInfo.isFile()) return index
    }
  } catch {
    // Fall through to the .html probe below.
  }

  // `output: 'export'` also emits bare `404.html`, and a request for `/foo`
  // should find `foo.html` if it exists.
  try {
    const asHtml = `${candidate}.html`
    if ((await stat(asHtml)).isFile()) return asHtml
  } catch {
    return null
  }
  return null
}

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' })
  res.end(body)
}

const server = createServer((req, res) => {
  void (async () => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    let pathname = url.pathname

    // Everything lives under the base path, exactly as on Pages. A request outside
    // it is the mistake we are here to catch, so say so loudly instead of serving.
    if (BASE) {
      if (pathname === BASE) {
        res.writeHead(302, { location: `${BASE}/` })
        return res.end()
      }
      if (!pathname.startsWith(`${BASE}/`)) {
        return send(
          res,
          404,
          `Not found.\n\nThis preview serves the site under "${BASE}/", mirroring GitHub Pages.\nTry http://localhost:${PORT}${BASE}/\n`,
        )
      }
      pathname = pathname.slice(BASE.length)
    }

    const file = await resolveFile(pathname)

    if (!file) {
      // Match Pages: a directory-ish URL missing its slash gets redirected, so
      // relative assets keep resolving.
      if (!pathname.endsWith('/') && (await resolveFile(`${pathname}/`))) {
        res.writeHead(308, { location: `${BASE}${pathname}/${url.search}` })
        return res.end()
      }
      const notFound = await resolveFile('/404.html')
      if (notFound) {
        res.writeHead(404, { 'content-type': MIME['.html'], 'cache-control': 'no-store' })
        return createReadStream(notFound).pipe(res)
      }
      return send(res, 404, 'Not found\n')
    }

    res.writeHead(200, {
      'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    })
    createReadStream(file).pipe(res)
  })().catch((error) => send(res, 500, `${error}\n`))
})

server.listen(PORT, () => {
  console.log(`Serving ${ROOT} at http://localhost:${PORT}${BASE}/`)
})
