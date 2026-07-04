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
            if (id.includes('firebase') || id.includes('@firebase')) {
              // Tek 782KB'lık firebase chunk'ı alt modüllere böl: paralel indirme +
              // daha iyi cache (auth değişince firestore/database cache'i bozulmaz) ve
              // WebView'de tek dev chunk'ın parse/JIT tıkanması yerine küçük parçalar.
              if (id.includes('firestore')) return 'firebase-firestore';
              if (id.includes('database')) return 'firebase-database';
              if (id.includes('auth')) return 'firebase-auth';
              return 'firebase-core';
            }
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
