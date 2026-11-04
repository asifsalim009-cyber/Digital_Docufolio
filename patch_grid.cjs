const fs = require('fs');
let code = fs.readFileSync('components/Monetization.tsx', 'utf8');

code = code.replace(
  `? 'md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl'`,
  `? 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-[1400px]'`
);

fs.writeFileSync('components/Monetization.tsx', code);
