import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  server: {
    watch: {
      ignored: ['**/.agents/**']
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) return 'firebase';
            if (id.includes('@capacitor')) return 'capacitor';
            return 'vendor';
          }
          if (id.includes('i18n.js')) {
            return 'i18n';
          }
        }
      }
    }
  }
});
