const fs = require('fs');
let code = fs.readFileSync('firebase.ts', 'utf8');

code = code.replace(
  `import { getFirestore, initializeFirestore } from 'firebase/firestore';`,
  `import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';`
);

code = code.replace(
  `const firestoreOptions = firebaseConfig.firestoreDatabaseId ? { databaseId: firebaseConfig.firestoreDatabaseId, experimentalForceLongPolling: true } : { experimentalForceLongPolling: true };`,
  `const firestoreOptions = {
    ...(firebaseConfig.firestoreDatabaseId ? { databaseId: firebaseConfig.firestoreDatabaseId } : {}),
    experimentalForceLongPolling: true,
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
};`
);

fs.writeFileSync('firebase.ts', code);
