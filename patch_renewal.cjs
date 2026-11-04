const fs = require('fs');
let code = fs.readFileSync('components/Wallet.tsx', 'utf8');

code = code.replace(
  `      if (file.type === 'application/pdf') {`,
  `      if (file.type === 'application/pdf') {
        if (file.size > 0.7 * 1024 * 1024) {
           alert(\`PDF File is too large (\${(file.size / (1024*1024)).toFixed(1)}MB). The maximum supported PDF size is 0.7MB due to database limits.\`);
           return;
        }`
);

fs.writeFileSync('components/Wallet.tsx', code);
