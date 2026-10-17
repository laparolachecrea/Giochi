import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { viteSingleFile } from 'vite-plugin-singlefile';

// "singolo" produce un unico file HTML autosufficiente (utile per anteprime e condivisione).
export default defineConfig(({ mode }) => ({
  base: './',
  resolve: {
    alias: { '@condivisi': fileURLToPath(new URL('../../condivisi', import.meta.url)) },
  },
  plugins: mode === 'singolo' ? [viteSingleFile()] : [],
  build: { outDir: mode === 'singolo' ? 'dist-singolo' : 'dist', chunkSizeWarningLimit: 2000 },
  server: { host: true },
}));
