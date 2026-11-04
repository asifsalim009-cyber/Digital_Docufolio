import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { StoredDocument } from './types';
import { db } from './firebase';
import { doc, setDoc, deleteDoc, getDoc, collection, getDocs } from 'firebase/firestore';

interface FolioDB extends DBSchema {
  documents: {
    key: string;
    value: StoredDocument;
  };
  syncQueue: {
    key: number;
    value: {
      id?: number;
      action: 'ADD' | 'UPDATE' | 'DELETE';
      payload: any; // StoredDocument or string (for delete)
      timestamp: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<FolioDB>>;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<FolioDB>('FolioSyncDB', 1, {
      upgrade(db) {
        db.createObjectStore('documents', { keyPath: 'id' });
        db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
      },
    });
  }
  return dbPromise;
};

export const getOfflineDocuments = async (): Promise<StoredDocument[]> => {
  const db = await initDB();
  return db.getAll('documents');
};

export const saveOfflineDocument = async (docObj: StoredDocument) => {
  const db = await initDB();
  await db.put('documents', docObj);
};

export const deleteOfflineDocument = async (id: string) => {
  const db = await initDB();
  await db.delete('documents', id);
};

export const queueSyncAction = async (action: 'ADD' | 'UPDATE' | 'DELETE', payload: any) => {
  const db = await initDB();
  await db.add('syncQueue', {
    action,
    payload,
    timestamp: Date.now()
  });
  
  if (navigator.onLine) {
    processSyncQueue();
  } else {
    // Attempt to register background sync if supported
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const swRegistration = await navigator.serviceWorker.ready;
        await (swRegistration as any).sync.register('sync-documents');
      } catch (e) {
        console.error('Background sync registration failed:', e);
      }
    }
  }
};

export const processSyncQueue = async (userId?: string) => {
  const dbInstance = await initDB();
  const tx = dbInstance.transaction('syncQueue', 'readwrite');
  const store = tx.objectStore('syncQueue');
  const items = await store.getAll();
  
  if (items.length === 0) return;
  
  // Try to sync to Firebase
  if (navigator.onLine) {
    for (const item of items) {
      try {
        const currentUserUid = userId || (window as any).currentUserUid;
        if (!currentUserUid) continue; // Skip if no user available
        
        if (item.action === 'ADD' || item.action === 'UPDATE') {
          const docObj = item.payload as StoredDocument;
          await setDoc(doc(db, 'users', currentUserUid, 'documents', docObj.id), docObj);
        } else if (item.action === 'DELETE') {
          const docId = item.payload as string;
          await deleteDoc(doc(db, 'users', currentUserUid, 'documents', docId));
        }
        await store.delete(item.id!);
      } catch (err) {
        console.error('Failed to sync item', item, err);
      }
    }
  }
};

// Listen for online event
window.addEventListener('online', () => {
  processSyncQueue();
});
