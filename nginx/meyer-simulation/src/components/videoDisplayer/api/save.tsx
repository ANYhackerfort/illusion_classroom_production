import axiosClient from "../../../api/axiosClient";
import type { VideoSegmentData } from "../../../types/QuestionCard";
import { Survey } from "../../../finder/editedVideoStorage/SurveyDropZone";

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

export const uploadVideoMetadata = async (
  meetingName: string,
  videoFile: File,
  tags: string[] = [],
): Promise<{
  video_id: string;
  storage_path: string;
  description: string;
}> => {
  const formData = new FormData();
  formData.append("video_file", videoFile);
  formData.append("video_name", videoFile.name);
  formData.append("tags", JSON.stringify(tags));

  try {
    const response = await axiosClient.post(
      `/api/auth/store_video/${encodeURIComponent(meetingName)}/`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        withCredentials: true,
      }
    );

    console.log("✅ Video metadata and file uploaded:", response.data);
    return response.data;
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
      }
    );

    console.log("✅ Currently playing URL updated:", response.data.message);
  } catch (err) {
    console.error("❌ Failed to update currently playing URL:", err);
    throw err;
  }
};

export const saveSurveyToBackend = async (
  meetingName: string,
  survey: Survey
): Promise<void> => {
  try {
    const response = await axiosClient.post(
      `/api/auth/save_survey/${encodeURIComponent(meetingName)}/`,
      {
        id: survey.id,
        items: survey.items,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      }
    );

    console.log("✅ Survey saved:", response.data);
  } catch (err) {
    console.error("❌ Failed to save survey:", err);
    throw err;
  }
};

export const getSurveyFromBackend = async (
  meetingName: string,
  surveyId: string
): Promise<Survey> => {
  try {
    const response = await axiosClient.get(
      `/api/auth/get_survey/${encodeURIComponent(meetingName)}/${encodeURIComponent(surveyId)}/`,
      {
        withCredentials: true,
      }
    );

    console.log("✅ Survey retrieved:", response.data.survey);

    const { id, items } = response.data.survey;
    return new Survey(id, items);
  } catch (err) {
    console.error("❌ Failed to get survey:", err);
    throw err;
  }
};