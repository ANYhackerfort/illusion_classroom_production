// src/indexDB/surveyStorage.ts
export type SurveyItem =
  | {
      id: string;
      type: "description";
      content: string;
      associatedTab?: number;
    }
  | {
      id: string;
      type: "slider";
      question: string;
      min: number;
      max: number;
      associatedTab?: number;
    }
  | {
      id: string;
      type: "mcq";
      question: string;
      options: string[];
      associatedTab?: number;
    }
  | {
      id: string;
      type: "qualtrics";
      url: string;
      associatedTab?: number;
    };

// A full survey, as stored in backend & IndexedDB
export class Survey {
  id: string;
  items: SurveyItem[];
  associated_meeting_id: string | number | null; // ✅ newly added field

  constructor(
    id: string,
    items: SurveyItem[],
    associated_meeting_id: string | number | null = null,
  ) {
    this.id = id;
    this.items = items;
    this.associated_meeting_id = associated_meeting_id;
  }
}

const DB_NAME = "surveyDB";
const STORE_NAME = "surveys";

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

// ==============================
// 💾 Save Survey
// ==============================
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

// ==============================
// 📥 Get All Surveys
// ==============================
export const getAllSurveys = async (): Promise<Survey[]> => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const rawResults = request.result as {
        id: string;
        items: SurveyItem[];
        associated_meeting_id?: string | number | null;
      }[];
      const surveys = rawResults.map(
        (s) => new Survey(s.id, s.items, s.associated_meeting_id ?? null),
      );
      resolve(surveys);
    };
    request.onerror = () => reject(request.error);
  });
};

// ==============================
// 🧹 Clear All Surveys
// ==============================
export const clearAllSurveys = async (): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.clear();
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      console.log(
        "%c🧹 [IDB] All surveys cleared from IndexedDB.",
        "color: orange;",
      );
      window.dispatchEvent(new Event("survey-db-updated"));
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
};

// ==============================
// ❌ Delete by ID
// ==============================
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
