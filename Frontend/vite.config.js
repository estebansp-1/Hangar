import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/*
 * Paquetes separados para que cada página descargue solo lo que usa:
 *  - react: React y el router (todas las páginas)
 *  - three: motor 3D (solo páginas con escenas 3D, se carga bajo demanda)
 *  - post: postproceso del 3D (oclusión ambiental), llega después de la primera imagen
 *  - gsap: animaciones de scroll
 */
const CHUNKS = [
  // zustand y use-sync-external-store los comparten la app y el 3D: van con React para no arrastrar three.js
  ['react', /node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|@remix-run|zustand|use-sync-external-store)\//],
  ['post', /node_modules\/(postprocessing|@react-three\/postprocessing|n8ao|buffer|base64-js|ieee754)\//],
  ['three', /node_modules\/(three|@react-three|its-fine|suspend-react|react-reconciler|maath)\//],
  ['gsap', /node_modules\/(gsap|@gsap)\//],
];

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const p = id.replace(/\\/g, '/');
          // el ayudante de carga diferida de Vite debe vivir en el paquete base, no en el de three.js
          if (p.includes('vite/preload-helper') || p.includes('commonjsHelpers')) return 'react';
          for (const [name, re] of CHUNKS) if (re.test(p)) return name;
          return undefined;
        },
      },
    },
  },
});
