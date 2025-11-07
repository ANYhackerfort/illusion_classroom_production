import type { QuestionCardData } from "../types/QuestionCard";

const DB_NAME = "questionDB";
const STORE_NAME = "questions";

export interface StoredQuestion {
  id: string;
  data: QuestionCardData;
  associated_meeting_id: string;
  start?: number;
  end?: number;
}

/**
 * Open the IndexedDB and automatically upgrade/migrate if needed.
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2); // 🔼 bumped version for migration
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      } else {
        const store = request.transaction?.objectStore(STORE_NAME);
        if (store) {
          console.log("🧩 Upgrading questionDB schema… ensuring start/end fields exist");
          const getAllReq = store.getAll();
          getAllReq.onsuccess = () => {
            const items = getAllReq.result as StoredQuestion[];
            items.forEach((item) => {
              store.put(item);
            });
          };
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Save a question entry (adds start/end if missing).
 */
export const saveQuestion = async (
  id: string,
  data: QuestionCardData,
  associated_meeting_id: string,
  start?: number,
  end?: number,
): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  const newEntry: StoredQuestion = {
    id,
    data,
    associated_meeting_id,
    start: start ?? undefined,
    end: end ?? undefined,
  };

  await store.put(newEntry);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

/**
 * Retrieve all questions.
 */
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

/**
 * Clear all questions.
 */
export const clearAllQuestions = async (): Promise<void> => {
  console.log("%c🧹 [IDB] Clearing all QuestionCards...", "color: orange; font-weight: bold;");
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.clear();
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      console.log("%c✅ [IDB] All QuestionCards cleared.", "color: #00cc88; font-weight: bold;");
      window.dispatchEvent(new Event("question-db-updated"));
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
};

/**
 * Delete question by its QuestionCardData.id
 */
export const deleteQuestionById = async (questionCardId: string): Promise<void> => {
  console.log("🗑️ Deleting", questionCardId);
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const items = request.result as StoredQuestion[];
      const match = items.find((item) => item.data.id === questionCardId);

      if (match) {
        store.delete(match.id);
        tx.oncomplete = () => resolve();
      } else {
        console.warn(`⚠️ Question ${questionCardId} not found in IndexedDB — skipping delete.`);
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
};

// ✅ Update start and end times for a stored question
export const updateQuestionStartEnd = async (
  questionId: string,
  start: number,
  end: number
): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    // Get all questions
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const items = request.result as StoredQuestion[];
        const match = items.find((item) => item.data.id === questionId);

        if (!match) {
          console.warn(
            `⚠️ Question ${questionId} not found in IndexedDB — cannot update start/end.`
          );
          resolve();
          return;
        }

        const updated: StoredQuestion = {
          ...match,
          start,
          end,
        };

        store.put(updated);
        tx.oncomplete = () => {
          console.log(
            `💾 [IDB] Updated question ${questionId} with start=${start}, end=${end}`
          );
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("❌ [IDB] Failed to update question start/end:", err);
    throw err;
  }
};
