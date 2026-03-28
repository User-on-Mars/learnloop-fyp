export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /** Matches CSS tokens in src/styles/tokens.css for marketing + in-app UI */
        site: {
          bg: "var(--site-bg, #f8fafc)",
          surface: "var(--site-surface, #ffffff)",
          ink: "var(--site-ink, #0f172a)",
          muted: "var(--site-text-secondary, #475569)",
          faint: "var(--site-text-muted, #94a3b8)",
          border: "var(--site-border, #e2e8f0)",
          accent: "var(--site-accent, #2e5023)",
          "accent-hover": "var(--site-accent-hover, #4f7942)",
          soft: "var(--site-accent-soft, #ecfdf3)",
        },
        ll: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
      animation: {
        'blob': 'blob 7s infinite',
      },
      keyframes: {
        blob: {
          '0%': {
            transform: 'translate(0px, 0px) scale(1)',
          },
          '33%': {
            transform: 'translate(30px, -50px) scale(1.1)',
          },
          '66%': {
            transform: 'translate(-20px, 20px) scale(0.9)',
          },
          '100%': {
            transform: 'translate(0px, 0px) scale(1)',
          },
        },
      },
    },
  },
  plugins: [],
}
