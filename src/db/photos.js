import { getDb } from './indexedDB.js';

const FOTO_STORE = 'fotos';

const txFoto = (mode) => {
  const db = getDb();
  return db.transaction(FOTO_STORE, mode).objectStore(FOTO_STORE);
};

export function fotoKey(evalId, stuIdx) {
  return `${evalId}_${stuIdx}`;
}

export async function dbGuardarFoto(evalId, stuIdx, blob, nombre) {
  return new Promise((res, rej) => {
    const obj = { fotoId: fotoKey(evalId, stuIdx), blob, nombre, type: blob.type };
    const r = txFoto('readwrite').put(obj);
    r.onsuccess = () => res();
    r.onerror = (e) => rej(e.target.error);
  });
}

export async function dbObtenerFoto(evalId, stuIdx) {
  return new Promise((res, rej) => {
    const r = txFoto('readonly').get(fotoKey(evalId, stuIdx));
    r.onsuccess = () => res(r.result || null);
    r.onerror = (e) => rej(e.target.error);
  });
}

export async function dbEliminarFotosByEval(evalId, stuCount) {
  const promises = Array.from({ length: stuCount }, (_, i) =>
    new Promise((res, rej) => {
      const r = txFoto('readwrite').delete(fotoKey(evalId, i));
      r.onsuccess = () => res();
      r.onerror = (e) => rej(e.target.error);
    }),
  );
  return Promise.allSettled(promises);
}
