/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
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
        // Editorial Minimalism Design Tokens (Linear/Stripe style)
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
        },
        // এন্টারপ্রাইজ স্ট্যাটাস কালারসমূহ: Emerald, Amber, Crimson
        crimson: {
          50: '#fff1f2',
          100: '#ffe4e6',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
        }
      }
    },
  },
  plugins: [],
}

