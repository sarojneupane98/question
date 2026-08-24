import type { Config } from 'tailwindcss'

/**
 * NOTE ON COLOUR FORMATS
 * ----------------------
 * Every colour in this file is hex/rgb on purpose. The rasterised-PDF export path
 * uses html2canvas@1.4.1, which cannot parse modern CSS colour functions
 * (`oklch()`, `lab()`, `color-mix()`). Keep it that way for anything that can end
 * up inside the A4 sheet.
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        ink: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        /**
         * Paper fonts deliberately use fonts that also exist in Microsoft Word,
         * so the on-screen preview, the PDF and the DOCX all render with the same
         * metrics. Do not swap these for webfonts.
         */
        paperSerif: ['"Times New Roman"', 'Times', 'Liberation Serif', 'serif'],
        paperSans: ['Arial', 'Helvetica', 'Liberation Sans', 'sans-serif'],
        paperBook: ['Georgia', '"Times New Roman"', 'serif'],
        paperModern: ['Calibri', 'Carlito', 'Arial', 'sans-serif'],
        mono: ['Consolas', '"Courier New"', 'monospace'],
      },
      spacing: {
        /** Used for 18px icons, which read better than 16 or 20 in dense rails. */
        '4.5': '1.125rem',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.06)',
        lift: '0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 10px 20px -5px rgba(15, 23, 42, 0.10)',
        sheet: '0 1px 3px rgba(15, 23, 42, 0.12), 0 12px 32px -8px rgba(15, 23, 42, 0.18)',
        glow: '0 0 0 3px rgba(99, 102, 241, 0.22)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '60%': { transform: 'scale(1.01)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out both',
        'slide-up': 'slide-up 220ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-down': 'slide-down 160ms cubic-bezier(0.22, 1, 0.36, 1) both',
        pop: 'pop 200ms cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
}

export default config
