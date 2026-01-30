/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'coheron-green': '#00C971',
        'coheron-blue': '#004FFB',
        'coheron-black': '#000000',
        'coheron-dark': '#0A0A0A',
        primary: {
          DEFAULT: '#00C971',
          light: '#33D48D',
          dark: '#00A35C',
          press: '#00A35C',
        },
        secondary: {
          DEFAULT: '#004FFB',
          light: '#1A6AFF',
          dark: '#003FC9',
        },
        page: '#000000',
        surface: '#141414',
        'muted-surface': '#1F1F1F',
        border: 'rgba(255, 255, 255, 0.1)',
        'text-default': '#FFFFFF',
        'text-muted': '#939393',
        accent: '#004FFB',
        success: '#00C971',
        warning: '#FFB020',
        danger: '#FF4D4D',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        sm: '8px',
        DEFAULT: '12px',
        lg: '16px',
        xl: '24px',
      },
      boxShadow: {
        smsoft: '0 2px 12px rgba(0, 0, 0, 0.3)',
        mdsoft: '0 8px 32px rgba(0, 0, 0, 0.4)',
        glow: '0 0 20px rgba(0, 201, 113, 0.3)',
        'blue-glow': '0 0 20px rgba(0, 79, 251, 0.3)',
      },
    },
  },
  plugins: [],
};
