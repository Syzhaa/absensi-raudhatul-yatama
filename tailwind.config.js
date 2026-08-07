/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neo': '3px 3px 0px 0px rgba(0, 0, 0, 1)',
        'neo-lg': '6px 6px 0px 0px rgba(0, 0, 0, 1)',
        'neo-xl': '9px 9px 0px 0px rgba(0, 0, 0, 1)',
      },
      borderWidth: {
        '3': '3px',
      },
      colors: {
        'neo-yellow': '#ffde59',
        'neo-pink': '#ff90e8',
        'neo-blue': '#90baad',
        'neo-green': '#a3e635',
        'neo-bg': '#fdfaf5',
      },
    },
  },
  plugins: [],
}
