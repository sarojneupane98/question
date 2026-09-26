/**
 * Static export configuration.
 *
 * The app is 100% client-side — papers persist to `localStorage` and the PDF/DOCX
 * files are generated in the browser — so there is nothing for a Node server to
 * do. `output: 'export'` writes plain HTML/JS to `./out`, which any static host
 * will serve: GitHub Pages, Netlify, or a school intranet share.
 *
 * `basePath` is read from the environment rather than hard-coded, because it
 * depends on where the site is served from and not on the code:
 *
 *   project page   https://<user>.github.io/question/   ->  NEXT_PUBLIC_BASE_PATH=/question
 *   custom domain  https://question.example.com         ->  unset
 *   local dev                                            ->  unset
 *
 * `.github/workflows/deploy.yml` sets it from the repository name; `npm run dev`
 * leaves it empty so local URLs stay at the root.
 *
 * `trailingSlash` makes the export emit `out/editor/index.html` instead of
 * `out/editor.html`. GitHub Pages then serves both `/editor` and `/editor/`
 * correctly — without it the slashed form 404s. It also means `usePathname()`
 * returns a trailing slash, which is why `isNavActive()` in
 * `components/layout/Sidebar.tsx` normalises before comparing.
 */
import { existsSync } from 'node:fs'

const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

/*
 * The two ways of publishing this site are mutually exclusive, and getting them
 * both at once breaks it completely rather than partly.
 *
 * `public/CNAME` tells GitHub Pages to serve from a custom domain, where the app
 * sits at the root. `NEXT_PUBLIC_BASE_PATH` tells Next that every asset and link
 * lives under a subfolder. Set both and the pages are served at
 * `https://the-domain/` while their markup asks for `/question/_next/…` — so the
 * HTML arrives, no stylesheet or script does, and the visitor gets an unstyled
 * page that never starts. Nothing in the build or the deploy reports it; you
 * find out by loading the finished site.
 *
 * Failing here is the only moment anyone is watching, so fail here.
 */
if (rawBasePath && existsSync('./public/CNAME')) {
  throw new Error(
    'NEXT_PUBLIC_BASE_PATH is set to "' +
      rawBasePath +
      '", but public/CNAME exists, which serves the site from a custom domain at its root. ' +
      'Those cannot both be true: the deployed site would load no CSS or JavaScript at all. ' +
      'Publishing on the custom domain? Leave NEXT_PUBLIC_BASE_PATH unset. ' +
      'Publishing on <user>.github.io/<repo>/ instead? Delete public/CNAME first.',
  )
}

// A missing leading slash is rejected by Next itself; a trailing one is not, and
// silently produces `/question//_next/…`.
const basePath = rawBasePath.replace(/\/+$/, '')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Lint is available via `npm run lint`; a lint warning should never block a teacher's build.
    ignoreDuringBuilds: true,
  },
  output: 'export',
  // No image optimiser exists on a static host, and the app has no `next/image`
  // usage anyway — logos and question images are plain data-URI <img> tags.
  images: { unoptimized: true },
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
}

export default nextConfig
