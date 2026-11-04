const fs = require('fs');
let code = fs.readFileSync('components/Monetization.tsx', 'utf8');

code = code.replace(
  `"Everything in Pro Suite",\n        "Business Documents (KRA PIN, Tax, Licenses)",`,
  `"Everything in Elite",\n        "Unlimited Document Storage",\n        "Business Documents (KRA PIN, Tax, Licenses)",`
);

fs.writeFileSync('components/Monetization.tsx', code);
