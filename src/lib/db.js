// IndexedDB storage for per-pose audio recordings.
// Blobs go in IndexedDB (not localStorage) so they persist offline on-device.

const DB_NAME = 'bikram-trainer'
const DB_VERSION = 1
const STORE = 'audio'

let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'poseId' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx(db, mode) {
  return db.transaction(STORE, mode).objectStore(STORE)
}

export async function saveAudio(poseId, file) {
  const db = await openDB()
  const record = {
    poseId,
    blob: file,
    name: file.name || 'recording',
    type: file.type || 'audio/mpeg',
    size: file.size,
    savedAt: Date.now(),
  }
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readwrite').put(record)
    req.onsuccess = () => resolve(record)
    req.onerror = () => reject(req.error)
  })
}

export async function getAudio(poseId) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readonly').get(poseId)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteAudio(poseId) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readwrite').delete(poseId)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// Returns { poseId: {name, size, savedAt} } for every pose with audio,
// without loading the blobs themselves.
export async function listAudioMeta() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const meta = {}
    const req = tx(db, 'readonly').openCursor()
    req.onsuccess = () => {
      const cursor = req.result
      if (cursor) {
        const { poseId, name, size, savedAt, type } = cursor.value
        meta[poseId] = { name, size, savedAt, type }
        cursor.continue()
      } else {
        resolve(meta)
      }
    }
    req.onerror = () => reject(req.error)
  })
}

// Ask the browser to keep our data through storage pressure (best effort).
export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      return await navigator.storage.persist()
    }
  } catch {
    /* unsupported */
  }
  return false
}
