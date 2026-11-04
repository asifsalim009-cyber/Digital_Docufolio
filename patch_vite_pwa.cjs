const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf8');

code = code.replace(
  `workbox: { maximumFileSizeToCacheInBytes: 5000000 },`,
  `workbox: { 
              maximumFileSizeToCacheInBytes: 5000000,
              navigateFallbackDenylist: [/^\/__/, /firestore\\.googleapis\\.com/, /securetoken\\.googleapis\\.com/, /identitytoolkit\\.googleapis\\.com/]
            },`
);

fs.writeFileSync('vite.config.ts', code);
