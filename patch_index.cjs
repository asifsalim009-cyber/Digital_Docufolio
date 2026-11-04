const fs = require('fs');
let code = fs.readFileSync('index.tsx', 'utf8');

if (!code.includes('virtual:pwa-register')) {
  code = `import { registerSW } from 'virtual:pwa-register';\n\n` + code;
  code += `\n\n// Register Service Worker for offline support\nif ('serviceWorker' in navigator) {\n  registerSW({ immediate: true });\n}\n`;
  fs.writeFileSync('index.tsx', code);
}
