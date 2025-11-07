export interface BotAnswer {
  question_id: string | number;
  answers: string[];
  answer_time: number;
}

export interface Bot {
  id: string; // unique identifier (backend "identifier")
  name: string;
  memory: string;
  answers: BotAnswer[]; // ✅ updated to use structured answers
  image_url: string; // generated from backend (ffmpeg)
  video_url: string | null; // video URL stored on backend
  associated_meeting_id: string | number; // required meeting link
}
