const fs = require('fs');
let code = fs.readFileSync('components/Monetization.tsx', 'utf8');

// Fix Premium
code = code.replace(
  `description: "Up to 1,000 personal documents, complete expense tracker & cloud sync.",`,
  `description: "Up to 200 personal documents, complete expense tracker & cloud sync.",`
);
code = code.replace(
  `"Up to 1,000 Personal Documents",`,
  `"Up to 200 Personal Documents",`
);

// Fix Pro
code = code.replace(
  `description: "Family & Others document vault, AI OCR scanner & unlimited storage.",`,
  `description: "Family & Others document vault, AI OCR scanner & up to 1,000 documents.",`
);
code = code.replace(
  `"Unlimited Total Document Storage",`,
  `"Up to 1,000 Total Documents",`
);

// Fix Elite
code = code.replace(
  `"Everything in Pro Suite",`,
  `"Everything in Pro Suite",\n        "Up to 5,000 Total Documents",`
);

// Fix Business
code = code.replace(
  `"Everything in Elite",`,
  `"Everything in Elite",\n        "Unlimited Document Storage",`
);

fs.writeFileSync('components/Monetization.tsx', code);
