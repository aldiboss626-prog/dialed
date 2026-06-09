/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#141318',
        surface: '#1E1C24',
        border: '#2C2A34',
        elevated: '#252330',
        primary: '#F2EDE8',
        secondary: '#8A8490',
        tertiary: '#5A5760',
        gold: '#B8943A',
        overdue: '#C94A4A',
        warning: '#BF7826',
        success: '#4A9470',
        neutral: '#5A5760',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Cormorant Garamond', 'serif'],
      },
      letterSpacing: {
        widest: '0.15em',
        wordmark: '0.12em',
      },
      boxShadow: {
        card: '0 4px 20px rgba(0,0,0,0.18)',
        nav: '0 -4px 24px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
}
