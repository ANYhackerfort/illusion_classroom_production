import axiosClient from "../../../api/axiosClient";
import type { VideoSegmentData } from "../../../types/QuestionCard";
import { Survey } from "../../../indexDB/surveyStorage";
import type { VideoMetadata } from "../../../indexDB/videoStorage";
import type { QuestionCardData } from "../../../types/QuestionCard";

export const uploadVideoSegments = async (
  meetingName: string,
  segments: VideoSegmentData[],
): Promise<void> => {
  try {
    const response = await axiosClient.post(
      `/api/auth/upload_meeting_segments/${encodeURIComponent(meetingName)}/`,
      {
        VideoSegments: segments, // 👈 Must match backend expected key
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true, // ✅ If you're using login session/cookies
      },
    );

    console.log("✅ Segments uploaded:", response.data.message);
  } catch (err) {
    console.error("❌ Segment upload failed:", err);
    throw err;
  }
};

interface BackendVideoResponse {
  id: number | string;
  videoName: string;
  videoTags: string[];
  videoLength: number;
  questionCards: VideoSegmentData[];
  savedAt: string;
  videoUrl: string;
  organization_id: string | number;
  individual: boolean;
  thumbnail_url?: string | null;
  associated_meeting_id?: string | number | null;
}

export const getUserVideos = async (
  org_id: number,
  meetingName: string,
): Promise<VideoMetadata[]> => {
  try {
    const response = await axiosClient.get(
      `/api/auth/get_user_videos/${encodeURIComponent(org_id)}/${encodeURIComponent(meetingName)}/`,
      { withCredentials: true },
    );

    console.log("✅ Retrieved user videos:", response.data);

    return (response.data.videos as BackendVideoResponse[]).map((v) => ({
      id: String(v.id),
      videoName: v.videoName,
      videoTags: v.videoTags,
      videoLength: v.videoLength,
      questionCards: v.questionCards,
      savedAt: v.savedAt,
      videoUrl: v.videoUrl,
      organization_id: String(v.organization_id), // ✅ ensures consistent typing
      individual: v.individual,
      thumbnail_url: v.thumbnail_url ?? null,
      associated_meeting_id: String(v.associated_meeting_id ?? ""), // ✅ added
    }));
  } catch (err) {
    console.error("❌ Failed to retrieve user videos:", err);
    throw err;
  }
};

export const getOrgVideos = async (
  org_id: number,
): Promise<VideoMetadata[]> => {
  try {
    const response = await axiosClient.get(
      `/api/auth/get_org_videos/${encodeURIComponent(org_id)}/`,
      { withCredentials: true },
    );

    console.log("🏢 Retrieved org videos:", response.data);

    return (response.data.videos as BackendVideoResponse[]).map((v) => ({
      id: String(v.id),
      videoName: v.videoName,
      videoTags: v.videoTags,
      videoLength: v.videoLength,
      questionCards: v.questionCards,
      savedAt: v.savedAt,
      videoUrl: v.videoUrl,
      organization_id: String(v.organization_id),
      individual: v.individual,
      thumbnail_url: v.thumbnail_url ?? null,
      associated_meeting_id: String(v.associated_meeting_id ?? ""), // ✅ added
    }));
  } catch (err) {
    console.error("❌ Failed to retrieve org videos:", err);
    throw err;
  }
};

export const uploadVideoMetadata = async (
  org_id: number,
  meetingName: string,
  videoFile: File,
  tags: string[] = [],
): Promise<{
  video_id: string;
  video_name: string;
  video_url: string;
  thumbnail_url: string | null;
  duration: number;
  description: string;
  meeting_id: string | null;
}> => {
  const formData = new FormData();
  formData.append("video_file", videoFile);
  formData.append("video_name", videoFile.name);
  formData.append("tags", JSON.stringify(tags));

  try {
    const response = await axiosClient.post(
      `/api/auth/store_video/${encodeURIComponent(org_id)}/${encodeURIComponent(meetingName)}/`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      },
    );

    console.log("✅ Video metadata and file uploaded:", response.data);

    // ✅ Map to actual backend field names
    return {
      video_id: String(response.data.video_id),
      video_name: response.data.name, // backend returns "name"
      video_url: response.data.video_url ?? "", // full public URL
      thumbnail_url: response.data.thumbnail_url ?? null,
      duration: Number(response.data.duration ?? 0),
      description: response.data.description ?? "",
      meeting_id: response.data.meeting_id
        ? String(response.data.meeting_id)
        : null,
    };
  } catch (err) {
    console.error("❌ Video upload failed:", err);
    throw err;
  }
};

export const setCurrentlyPlayingUrl = async (
  meetingName: string,
  url: string,
): Promise<void> => {
  try {
    const response = await axiosClient.post(
      `/api/auth/store_currently_playing/${encodeURIComponent(meetingName)}/`,
      {
        url, // 👈 Must match backend expected key
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      },
    );

    console.log("✅ Currently playing URL updated:", response.data.message);
  } catch (err) {
    console.error("❌ Failed to update currently playing URL:", err);
    throw err;
  }
};

export const deleteVideo = async (videoId: string): Promise<void> => {
  try {
    const response = await axiosClient.delete(
      `/api/auth/delete_video/${encodeURIComponent(videoId)}/`,
      {
        withCredentials: true,
      },
    );

    console.log("🗑️ Video deleted successfully:", response.data.message);
  } catch (err) {
    console.error("❌ Failed to delete video:", err);
    throw err;
  }
};

export const editVideo = async (
  org_id: number,
  roomName: string,
  videoId: string,
  segments: VideoSegmentData[],
  name: string,
  tags: string[],
): Promise<string | null> => {
  try {
    const lastEdited = new Date().toISOString();

    const payload = {
      VideoSegments: segments,
      lastEdited,
      name,
      tags,
    };

    const response = await axiosClient.post(
      `/api/auth/edit_video/${encodeURIComponent(videoId)}/${encodeURIComponent(org_id)}/${encodeURIComponent(roomName)}/`,
      payload,
      {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      },
    );

    const updatedTime = response.data?.lastEdited || lastEdited;
    console.log(`✅ Video ${videoId} updated successfully at:`, updatedTime);

    return updatedTime;
  } catch (err) {
    console.error("❌ Failed to update video segments:", err);
    return null;
  }
};

export const getVideoByIdFromBackend = async (
  videoId: string,
): Promise<VideoMetadata | null> => {
  try {
    const response = await axiosClient.get(
      `/api/auth/get_video_by_id/${encodeURIComponent(videoId)}/`,
      { withCredentials: true },
    );

    const v = response.data.video;
    if (!v) return null;

    const metadata: VideoMetadata = {
      id: String(v.id),
      videoName: v.videoName,
      videoTags: v.videoTags,
      videoLength: v.videoLength,
      questionCards: v.questionCards,
      savedAt: v.savedAt,
      videoUrl: v.videoUrl,
      organization_id: String(v.organization_id),
      individual: v.individual,
      thumbnail_url: v.thumbnail_url ?? null,
      associated_meeting_id: String(v.associated_meeting_id ?? ""), // ✅ added
    };

    console.log("✅ Retrieved video metadata:", metadata);
    return metadata;
  } catch (err) {
    console.error("❌ Failed to get video by ID:", err);
    return null;
  }
};

export const getMeetingId = async (
  org_id: number,
  roomName: string,
): Promise<string | null> => {
  try {
    const response = await axiosClient.get(
      `/api/auth/get_meeting_id/${encodeURIComponent(org_id)}/${encodeURIComponent(roomName)}/`,
      { withCredentials: true },
    );

    const { meeting_id } = response.data;
    console.log(`✅ Retrieved meeting ID for ${roomName}:`, meeting_id);
    return meeting_id;
  } catch (err) {
    console.error("❌ Failed to get meeting ID:", err);
    return null;
  }
};

export interface CreatedQuestionResponse {
  message: string;
  question_id: number;
  meeting_id: number;
  organization_id: number;
}

/**
 * Save a question card to the backend for a given org + meeting.
 */
export const saveQuestionToBackend = async (
  org_id: number,
  meeting_id: number,
  questionData: Omit<QuestionCardData, "id">, // no id since Django generates it
): Promise<CreatedQuestionResponse> => {
  try {
    const response = await axiosClient.post<CreatedQuestionResponse>(
      `/api/auth/create_question_card/${encodeURIComponent(org_id)}/${encodeURIComponent(meeting_id)}/`,
      {
        question: questionData.question,
        answers: questionData.answers,
        difficulty: questionData.difficulty,
        type: questionData.type,
        displayType: questionData.displayType,
        showWinner: questionData.showWinner,
        live: questionData.live,
        correctAnswers: questionData.correctAnswer,
      },
      { withCredentials: true },
    );

    console.log("✅ Saved question to backend:", response.data);
    return response.data;
  } catch (err) {
    console.error("❌ Failed to save question to backend:", err);
    throw err;
  }
};

export const getAllQuestionCards = async (org_id: number) => {
  const response = await axiosClient.get(
    `/api/auth/get_all_question_cards/${encodeURIComponent(org_id)}/`,
    { withCredentials: true },
  );

  console.log("🧠 Retrieved QuestionCards:", response.data);

  // ✅ Normalize backend → frontend naming
  return response.data.questions.map((q: any) => ({
    ...q,
    correctAnswers: q.correctAnswers ?? [],
  }));
};

export const deleteQuestionCard = async (questionId: string | number) => {
  try {
    const response = await axiosClient.delete(
      `/api/auth/delete_question_card/${encodeURIComponent(questionId)}/`,
      { withCredentials: true },
    );

    console.log(`🗑️ Deleted QuestionCard ${questionId}:`, response.data);
    return response.data;
  } catch (err) {
    console.error(`❌ Failed to delete QuestionCard ${questionId}:`, err);
    throw err;
  }
};

export const getQuestionCardById = async (questionId: string | number) => {
  const response = await axiosClient.get(
    `/api/auth/get_question_card_by_id/${encodeURIComponent(questionId)}/`,
    { withCredentials: true },
  );

  console.log(`🧠 Retrieved QuestionCard ${questionId}:`, response.data);

  return {
    ...response.data,
    correctAnswers: response.data.correctAnswers ?? [],
  };
};

// ====== Types ======

export interface CreatedSurveyResponse {
  message: string;
  survey_id: string;
  meeting_id: number;
  organization_id: number;
}

// ====== API FUNCTIONS ======

// ✅ Create a new Survey on backend
export const saveSurveyToBackend = async (
  org_id: number,
  meeting_id: number,
  survey: Survey,
): Promise<CreatedSurveyResponse> => {
  try {
    const response = await axiosClient.post<CreatedSurveyResponse>(
      `/api/auth/create_survey/${encodeURIComponent(org_id)}/${encodeURIComponent(meeting_id)}/`,
      {
        items: survey.items, // directly send SurveyItem[] JSON
      },
      { withCredentials: true },
    );

    console.log("✅ Saved survey to backend:", response.data);
    return response.data;
  } catch (err) {
    console.error("❌ Failed to save survey to backend:", err);
    throw err;
  }
};

// ✅ Get all surveys for organization
export const getAllSurveysFromBackend = async (
  org_id: number,
): Promise<Survey[]> => {
  try {
    const response = await axiosClient.get(
      `/api/auth/get_all_surveys/${encodeURIComponent(org_id)}/`,
      { withCredentials: true },
    );

    console.log("🧠 Retrieved Surveys:", response.data);

    // ✅ Each survey from backend should include `meeting_id`
    return response.data.surveys.map((s: any) => {
      const associatedMeetingId =
        s.meeting_id ?? s.associated_meeting_id ?? null;
      return new Survey(String(s.id), s.items ?? [], associatedMeetingId);
    });
  } catch (err) {
    console.error("❌ Failed to fetch surveys:", err);
    throw err;
  }
};

// ✅ Get a single survey by ID
export const getSurveyById = async (
  surveyId: string | number,
): Promise<Survey> => {
  try {
    const response = await axiosClient.get(
      `/api/auth/get_survey_by_id/${encodeURIComponent(surveyId)}/`,
      { withCredentials: true },
    );

    console.log(`🧠 Retrieved Survey ${surveyId}:`, response.data);
    const s = response.data;

    // ✅ Pass meeting_id as associated_meeting_id
    const associatedMeetingId = s.meeting_id ?? null;

    return new Survey(String(s.id), s.items ?? [], associatedMeetingId);
  } catch (err) {
    console.error(`❌ Failed to fetch Survey ${surveyId}:`, err);
    throw err;
  }
};

// ✅ Delete a survey by ID
export const deleteSurvey = async (
  surveyId: string | number,
): Promise<void> => {
  try {
    const response = await axiosClient.delete(
      `/api/auth/delete_survey/${encodeURIComponent(surveyId)}/`,
      { withCredentials: true },
    );

    console.log(`🗑️ Deleted Survey ${surveyId}:`, response.data);
  } catch (err) {
    console.error(`❌ Failed to delete Survey ${surveyId}:`, err);
    throw err;
  }
};

interface ActiveMeetingUpdate {
  active_bot_ids?: number[] | "djsut";
  active_video_id?: number | null | "djsut";
  active_survey_id?: number | null | "djsut";
}

export const updateActiveMeeting = async (
  orgId: number,
  roomName: string,
  updateData: ActiveMeetingUpdate = {},
): Promise<void> => {
  try {
    const response = await axiosClient.post(
      `/api/auth/update_active_meeting/${encodeURIComponent(orgId)}/${encodeURIComponent(roomName)}/`,
      updateData,
      { withCredentials: true },
    );

    console.log(
      `✅ Active meeting updated for org ${orgId}, room ${roomName}:`,
      response.data,
    );
  } catch (err) {
    console.error(
      `❌ Failed to update active meeting for org ${orgId}, room ${roomName}:`,
      err,
    );
    throw err;
  }
};

export const resetVideoState = async (
  orgId: number,
  roomName: string,
): Promise<void> => {
  try {
    const response = await axiosClient.post(
      `/api/auth/reset_video_state/${encodeURIComponent(orgId)}/${encodeURIComponent(roomName)}/`,
      {}, // no body needed
      { withCredentials: true },
    );

    console.log(
      `🔴 Video state reset for org ${orgId}, room ${roomName}:`,
      response.data,
    );
  } catch (err) {
    console.error(
      `❌ Failed to reset video state for org ${orgId}, room ${roomName}:`,
      err,
    );
    throw err;
  }
};

/**
 * Pause the video playback.
 * Sets stopped = true (keeps current time) and broadcasts to everyone.
 */
export const pauseVideoState = async (
  orgId: number,
  roomName: string,
): Promise<void> => {
  try {
    const response = await axiosClient.post(
      `/api/auth/pause_video_state/${encodeURIComponent(orgId)}/${encodeURIComponent(roomName)}/`,
      {},
      { withCredentials: true },
    );

    console.log(
      `⏸️ Video paused for org ${orgId}, room ${roomName}:`,
      response.data,
    );
  } catch (err) {
    console.error(
      `❌ Failed to pause video for org ${orgId}, room ${roomName}:`,
      err,
    );
    throw err;
  }
};

/**
 * Start or resume the video playback.
 * Sets stopped = false (keeps current time) and broadcasts to everyone.
 */
export const startVideoState = async (
  orgId: number,
  roomName: string,
): Promise<void> => {
  try {
    const response = await axiosClient.post(
      `/api/auth/start_video_state/${encodeURIComponent(orgId)}/${encodeURIComponent(roomName)}/`,
      {},
      { withCredentials: true },
    );

    console.log(
      `▶️ Video started for org ${orgId}, room ${roomName}:`,
      response.data,
    );
  } catch (err) {
    console.error(
      `❌ Failed to start video for org ${orgId}, room ${roomName}:`,
      err,
    );
    throw err;
  }
};

export interface ActiveMeetingData {
  org_id: number;
  room_name: string;
  active_video_id: number | null;
  active_survey_id: number | null;
  active_bot_ids: number[];
  last_updated: string;
  video_url: string;
  video_segments: VideoSegmentData[];
}

export const getActiveMeetingWithSegments = async (
  orgId: number,
  roomName: string,
): Promise<ActiveMeetingData | null> => {
  try {
    const response = await axiosClient.get(
      `/api/auth/get_active_meeting_with_segments/${encodeURIComponent(orgId)}/${encodeURIComponent(roomName)}/`,
      { withCredentials: true },
    );

    console.log(response);

    const { data, message } = response.data;

    if (message === "none found") {
      console.warn(
        `⚠️ No active meeting found for org ${orgId}, room ${roomName}`,
      );
      return null;
    }

    // 🔁 Transform backend segments to frontend format
    const videoSegments: VideoSegmentData[] = (data.video_segments || []).map(
      (seg: any) => ({
        id: String(seg.id),
        source: [seg.source_start, seg.source_end],
        isQuestionCard: !!seg.question_card,
        questionCardData: seg.question_card
          ? {
              id: String(seg.question_card.id),
              question: seg.question_card.question,
              answers: seg.question_card.answers || [],
              difficulty: seg.question_card.difficulty,
              type: seg.question_card.type,
              displayType: seg.question_card.display_type ?? undefined,
              showWinner: seg.question_card.show_winner ?? undefined,
              live: seg.question_card.live ?? undefined,
              correctAnswer: seg.question_card.correct_answers ?? undefined,
            }
          : undefined,
      }),
    );

    const transformedData: ActiveMeetingData = {
      org_id: data.org_id,
      room_name: data.room_name,
      active_video_id: data.active_video_id,
      active_survey_id: data.active_survey_id,
      active_bot_ids: data.active_bot_ids,
      last_updated: data.last_updated,
      video_url: data.video_url,
      video_segments: videoSegments,
    };

    console.log(
      `📦 Active meeting with segments fetched for org ${orgId}, room ${roomName}:`,
      transformedData,
    );

    return transformedData;
  } catch (err) {
    console.error(
      `❌ Failed to fetch active meeting for org ${orgId}, room ${roomName}:`,
      err,
    );
    throw err;
  }
};

export const getVideoState = async (
  orgId: number,
  roomName: string,
): Promise<{
  stopped: boolean;
  current_time: number;
  last_updated: string;
}> => {
  const response = await axiosClient.get(
    `/api/auth/get_video_state/${encodeURIComponent(orgId)}/${encodeURIComponent(roomName)}/`,
    { withCredentials: true },
  );
  return response.data.data;
};

export const updateVideoState = async (
  orgId: number,
  roomName: string,
  payload: { stopped?: boolean; current_time?: number },
): Promise<{
  message: string;
  data: { stopped: boolean; current_time: number; last_updated: string };
}> => {
  const response = await axiosClient.post(
    `/api/auth/update_video_state/${encodeURIComponent(orgId)}/${encodeURIComponent(roomName)}/`,
    payload,
    { withCredentials: true },
  );
  return response.data;
};

export const updateFinalState = async (
  orgId: number,
  roomName: string,
  payload: { survey_id: number | string },
): Promise<{
  message: string;
  data: {
    org_id: number;
    room_name: string;
    active_survey_id: number | string;
    active_video_id: number | string | null;
    active_bot_ids: (number | string)[];
    last_updated: string;
  };
}> => {
  const response = await axiosClient.post(
    `/api/auth/update_final_state/${encodeURIComponent(orgId)}/${encodeURIComponent(roomName)}/`,
    payload,
    { withCredentials: true },
  );
  return response.data;
};

export const stopMeetingComplete = async (
  orgId: number,
  roomName: string,
): Promise<{
  message: string;
  data: {
    org_id: number;
    room_name: string;
    active_survey_id: number | string | null;
    active_video_id: number | string | null;
    active_bot_ids: (number | string)[];
    ended: boolean;
    last_updated: string;
  };
}> => {
  const response = await axiosClient.post(
    `/api/auth/stop_meeting_complete/${encodeURIComponent(orgId)}/${encodeURIComponent(roomName)}/`,
    {}, // no payload needed
    { withCredentials: true },
  );
  return response.data;
};

export const getActiveSurveyId = async (
  orgId: number,
  roomName: string
): Promise<{
  message: string;
  active_survey_id: string | number | null;
}> => {
  const response = await axiosClient.get(
    `/api/auth/get_active_survey_id/${encodeURIComponent(orgId)}/${encodeURIComponent(roomName)}/`,
    { withCredentials: true }
  );
  return response.data;
};

export const startMeeting = async (
  orgId: number,
  roomName: string,
): Promise<{
  message: string;
  data: {
    org_id: number;
    room_name: string;
    active_bot_ids: number[];
    active_video_id: number | null;
    active_survey_id: string | null;
    ended: boolean;
    last_updated: string;
  };
}> => {
  try {
    const response = await axiosClient.post(
      `/api/auth/start_meeting_again/${encodeURIComponent(orgId)}/${encodeURIComponent(roomName)}/`,
      {},
      { withCredentials: true },
    );
    console.log("🟩 [start_meeting] Success:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ [start_meeting] Error:", error);
    throw error;
  }
};

export const getMeetingState = async (orgId: number, roomName: string) => {
  try {
    const response = await axiosClient.get(
      `/api/auth/get_meeting_state/${encodeURIComponent(orgId)}/${encodeURIComponent(roomName)}/`,
      { withCredentials: true },
    );
    console.log("🟢 [get_meeting_state]:", response.data);
    return response.data;
  } catch (err) {
    console.error("❌ [get_meeting_state] Error:", err);
    return { ended: true, exists: false };
  }
};

export const storeQualtricSurveyAnswers = async (
  orgId: number,
  meetingName: string,
  participantName: string,
  answers: Record<string, any>,
): Promise<{ ok: boolean; message: string }> => {
  try {
    const response = await axiosClient.post(
      `/api/auth/store_quatric_survey_answers/${encodeURIComponent(orgId)}/${encodeURIComponent(meetingName)}/`,
      {
        participant_name: participantName,
        answers,
      },
      { withCredentials: true },
    );
    return response.data;
  } catch (error: any) {
    console.error("❌ Failed to store Qualtrics survey answers:", error);
    return { ok: false, message: error.message || "Request failed" };
  }
};

export const getAllQualtricSurveyAnswers = async (
  orgId: number,
  meetingName: string,
): Promise<{
  ok: boolean;
  participants?: Array<{
    participant: string;
    count: number;
    answers: {
      timestamp: string;
      answers: Record<string, any>;
    }[];
  }>;
  message?: string;
}> => {
  try {
    const response = await axiosClient.get(
      `/api/auth/get_all_quatric_survey_answers/${encodeURIComponent(orgId)}/${encodeURIComponent(meetingName)}/`,
      { withCredentials: true },
    );
    return response.data;
  } catch (error: any) {
    console.error("❌ Failed to fetch Qualtrics survey answers:", error);
    return { ok: false, message: error.message || "Request failed" };
  }
};

export const storeVideoQuestionAnswers = async (
  orgId: number,
  roomName: string,
  questionId: string | number,
  participantName: string,
  answers: Record<string, any>,
): Promise<{ ok: boolean; message: string }> => {
  try {
    const response = await axiosClient.post(
      `/api/auth/store_video_question_answers/${encodeURIComponent(orgId)}/${encodeURIComponent(roomName)}/${encodeURIComponent(questionId)}/`,
      {
        participant_name: participantName,
        answers,
      },
      { withCredentials: true },
    );
    return response.data;
  } catch (error: any) {
    console.error("❌ Failed to store video question answers:", error);
    return { ok: false, message: error.message || "Request failed" };
  }
};

export const getAllVideoQuestionAnswers = async (
  orgId: number,
  roomName: string
): Promise<any> => {
  try {
    const response = await axiosClient.get(
      `/api/auth/get_all_video_question_answers/${encodeURIComponent(orgId)}/${encodeURIComponent(roomName)}/`,
      { withCredentials: true },
    );
    console.log("🎬 [get_all_video_question_answers]", response.data);
    return response.data;
  } catch (error: any) {
    console.error("❌ Failed to fetch video question answers:", error);
    return { ok: false, participants: [] };
  }
};

// 🧩 Individual bot answer entry
export interface BotAnswerEntry {
  question_id: number;
  question: string | null; // resolved by backend
  type: string | null; // e.g. "mc", "short", etc.
  answers: string[];
  answer_time: number | null; // in seconds
}

// 🧠 Each bot with its answers
export interface BotWithAnswers {
  id: number;
  name: string;
  image_url: string | null;
  memory?: string | null;
  video_url?: string | null;
  organization_id?: number | null;
  meeting_id?: number | null;
  answers: BotAnswerEntry[];
}

// 🌐 Full API response
export interface GetBotAnswersResponse {
  bots: BotWithAnswers[];
}

// 📡 API call
export const getBotAnswers = async (
  org_id: number,
  roomName: string
): Promise<GetBotAnswersResponse> => {
  try {
    console.log(`📡 Fetching bot answers for org=${org_id}, room=${roomName}`);

    const response = await axiosClient.get<GetBotAnswersResponse>(
      `/api/auth/get_bot_answers/${encodeURIComponent(org_id)}/${encodeURIComponent(roomName)}/`,
      { withCredentials: true }
    );

    console.log("✅ Bot answers response:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Failed to fetch bot answers:", error);
    throw error;
  }
};