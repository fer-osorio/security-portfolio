import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main:     'index.html',
        rsa:      'pages/rsa-tool.html',
        hash:     'pages/hash-tool.html',
        ec:       'pages/ec-tool.html',
      },
    },
  },
});
