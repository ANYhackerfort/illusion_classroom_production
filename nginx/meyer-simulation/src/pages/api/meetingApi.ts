import axiosClient from "../../api/axiosClient";
import type { VideoSegmentData } from "../../types/QuestionCard";

export const fetchUserEmail = async (): Promise<string> => {
  const response = await axiosClient.get<{ email: string }>(
    "/api/auth/userinfo/",
    {
      withCredentials: true,
    },
  );
  return response.data.email;
};

export interface CreateMeetingPayload {
  name: string;
  imageUrl: string;
  description: string;
  questionsCount: number;
  videoLengthSec: number;
  tags: string[];
  sharedWith?: string[];
  VideoSegments?: any[]; // type more specifically if needed
}

export const createMeeting = async (payload: CreateMeetingPayload) => {
  const response = await axiosClient.post(
    "/api/auth/create_meeting/",
    payload,
    {
      withCredentials: true, // send session cookie
    },
  );
  return response.data;
};

interface BackendMeeting {
  name: string;
  imageUrl: string;
  description: string;
  questionsCount: number;
  videoLengthSec: number;
  tags: string[];
  createdAt: string;
  ownerEmail: string;
  sharedWith: string[];
}

export const fetchUserMeetings = async (): Promise<{
  meetings: BackendMeeting[];
}> => {
  const response = await axiosClient.get("/api/auth/get_user_meetings/", {
    withCredentials: true,
  });
  return response.data;
};

export const archiveMeeting = async (
  meetingName: string
): Promise<{ message: string }> => {
  const response = await axiosClient.post(
    `/api/auth/archieve_meeting/${encodeURIComponent(meetingName)}/`,
    {},
    { withCredentials: true }
  );
  return response.data;
};

export const unarchiveMeeting = async (
  meetingName: string
): Promise<{ message: string }> => {
  const response = await axiosClient.post(
    `/api/auth/unarchieve_meeting/${encodeURIComponent(meetingName)}/`,
    {},
    { withCredentials: true }
  );
  return response.data;
};

export const deleteMeeting = async (
  meetingName: string
): Promise<{ message: string }> => {
  const response = await axiosClient.post(
    `/api/auth/delete_meeting/${encodeURIComponent(meetingName)}/`,
    {},
    { withCredentials: true }
  );
  return response.data;
};

interface ServerResponse {
  meetingName: string;
  meetingLink: string;
  segments: {
    sourceStart: number;
    sourceEnd: number;
    isQuestionCard: boolean;
    questionCard?: {
      id: string;
      question: string;
      answers: string[];
      difficulty: string;
      type: string;
      displayType?: "face" | "initial" | "anonymous";
      showWinner?: boolean;
      live?: boolean;
    };
  }[];
}

export const fetchVideoSegments = async (
  meetingName: string,
): Promise<VideoSegmentData[]> => {
  const response = await axiosClient.get<ServerResponse>(
    `/api/auth/get_meeting_segments/${encodeURIComponent(meetingName)}/`,
    {
      withCredentials: true,
    },
  );

  return response.data.segments.map((seg, index) => {
    const base: VideoSegmentData = {
      id: `segment-${index}`,
      source: [seg.sourceStart, seg.sourceEnd],
      isQuestionCard: seg.isQuestionCard, // ✅ now always defined
    };
    console.log(seg.questionCard);
    if (seg.questionCard) {
      base.questionCardData = {
        id: seg.questionCard.id,
        question: seg.questionCard.question,
        answers: seg.questionCard.answers,
        difficulty: seg.questionCard.difficulty as "easy" | "medium" | "hard",
        type: seg.questionCard.type as
          | "slider"
          | "short"
          | "mc"
          | "match"
          | "rank"
          | "ai",
        displayType: seg.questionCard.displayType as
          | "face"
          | "initial"
          | "anonymous"
          | undefined,
        showWinner: seg.questionCard.showWinner ?? undefined,
        live: seg.questionCard.live ?? undefined,
      };
    }

    return base;
  });
};

export const fetchBufferedVideo = async (url: string): Promise<string> => {
  // Keep trying until file is available
  for (let i = 0; i < 10; i++) {
    try {
      console.log(`🔁 Attempt ${i + 1} to fetch HEAD from ${url}`);
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) {
        console.log("✅ Video file found!");
        return url;
      } else {
        console.log(`❌ Got status: ${res.status}`);
      }
    } catch (err) {
      console.warn(`⚠️ Error during fetch attempt ${i + 1}`, err);
    }
    await new Promise((res) => setTimeout(res, 500));
  }

  throw new Error("Buffered video file not found after 5s of retrying.");
};

export const checkMeetingAccess = async (
  meetingId: string,
  userEmail?: string,
): Promise<{ admin_access: boolean; participant_access: boolean }> => {
  const url = userEmail
    ? `/api/auth/check_access/${meetingId}/?email=${encodeURIComponent(userEmail)}`
    : `/api/auth/check_access/${meetingId}/`;

  const response = await axiosClient.get<{
    admin_access: boolean;
    participant_access: boolean;
  }>(url, {
    withCredentials: true,
  });

  return response.data;
};

// ✅ unchanged: still just returns currently playing URL
export const getCurrentlyPlayingUrl = async (
  meetingName: string,
): Promise<{ currently_playing: string | null }> => {
  const response = await axiosClient.get<{ currently_playing: string | null }>(
    `/api/auth/get_currently_playing/${encodeURIComponent(meetingName)}/`,
    {
      withCredentials: true,
    },
  );
  return response.data;
};

export interface AddParticipantPayload {
  name: string;
  participantEmail: string;
  ownerEmail: string;
  picture?: File;
  answers?: string[];
}

export const addParticipant = async (
  meetingName: string,
  payload: AddParticipantPayload
) => {
  const formData = new FormData();
  formData.append("name", payload.name);
  formData.append("participant_email", payload.participantEmail);
  formData.append("owner_email", payload.ownerEmail);

  if (payload.picture) {
    formData.append("picture", payload.picture);
  }
  if (payload.answers) {
    formData.append("answers", JSON.stringify(payload.answers));
  }

  const response = await axiosClient.post(
    `/api/auth/add_participant/${encodeURIComponent(meetingName)}/`,
    formData,
    {
      withCredentials: true,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};
