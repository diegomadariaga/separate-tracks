/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { copyFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function copyMarkdownAssets() {
  return {
    name: 'copy-md-assets',
    buildStart() {
      const patternDir = __dirname;
      const mdFiles = ['README.md'];
      for (const f of mdFiles) {
        const src = resolve(patternDir, f);
        if (existsSync(src)) {
          const dest = resolve(__dirname, '../dist/web', f);
          try { copyFileSync(src, dest); } catch (e) {
            // ignore copy errors
          }
        }
      }
    }
  };
}

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../node_modules/.vite/web',
  server: {
    port: 4200,
    host: 'localhost',
  },
  preview: {
    port: 4200,
    host: 'localhost',
  },
  plugins: [react(), tsconfigPaths(), copyMarkdownAssets()],
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [ nxViteTsPaths() ],
  // },
  build: {
    outDir: '../dist/web',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  test: {
    name: 'web',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../coverage/web',
      provider: 'v8' as const,
    },
  },
}));
