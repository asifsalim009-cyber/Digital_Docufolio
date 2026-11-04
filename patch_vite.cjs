const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf8');

code = code.replace(
  `import react from '@vitejs/plugin-react';`,
  `import react from '@vitejs/plugin-react';\nimport { VitePWA } from 'vite-plugin-pwa';`
);

code = code.replace(
  `plugins: [react()],`,
  `plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
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
      ],`
);

fs.writeFileSync('vite.config.ts', code);
