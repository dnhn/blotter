import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Dev server for the demo page; the demo imports by published package
// names so its code matches real consumer usage.
export default defineConfig({
  root: 'examples',
  resolve: {
    alias: {
      'blotter.ts/materials': fileURLToPath(
        new URL('./src/materials/index.ts', import.meta.url),
      ),
      'blotter.ts': fileURLToPath(new URL('./src/index.ts', import.meta.url)),
    },
  },
});
