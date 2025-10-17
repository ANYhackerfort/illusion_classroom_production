import type { Bot } from "./bot";

const DB_NAME = "botDB_view";
const STORE_NAME = "bots_view";
const DB_VERSION = 2; // ⬆️ bump version so upgrade runs once

// ✅ Open or upgrade the database
function openBotDBView(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      // 🧹 Delete old store if schema changed
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }

      // ✅ Use "id" as the key path (string)
      db.createObjectStore(STORE_NAME, { keyPath: "id" });
      console.log(
        "%c[IDB] bots_view store created with keyPath 'id'.",
        "color: #00cc88;",
      );
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ✅ Store or update a bot
export async function storeBotView(bot: Bot): Promise<void> {
  if (!bot.id) {
    throw new Error("storeBotView: bot.id is missing!");
  }

  const db = await openBotDBView();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.put(bot); // Upsert (add or replace by id)

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ✅ Get a bot by ID (string)
export async function getBotByIdView(id: string): Promise<Bot | undefined> {
  const db = await openBotDBView();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ✅ Get all bots
export async function getAllBotsView(): Promise<Bot[]> {
  const db = await openBotDBView();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ✅ Delete a bot by ID (string)
export async function deleteBotView(id: string): Promise<void> {
  const db = await openBotDBView();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.delete(id);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ✅ Clear all bots
export async function clearAllBotsView(): Promise<void> {
  const db = await openBotDBView();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.clear();

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      console.log(
        "%c🧹 [IDB] All bots cleared from IndexedDB.",
        "color: orange;",
      );
      window.dispatchEvent(new Event("bot-db-updated"));
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}
