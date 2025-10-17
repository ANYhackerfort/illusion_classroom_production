export interface Bot {
  id: string; // unique identifier (backend "identifier")
  name: string;
  memory: string;
  answer_select: string[];
  image_url: string; // generated from backend (ffmpeg)
  video_url: string | null; // video URL stored on backend
  associated_meeting_id: string | number; // ✅ required meeting link
}
