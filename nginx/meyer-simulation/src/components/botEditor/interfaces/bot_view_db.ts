export interface StoredBot {
  identifier: string;
  name: string;
  memory: string;
  answers: string[];
  image: string | null;
}

const DB_NAME = "botDB_view";
const STORE_NAME = "bots_view";
const DB_VERSION = 1;

// ✅ Open or upgrade the database
function openBotDBView(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "identifier" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ✅ Store or update a bot
export async function storeBotView(bot: StoredBot): Promise<void> {
  const db = await openBotDBView();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.put(bot);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ✅ Get a bot by ID
export async function getBotByIdView(
  identifier: string,
): Promise<StoredBot | undefined> {
  const db = await openBotDBView();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.get(identifier);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ✅ Get all bots
export async function getAllBotsView(): Promise<StoredBot[]> {
  const db = await openBotDBView();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
