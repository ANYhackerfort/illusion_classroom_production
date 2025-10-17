// src/utils/questionStorage.ts

import type { QuestionCardData } from "../types/QuestionCard"; // adjust path if needed
import { v4 as uuidv4 } from "uuid";

const DB_NAME = "questionDB";
const STORE_NAME = "questions";

export interface StoredQuestion {
  id: string;
  data: QuestionCardData;
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

export const saveQuestion = async (data: QuestionCardData): Promise<string> => {
  const db = await openDB();
  const id = uuidv4();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await store.put({ id, data });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
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

export const clearAllQuestions = async (): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.clear();
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const deleteQuestionById = async (
  questionCardId: string,
): Promise<void> => {
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
        reject(new Error("Question not found"));
      }
    };
    request.onerror = () => reject(request.error);
  });
};
