import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
    return {
      base: './',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            workbox: { 
              maximumFileSizeToCacheInBytes: 5000000,
              navigateFallbackDenylist: [/^\/__/, /firestore\.googleapis\.com/, /securetoken\.googleapis\.com/, /identitytoolkit\.googleapis\.com/]
            },
            manifest: {
                name: 'Digital DocuFolio',
                short_name: 'DocuFolio',
                description: 'Your Personal & Business Document Vault',
                theme_color: '#022c22', // forest-950
                background_color: '#022c22',
                display: 'standalone',
                icons: [
                    {
                        src: 'logo.png', // Fallback to our logo
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'logo.png',
                        sizes: '512x512',
                        type: 'image/png'
                    }
                ]
            }
        })
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
