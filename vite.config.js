import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) return 'vendor';
          if (id.includes('db/')) return 'database';
          if (id.includes('views.js')) return 'views';
          if (id.includes('render.js')) return 'render';
          if (id.includes('steps.js')) return 'steps';
          if (id.includes('calification.js')) return 'calification';
          if (id.includes('state.js')) return 'state';
          return 'app';
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
