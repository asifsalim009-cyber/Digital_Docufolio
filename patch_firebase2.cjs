const fs = require('fs');
let code = fs.readFileSync('firebase.ts', 'utf8');

code = code.replace(
  `import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';`,
  `import { getFirestore, initializeFirestore, persistentLocalCache } from 'firebase/firestore';`
);

code = code.replace(
  `localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })`,
  `localCache: persistentLocalCache()`
);

fs.writeFileSync('firebase.ts', code);
