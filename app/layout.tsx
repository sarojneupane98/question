import type { Metadata, Viewport } from 'next'

import './globals.css'
import { ThemeScript } from '@/components/layout/ThemeScript'
import { StorageErrorToast } from '@/components/layout/StorageErrorToast'

export const metadata: Metadata = {
  title: 'Question Paper Generator — Create Professional Question Papers in Minutes',
  description:
    'Build, format and download school examination papers as print-ready PDF and editable Microsoft Word documents. Auto marks calculation, live A4 preview, question bank and templates.',
  applicationName: 'Question Paper Generator',
  keywords: [
    'question paper generator',
    'exam paper maker',
    'school examination',
    'question paper PDF',
    'question paper Word',
    'teacher tools',
  ],
  authors: [{ name: 'Question Paper Generator' }],
  icons: {
    // Inline SVG favicon: no binary asset needed, works offline.
    icon: [
      {
        url:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%234f46e5'/%3E%3Cpath d='M9 8h11l4 4v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z' fill='%23fff'/%3E%3Cpath d='M11 15h10M11 19h7' stroke='%234f46e5' stroke-width='1.8' stroke-linecap='round'/%3E%3C/svg%3E",
        type: 'image/svg+xml',
      },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies the saved theme before first paint so there is no flash. */}
        <ThemeScript />
      </head>
      <body>
        {children}
        <StorageErrorToast />
      </body>
    </html>
  )
}
