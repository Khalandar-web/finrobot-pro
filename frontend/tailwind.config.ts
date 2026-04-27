import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        fin: {
          bg: '#0B0F19',
          card: '#111827',
          surface: '#1F2937',
          accent: '#2563EB',
          'accent-dark': '#1D4ED8',
          'text-primary': '#F9FAFB',
          'text-secondary': '#9CA3AF',
          border: '#1F2937',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-accent': 'linear-gradient(135deg, #2563EB, #1D4ED8)',
      },
    },
  },
  plugins: [],
}

export default config
