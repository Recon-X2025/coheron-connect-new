import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['lucide-react', 'clsx'],
          'module-crm': ['./src/modules/crm/routes.tsx'],
          'module-sales': ['./src/modules/sales/routes.tsx'],
          'module-inventory': ['./src/modules/inventory/routes.tsx'],
          'module-accounting': ['./src/modules/accounting/routes.tsx'],
          'module-hr': ['./src/modules/hr/routes.tsx'],
          'module-manufacturing': ['./src/modules/manufacturing/routes.tsx'],
          'module-support': ['./src/modules/support/routes.tsx'],
          'module-projects': ['./src/modules/projects/routes.tsx'],
        },
      },
    },
  },
})
