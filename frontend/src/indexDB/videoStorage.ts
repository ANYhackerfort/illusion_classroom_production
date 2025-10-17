// src/utils/videoStorage.ts
import type { VideoSegmentData } from "../types/QuestionCard";

export interface VideoMetadata {
  id: string;
  videoName: string;
  videoTags: string[];
  videoLength: number;
  questionCards: VideoSegmentData[];
  savedAt: string;
  videoUrl: string; // Backend connection
  organization_id: string;
  individual: boolean; // if it belongs ot individual
  thumbnail_url?: string | null;
  associated_meeting_id: string;
}

const DB_NAME = "videoEditorDB";
const STORE_NAME = "videos";

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // ✅ directly keyPath on `id` in VideoMetadata
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// ✅ save VideoMetadata directly
export const saveVideoToIndexedDB = async (
  metadata: VideoMetadata,
): Promise<void> => {
  console.log("💾 [IDB] Attempting to save video metadata:", metadata);

  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  try {
    await store.put(metadata);
    console.log("✅ [IDB] Successfully queued save for ID:", metadata.id);
  } catch (err) {
    console.error("❌ [IDB] Error putting metadata:", err, metadata);
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      console.log("🎉 [IDB] Transaction complete, saved video:", metadata.id);
      window.dispatchEvent(new Event("video-db-updated"));
      resolve();
    };
    tx.onerror = () => {
      console.error("❌ [IDB] Transaction failed:", tx.error);
      reject(tx.error);
    };
  });
};

// ✅ return VideoMetadata
export const getVideoById = async (
  id: string,
): Promise<VideoMetadata | null> => {
  console.log("🔍 [IDB] Looking up video by ID:", id);

  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);

  // ❌ const key = Number(id);
  const key = id; // ✅ use string key

  const request = store.get(key);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      if (request.result) {
        console.log("📦 [IDB] Found result for ID:", key, request.result);
      } else {
        console.warn("⚠️ [IDB] No result found for ID:", key);
      }
      resolve((request.result as VideoMetadata) ?? null);
    };
    request.onerror = () => {
      console.error("❌ [IDB] Error retrieving ID:", key, request.error);
      reject(request.error);
    };
  });
};

// ✅ return array of VideoMetadata
export const getAllVideos = async (): Promise<VideoMetadata[]> => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as VideoMetadata[]);
    request.onerror = () => reject(request.error);
  });
};

export const deleteVideoFromIndexedDB = async (id: string): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  store.delete(id);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      console.log(`🗑️ Deleted video ${id} from IndexedDB`);
      window.dispatchEvent(new Event("video-db-updated")); // optional refresh event
      resolve();
    };
    tx.onerror = () => {
      console.error("❌ Failed to delete video:", tx.error);
      reject(tx.error);
    };
  });
};

export const clearAllVideosFromIndexedDB = async (): Promise<void> => {
  console.log(
    "%c🧹 [IDB] Clearing all videos from IndexedDB...",
    "color: orange; font-weight: bold;",
  );

  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  store.clear(); // ✅ removes everything in the "videos" object store

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      console.log(
        "%c✅ [IDB] All videos cleared from IndexedDB.",
        "color: #00cc88; font-weight: bold;",
      );
      window.dispatchEvent(new Event("video-db-updated")); // 🔁 optional UI sync trigger
      resolve();
    };
    tx.onerror = () => {
      console.error("❌ [IDB] Failed to clear all videos:", tx.error);
      reject(tx.error);
    };
  });
};
