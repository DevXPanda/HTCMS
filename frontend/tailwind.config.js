/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      spacing: {
        'page': '1.5rem',
        'page-lg': '2rem',
        'section': '1.5rem',
        'section-lg': '2rem',
      },
      borderRadius: {
        'ds': '0.5rem',
        'ds-lg': '0.75rem',
      },
      boxShadow: {
        'ds': '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'ds-md': '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)',
        'ds-lg': '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.08)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'ds-page-title': ['1.5rem', { lineHeight: '2rem', fontWeight: '700' }],
        'ds-section': ['1.125rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        'ds-body': ['0.875rem', { lineHeight: '1.25rem' }],
        'ds-caption': ['0.75rem', { lineHeight: '1rem' }],
      },
    },
  },
  plugins: [],
}
