/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bapx: {
          50: '#f3e8fc',
          100: '#d8b4fe',
          200: '#c084fc',
          300: '#a855f7',
          400: '#9651b8',
          500: '#7c3a9e',
          600: '#6b21a8',
          700: '#581c87',
          800: '#3b0764',
          900: '#1e0030',
        },
        surface: {
          DEFAULT: '#0a0a14',
          light: '#12121e',
          lighter: '#1a1a2e',
          border: '#2a2a3e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}
