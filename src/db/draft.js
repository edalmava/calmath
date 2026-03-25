import { getDb } from './indexedDB.js';

const DRAFT_STORE = 'borradores';
const DRAFT_KEY = 'draft';

const txDraft = (mode) => {
  const db = getDb();
  return db.transaction(DRAFT_STORE, mode).objectStore(DRAFT_STORE);
};

export async function dbGuardarBorrador(obj) {
  return new Promise((res, rej) => {
    const r = txDraft('readwrite').put({ draftId: DRAFT_KEY, ...obj });
    r.onsuccess = () => res();
    r.onerror = (e) => rej(e.target.error);
  });
}

export async function dbObtenerBorrador() {
  return new Promise((res, rej) => {
    const r = txDraft('readonly').get(DRAFT_KEY);
    r.onsuccess = () => res(r.result || null);
    r.onerror = (e) => rej(e.target.error);
  });
}

export async function dbEliminarBorrador() {
  return new Promise((res, rej) => {
    const r = txDraft('readwrite').delete(DRAFT_KEY);
    r.onsuccess = () => res();
    r.onerror = (e) => rej(e.target.error);
  });
}
