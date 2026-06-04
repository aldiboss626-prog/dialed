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
        gold: '#C9A84C',
        overdue: '#E05252',
        warning: '#D4852A',
        success: '#5BA882',
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
        overdue: '0 0 30px rgba(224,82,82,0.08)',
        'overdue-sm': '0 0 20px rgba(224,82,82,0.06)',
        nav: '0 -4px 24px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
}
