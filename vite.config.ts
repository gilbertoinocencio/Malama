import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'public',
        filename: 'sw.js',
        registerType: 'autoUpdate',
        includeAssets: ['logo.jpg', 'apple-touch-icon.png'],
        manifest: {
          name: 'Malama - Feed the Flow',
          short_name: 'Malama',
          description: 'Align your nutrition with your natural rhythm using AI.',
          theme_color: '#7d4a3c',
          background_color: '#FDFBF9',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            {
              src: 'logo.jpg',
              sizes: '192x192',
              type: 'image/jpeg',
              purpose: 'any maskable'
            },
            {
              src: 'logo.jpg',
              sizes: '512x512',
              type: 'image/jpeg',
              purpose: 'any maskable'
            }
          ]
        },
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg}'],
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    // Exclude MediaPipe from Vite pre-bundling — it ships its own WASM loader
    optimizeDeps: {
      exclude: ['@mediapipe/tasks-vision'],
    },
    // Allow WASM MIME type and cross-origin headers needed by Safari iOS 16+
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  };
});
