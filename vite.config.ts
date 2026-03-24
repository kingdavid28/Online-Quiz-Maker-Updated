import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  // Force new filename for cache busting
  build: {
    rollupOptions: {
      output: {
        // Force completely new filename
        entryFileNames: `assets/app-[hash].js`,
        chunkFileNames: `assets/chunk-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`
      }
    }
  },

  // Force cache invalidation
  server: {
    fs: {
      // Allow serving files from one level up
      allow: ['..']
    }
  },

  // Add timestamp for cache busting
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
})
