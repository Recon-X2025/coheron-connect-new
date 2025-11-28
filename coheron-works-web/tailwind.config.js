// tailwind.config.js
// Light-mode-only configuration for CoheronERP
// Note: This config is provided for future Tailwind integration.
// Currently, the project uses CSS variables defined in src/styles/variables.css

module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        page: '#F6F8FA',
        surface: '#FFFFFF',
        'muted-surface': '#F3F5F7',
        border: '#E6E9EE',
        'text-default': '#0F1724',
        'text-muted': '#556074',
        primary: {
          DEFAULT: '#2563EB',
          press: '#1E40AF',
        },
        accent: '#7C3AED',
        success: '#059669',
        warning: '#D97706',
        danger: '#DC2626',
      },
      boxShadow: {
        smsoft: '0 1px 2px rgba(16,24,40,0.04)',
        mdsoft: '0 8px 24px rgba(15,23,42,0.06)',
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        lg: '12px',
      },
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
      }
    }
  },
  plugins: [],
}

