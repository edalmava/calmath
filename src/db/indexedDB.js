const DB_NAME = 'evalmath_db';
const DB_VER = 4;
const STORE = 'evaluaciones';
const FOTO_STORE = 'fotos';
const DRAFT_STORE = 'borradores';
let db = null;

export function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains(STORE)) {
        const s = d.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        s.createIndex('periodo', 'periodo', { unique: false });
        s.createIndex('fecha', 'fecha', { unique: false });
      }
      if (!d.objectStoreNames.contains(FOTO_STORE)) {
        d.createObjectStore(FOTO_STORE, { keyPath: 'fotoId' });
      }
      if (!d.objectStoreNames.contains(DRAFT_STORE)) {
        d.createObjectStore(DRAFT_STORE, { keyPath: 'draftId' });
      }
    };
    req.onsuccess = (e) => {
      db = e.target.result;
      resolve();
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

export function getDb() {
  return db;
}

const tx = (mode) => db.transaction(STORE, mode).objectStore(STORE);

export function dbGuardar(obj) {
  return new Promise((res, rej) => {
    const r = tx('readwrite').add(obj);
    r.onsuccess = () => res(r.result);
    r.onerror = (e) => rej(e.target.error);
  });
}

export function dbActualizar(obj) {
  return new Promise((res, rej) => {
    const r = tx('readwrite').put(obj);
    r.onsuccess = () => res(r.result);
    r.onerror = (e) => rej(e.target.error);
  });
}

export function dbListar() {
  return new Promise((res, rej) => {
    const r = tx('readonly').getAll();
    r.onsuccess = () => res(r.result);
    r.onerror = (e) => rej(e.target.error);
  });
}

export function dbEliminar(id) {
  return new Promise((res, rej) => {
    const r = tx('readwrite').delete(id);
    r.onsuccess = () => res();
    r.onerror = (e) => rej(e.target.error);
  });
}
