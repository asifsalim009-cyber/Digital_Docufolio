const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const startIndex = code.indexOf('// --- Gmail Login / Auto-fill Logic ---');
const endIndex = code.indexOf('// --- Render Functions ---');
if (startIndex !== -1 && endIndex !== -1) {
  code = code.slice(0, startIndex) + code.slice(endIndex);
}

fs.writeFileSync('App.tsx', code);
