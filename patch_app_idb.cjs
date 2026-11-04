const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// Add import
const importStr = `import { initDB, getOfflineDocuments, saveOfflineDocument, deleteOfflineDocument, queueSyncAction, processSyncQueue } from './idbSync';`;
code = code.replace(`import { SplashScreen } from './components/SplashScreen';`, `import { SplashScreen } from './components/SplashScreen';\n${importStr}`);

// Attach user UID globally for sync processing
code = code.replace(`setUser(currentUser);`, `setUser(currentUser);\n      (window as any).currentUserUid = currentUser ? currentUser.uid : null;\n      if (currentUser) processSyncQueue(currentUser.uid);`);

// Replace docsUnsub and data loading
const oldDocsUnsub = `    const docsUnsub = onSnapshot(collection(db, 'users', user.uid, 'documents'), (snap) => {
      setDocuments(snap.docs.map(d => d.data() as StoredDocument));
    });`;

const newDocsUnsub = `    // IDB offline-first sync logic for documents
    getOfflineDocuments().then(docs => {
      if (docs && docs.length > 0) {
        setDocuments(docs);
      }
    });

    const docsUnsub = onSnapshot(collection(db, 'users', user.uid, 'documents'), { includeMetadataChanges: true }, (snap) => {
      // Only sync down from server if we are not pending local writes to avoid overwriting optimistic UI
      if (!snap.metadata.hasPendingWrites) {
         const serverDocs = snap.docs.map(d => d.data() as StoredDocument);
         setDocuments(serverDocs);
         serverDocs.forEach(doc => saveOfflineDocument(doc));
      }
    });`;

code = code.replace(oldDocsUnsub, newDocsUnsub);

// Replace handleAddDocument
const oldAdd = `  const handleAddDocument = async (docObj: StoredDocument) => {
    setDocuments(prev => [...prev, docObj]);
    if (user) await setDoc(doc(db, 'users', user.uid, 'documents', docObj.id), docObj);
  };`;

const newAdd = `  const handleAddDocument = async (docObj: StoredDocument) => {
    setDocuments(prev => [...prev, docObj]);
    await saveOfflineDocument(docObj);
    if (navigator.onLine) {
      if (user) await setDoc(doc(db, 'users', user.uid, 'documents', docObj.id), docObj);
    } else {
      await queueSyncAction('ADD', docObj);
    }
  };`;

code = code.replace(oldAdd, newAdd);

// Replace handleUpdateDocument
const oldUpdate = `  const handleUpdateDocument = async (updatedDoc: StoredDocument) => {
    setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
    if (user) await setDoc(doc(db, 'users', user.uid, 'documents', updatedDoc.id), updatedDoc);
  };`;

const newUpdate = `  const handleUpdateDocument = async (updatedDoc: StoredDocument) => {
    setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
    await saveOfflineDocument(updatedDoc);
    if (navigator.onLine) {
      if (user) await setDoc(doc(db, 'users', user.uid, 'documents', updatedDoc.id), updatedDoc);
    } else {
      await queueSyncAction('UPDATE', updatedDoc);
    }
  };`;

code = code.replace(oldUpdate, newUpdate);

// Replace handleDeleteDocument
const oldDelete = `  const handleDeleteDocument = async (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    if (user) await deleteDoc(doc(db, 'users', user.uid, 'documents', id));
  };`;

const newDelete = `  const handleDeleteDocument = async (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    await deleteOfflineDocument(id);
    if (navigator.onLine) {
      if (user) await deleteDoc(doc(db, 'users', user.uid, 'documents', id));
    } else {
      await queueSyncAction('DELETE', id);
    }
  };`;

code = code.replace(oldDelete, newDelete);

fs.writeFileSync('App.tsx', code);
