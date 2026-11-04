const fs = require('fs');
let code = fs.readFileSync('components/Monetization.tsx', 'utf8');

code = code.replace(
  `price: { monthly: "KES 1,000/mo", yearly: "KES 10,000/yr", monthlyNum: 1000, yearlyNum: 10000 },`,
  `price: { monthly: "KES 1,500/mo", yearly: "KES 15,000/yr", monthlyNum: 1500, yearlyNum: 15000 },`
);

code = code.replace(
  `<th className="py-3 px-3 font-bold text-sky-600">Pro (KES 1,000)</th>`,
  `<th className="py-3 px-3 font-bold text-sky-600">Pro (KES 1,500)</th>`
);

fs.writeFileSync('components/Monetization.tsx', code);
