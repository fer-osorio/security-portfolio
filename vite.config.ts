import { defineConfig } from 'vite';

export default defineConfig({
  base: '/security-portfolio/',
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main:     'index.html',
        rsa:      'pages/rsa-tool.html',
        hash:     'pages/hash-tool.html',
        ec:       'pages/ec-tool.html',
        aes:      'pages/aes-tool.html',
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
