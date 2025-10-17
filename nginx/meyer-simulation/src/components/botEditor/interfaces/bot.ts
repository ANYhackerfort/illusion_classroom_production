export interface Bot {
  id: string;
  name: string;
  videoThumbnail: string;
  memory: string;
  answer_select: string[];
}

export const generateVideoThumbnail = (
  file: File,
  seekToSec = 1,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.src = URL.createObjectURL(file);

    const cleanup = () => URL.revokeObjectURL(video.src);

    video.onloadedmetadata = () => {
      const t = Math.min(
        Math.max(seekToSec, 0),
        Math.max(0, (video.duration || 1) - 0.1),
      );
      video.currentTime = t;
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      const w = video.videoWidth || 320;
      const h = video.videoHeight || 180;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        cleanup();
        reject(new Error("Canvas 2D context not available"));
        return;
      }
      ctx.drawImage(video, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/png"); // or "image/jpeg" for smaller size
      cleanup();
      resolve(dataUrl);
    };

    video.onerror = (e) => {
      cleanup();
      reject(e);
    };
  });
};
