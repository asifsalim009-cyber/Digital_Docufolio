const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(/<Wallet\s+profile=\{profile\}/g, '<Wallet\n                   profile={profile}\n                   onUseAiCredit={handleUseAiCredit}');
code = code.replace(/<Journal\s+profile=\{profile\}/g, '<Journal\n                   profile={profile}\n                   onUseAiCredit={handleUseAiCredit}');
code = code.replace(/<Expenditures\s+profile=\{profile\}/g, '<Expenditures\n                   profile={profile}\n                   onUseAiCredit={handleUseAiCredit}');
code = code.replace(/<Profile\s+profile=\{profile\}/g, '<Profile\n                 profile={profile}\n                 onUseAiCredit={handleUseAiCredit}');
code = code.replace(/<BusinessProfile\s+profile=\{profile\}/g, '<BusinessProfile\n                 profile={profile}\n                 onUseAiCredit={handleUseAiCredit}');

fs.writeFileSync('App.tsx', code);
