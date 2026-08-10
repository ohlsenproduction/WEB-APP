const DB_NAME = 'aufgaben-app';
const DB_VERSION = 1;

export const STORES = {
  TASKS: 'tasks',
  LABELS: 'labels',
};

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORES.TASKS)) {
        const store = db.createObjectStore(STORES.TASKS, { keyPath: 'id' });
        store.createIndex('dueDate', 'dueDate');
      }
      if (!db.objectStoreNames.contains(STORES.LABELS)) {
        db.createObjectStore(STORES.LABELS, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
  return dbPromise;
}

function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getStore(storeName, mode) {
  const db = await openDB();
  return db.transaction(storeName, mode).objectStore(storeName);
}

export async function getAll(storeName) {
  const store = await getStore(storeName, 'readonly');
  return promisifyRequest(store.getAll());
}

export async function put(storeName, value) {
  const store = await getStore(storeName, 'readwrite');
  return promisifyRequest(store.put(value));
}

export async function remove(storeName, id) {
  const store = await getStore(storeName, 'readwrite');
  return promisifyRequest(store.delete(id));
}

export function createId() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
