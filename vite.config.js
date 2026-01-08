import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Determinar el base path
  // En modo 'production' o cuando VITE_BASE está definido, usar '/delivery-dashboard/'
  // En desarrollo, usar '/' para que funcione localmente
  const base = mode === 'production' || process.env.VITE_BASE 
    ? '/delivery-dashboard/' 
    : '/';
  
  return {
    base,
    // Forzar modo SPA y punto de entrada explícito para evitar 404 en dev/preview
    appType: 'spa',
    build: {
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html'),
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      open: true,
      hmr: {
        overlay: true,
      },
      watch: {
        usePolling: false,
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'lucide-react'],
    },
  };
})
