const fs = require('fs');

// Patch Reminders.tsx
let code = fs.readFileSync('components/Reminders.tsx', 'utf8');
code = code.replace(
  /Object\.entries\(groupedDocuments\)\.map\(\(\[owner, docs\]\) => \(/g,
  'Object.entries(groupedDocuments).map(([owner, docs]: [string, any]) => ('
);
fs.writeFileSync('components/Reminders.tsx', code);

// Patch firebase.ts
let firebaseCode = fs.readFileSync('firebase.ts', 'utf8');
firebaseCode = firebaseCode.replace(
  /export const db = initializeFirestore\(app, firestoreOptions\);/,
  'export const db = initializeFirestore(app, firestoreOptions as any);'
);
fs.writeFileSync('firebase.ts', firebaseCode);
