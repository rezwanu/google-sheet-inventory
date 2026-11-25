/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '"Noto Sans Bengali"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'Inter', '"Noto Sans Bengali"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
        '999': '999',
        '9999': '9999',
      },
      borderRadius: {
        'xs': '2px',
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
      },
      colors: {
        // Utilitarian Minimalism Design Tokens (Linear & Stripe Inspired)
        editorial: {
          canvas: '#FAFAFA',
          surface: '#FFFFFF',
          subtle: '#F5F5F5',
          border: '#E5E5E5',
          'border-hover': '#D4D4D4',
          primary: '#111111',
          secondary: '#525252',
          muted: '#737373',
          accent: '#0F172A',
          highlight: '#B45309',
          success: '#15803D',
          warning: '#B45309',
          danger: '#B91C1C',
        },
        crimson: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          500: '#DC2626',
          600: '#B91C1C',
          700: '#991B1B',
        }
      }
    },
  },
  plugins: [],
}
