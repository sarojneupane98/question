/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Lint is available via `npm run lint`; a lint warning should never block a teacher's build.
    ignoreDuringBuilds: true,
  },
  // The app is 100% client-side (localStorage persistence, browser-side PDF/DOCX
  // generation), so it can be exported as static files if you want to host it on
  // GitHub Pages / Netlify / a school intranet:
  //   1. uncomment the two lines below
  //   2. npm run build   ->  ./out
  // output: 'export',
  // images: { unoptimized: true },
}

export default nextConfig
