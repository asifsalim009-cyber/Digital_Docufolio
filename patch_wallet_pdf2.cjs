const fs = require('fs');
let code = fs.readFileSync('components/Wallet.tsx', 'utf8');

code = code.replace(
  /if \(file\.size > limits\.maxFileSizeMB \* 1024 \* 1024\) \{[\s\S]*?return; \/\/ block it\s*\}/,
  `if (file.size > maxPdfSize * 1024 * 1024) { 
             alert(\`PDF File is too large (\${(file.size / (1024*1024)).toFixed(1)}MB). The maximum supported PDF size is \${maxPdfSize}MB due to database limits.\`); 
             return; // block it
          }`
);

fs.writeFileSync('components/Wallet.tsx', code);
