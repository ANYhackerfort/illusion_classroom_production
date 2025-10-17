// src/indexDB/surveyStorage.ts
import { v4 as uuidv4 } from "uuid";
import type { SurveyItem } from "../finder/editedVideoStorage/SurveyDropZone";
import { Survey } from "../finder/editedVideoStorage/SurveyDropZone";

const DB_NAME = "surveyDB";
const STORE_NAME = "surveys";


// IndexedDB setup
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

// Save a whole Survey object
export const saveSurvey = async (survey: Survey): Promise<string> => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await store.put(survey);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(survey.id);
    tx.onerror = () => reject(tx.error);
  });
};

// Get all saved surveys
export const getAllSurveys = async (): Promise<Survey[]> => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const rawResults = request.result as { id: string; items: SurveyItem[] }[];
      const surveys = rawResults.map((s) => new Survey(s.id, s.items));
      resolve(surveys);
    };
    request.onerror = () => reject(request.error);
  });
};

// Clear all saved surveys
export const clearAllSurveys = async (): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.clear();
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// Delete a survey by its ID
export const deleteSurveyById = async (surveyId: string): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.delete(surveyId);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};
