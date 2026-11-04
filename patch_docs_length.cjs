const fs = require('fs');
let code = fs.readFileSync('components/Wallet.tsx', 'utf8');

code = code.replace(
  /\{Object\.entries\(groupedDocsByRelation\[viewingRelation\] \|\| \{\}\)\.map\(\(\[owner, docs\]\) => \(/g,
  '{Object.entries(groupedDocsByRelation[viewingRelation] || {} as Record<string, StoredDocument[]>).map(([owner, docs]: [string, any]) => ('
);

fs.writeFileSync('components/Wallet.tsx', code);
