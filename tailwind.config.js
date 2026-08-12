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
        'neo-sm': '4px 4px 0px 0px rgba(0, 0, 0, 1)',
        'clean-sm': '2px 2px 0px 0px rgba(26, 32, 44, 0.8)',
        'clean-md': '4px 4px 0px 0px rgba(26, 32, 44, 0.8)',
      },
      borderWidth: {
        '3': '3px',
        '1.5': '1.5px',
      },
      colors: {
        'primary-green': '#b1e04a',
        'primary-purple': '#9254a6',
        'danger-red': '#c93a38',
      },
      keyframes: {
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        }
      },
      animation: {
        slideInRight: 'slideInRight 0.3s ease-out',
      }
    },
  },
  plugins: [],
}
