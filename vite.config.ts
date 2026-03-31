import { defineConfig } from 'vite';

export default defineConfig({
  base: '/mathematical-foundations/',
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
