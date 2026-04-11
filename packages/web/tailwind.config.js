/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['Manrope', 'sans-serif'],
        sans: ['Manrope', 'sans-serif'],
      },
      colors: {
        surface: '#f7f6f1',
        'surface-low': '#f1f1ec',
        'surface-card': '#ffffff',
        'surface-container': '#e9e8e3',
        'surface-high': '#e3e3dd',
        'surface-highest': '#ddddd7',
        'surface-dim': '#d4d5ce',
        primary: '#5d3fd3',
        'primary-container': '#a391ff',
        'primary-dim': '#5130c6',
        'on-primary': '#f6f0ff',
        'on-primary-container': '#230076',
        secondary: '#785500',
        'secondary-container': '#ffc965',
        'on-secondary': '#fff1de',
        tertiary: '#4c6313',
        'tertiary-container': '#d6f393',
        'on-tertiary': '#e1fe9d',
        'on-surface': '#2e2f2c',
        'on-surface-variant': '#5b5c58',
        outline: '#777773',
        'outline-variant': '#adada9',
        error: '#b41340',
        'error-container': '#f74b6d',
      },
      borderRadius: {
        'xl': '1.5rem',
        '2xl': '2rem',
        '3xl': '3rem',
      },
      maxWidth: {
        'app': '430px',
      },
      boxShadow: {
        'float': '0 12px 40px rgba(46, 47, 44, 0.06)',
        'card': '0 2px 12px rgba(46, 47, 44, 0.04)',
      },
    },
  },
  plugins: [],
}
