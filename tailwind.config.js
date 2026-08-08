/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Public Sans', 'Inter', 'system-ui', 'sans-serif'],
        'headline-md': ['Public Sans', 'sans-serif'],
        'headline-lg': ['Public Sans', 'sans-serif'],
        'label-lg': ['Public Sans', 'sans-serif'],
        'body-md': ['Public Sans', 'sans-serif'],
        'body-lg': ['Public Sans', 'sans-serif'],
      },
      fontSize: {
        'headline-md': ['24px', { lineHeight: '32px', fontWeight: '800' }],
        'headline-lg': ['30px', { lineHeight: '36px', letterSpacing: '-0.02em', fontWeight: '800' }],
        'label-lg': ['16px', { lineHeight: '20px', fontWeight: '700' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '600' }],
      },
      boxShadow: {
        'neo': '3px 3px 0px 0px rgba(0, 0, 0, 1)',
        'neo-lg': '6px 6px 0px 0px rgba(0, 0, 0, 1)',
        'neo-xl': '9px 9px 0px 0px rgba(0, 0, 0, 1)',
        'neo-sm': '4px 4px 0px 0px rgba(0, 0, 0, 1)',
      },
      borderWidth: {
        '3': '3px',
      },
      colors: {
        // Legacy colors (backward compat)
        'neo-yellow': '#ffde59',
        'neo-pink': '#ff90e8',
        'neo-blue': '#90baad',
        'neo-green': '#a3e635',
        'neo-bg': '#fdfaf5',
        
        // Material Design colors
        'primary': '#4c6700',
        'primary-container': '#a4d13b',
        'primary-fixed': '#c4f35a',
        'primary-fixed-dim': '#a8d63f',
        'on-primary': '#ffffff',
        'on-primary-container': '#3f5700',
        'on-primary-fixed': '#141f00',
        'on-primary-fixed-variant': '#384e00',
        'inverse-primary': '#a8d63f',
        
        'secondary': '#5e5e5e',
        'secondary-container': '#e2e2e2',
        'secondary-fixed': '#e2e2e2',
        'secondary-fixed-dim': '#c6c6c6',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#646464',
        'on-secondary-fixed': '#1b1b1b',
        'on-secondary-fixed-variant': '#474747',
        
        'tertiary': '#884294',
        'tertiary-container': '#f6a5ff',
        'tertiary-fixed': '#ffd5ff',
        'tertiary-fixed-dim': '#f8acff',
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#773283',
        'on-tertiary-fixed': '#350040',
        'on-tertiary-fixed-variant': '#6d297a',
        
        'error': '#ba1a1a',
        'error-container': '#ffdad6',
        'on-error': '#ffffff',
        'on-error-container': '#93000a',
        
        'background': '#f9fbea',
        'on-background': '#1a1d13',
        
        'surface': '#ffffff',
        'surface-dim': '#d9dbcb',
        'surface-bright': '#f9fbea',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f3f5e4',
        'surface-container': '#edefdf',
        'surface-container-high': '#e8ead9',
        'surface-container-highest': '#e2e4d3',
        'surface-variant': '#e2e4d3',
        'on-surface': '#1a1d13',
        'on-surface-variant': '#444937',
        
        'outline': '#000000',
        'outline-variant': '#c4c9b1',
        'inverse-surface': '#2f3227',
        'inverse-on-surface': '#f0f2e1',
        'surface-tint': '#4c6700',
        'shadow': '#000000',
        
        'neo-orange': '#ff6b00',
        'input-placeholder': '#6b7280',
      },
      spacing: {
        'inline-gap': '1rem',
        'shadow-offset-sm': '4px',
        'shadow-offset': '6px',
        'container-padding': '1.5rem',
        'stack-gap': '2rem',
        'border-width': '3px',
      },
    },
  },
  plugins: [],
}
