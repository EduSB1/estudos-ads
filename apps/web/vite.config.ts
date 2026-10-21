import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
    // Uma instancia so de pdfjs: se o app e o highlighter resolverem copias
    // diferentes, o worker nao bate com a API e o PDF nao abre.
    dedupe: ['pdfjs-dist', 'react', 'react-dom'],
  },
  server: { host: true, port: 5173 },
  // pdfjs e pyodide trazem binarios que o pre-bundle do Vite nao deve tocar.
  optimizeDeps: { exclude: ['pyodide', 'sql.js'] },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Monaco e o leitor de PDF so sao baixados quando a tela correspondente abre.
        manualChunks: {
          monaco: ['@monaco-editor/react'],
          pdf: ['react-pdf-highlighter-extended', 'pdfjs-dist'],
          editor: ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-placeholder'],
        },
      },
    },
  },
  worker: { format: 'es' },
});
