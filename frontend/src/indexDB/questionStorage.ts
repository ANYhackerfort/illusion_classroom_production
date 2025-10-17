// src/utils/questionStorage.ts

import type { QuestionCardData } from "../types/QuestionCard"; // adjust path if needed

const DB_NAME = "questionDB";
const STORE_NAME = "questions";

export interface StoredQuestion {
  id: string;
  data: QuestionCardData;
  associated_meeting_id: string;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveQuestion = async (
  id: string, // 👈 manually supplied unique ID
  data: QuestionCardData,
  associated_meeting_id: string,
): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  await store.put({ id, data, associated_meeting_id });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const clearAllQuestions = async (): Promise<void> => {
  console.log(
    "%c🧹 [IDB] Clearing all QuestionCards from IndexedDB...",
    "color: orange; font-weight: bold;",
  );

  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  store.clear(); // ✅ wipe all QuestionCards in the store

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      console.log(
        "%c✅ [IDB] All QuestionCards cleared from IndexedDB.",
        "color: #00cc88; font-weight: bold;",
      );
      window.dispatchEvent(new Event("question-db-updated")); // optional global event for UI sync
      resolve();
    };
    tx.onerror = () => {
      console.error("❌ [IDB] Failed to clear all QuestionCards:", tx.error);
      reject(tx.error);
    };
  });
};

export const getAllQuestions = async (): Promise<StoredQuestion[]> => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as StoredQuestion[]);
    request.onerror = () => reject(request.error);
  });
};

export const deleteQuestionById = async (
  questionCardId: string,
): Promise<void> => {
  console.log("!!!!!! DELETING", questionCardId)
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const items = request.result as { id: string; data: QuestionCardData }[];
      const match = items.find((item) => item.data.id === questionCardId);

      if (match) {
        store.delete(match.id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } else {
        console.warn(
          `⚠️ Question ${questionCardId} not found in IndexedDB — skipping delete.`,
        );
        resolve(); // ✅ just resolve instead of rejecting
      }
    };

    request.onerror = () => reject(request.error);
  });
};
