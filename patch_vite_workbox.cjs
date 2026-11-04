const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf8');

code = code.replace(
  `registerType: 'autoUpdate',`,
  `registerType: 'autoUpdate',\n            workbox: { maximumFileSizeToCacheInBytes: 5000000 },`
);

fs.writeFileSync('vite.config.ts', code);
