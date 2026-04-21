/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Triple Weld brand: charcoal steel + orange fire
        steel: {
          50: '#f7f7f8',
          100: '#eeeef0',
          200: '#d9d9dd',
          300: '#b8b8bf',
          400: '#91919c',
          500: '#6e6e7a',
          600: '#585864',
          700: '#474751',
          800: '#2d2d35',
          900: '#1a1a22',
          950: '#111117',
        },
        fire: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',   // primary orange
          600: '#ea580c',   // Triple Weld orange
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        silver: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
    }
  },
  plugins: []
}
