import { openDB } from 'idb';

const DB_NAME = 'yatama_attendance_db';
const STORE_NAME = 'offline_scans';

export const initDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
};

export const saveOfflineScan = async (scanData) => {
  const db = await initDB();
  return db.add(STORE_NAME, {
    ...scanData,
    created_at: new Date().toISOString()
  });
};

export const getOfflineScans = async () => {
  const db = await initDB();
  return db.getAll(STORE_NAME);
};

export const clearOfflineScans = async (ids) => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await Promise.all(ids.map(id => tx.store.delete(id)));
  await tx.done;
};
