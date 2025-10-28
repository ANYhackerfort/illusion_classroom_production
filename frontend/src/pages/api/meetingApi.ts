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

export const createMeeting = async (
  payload: CreateMeetingPayload,
  selectedOrg: number,
) => {
  const response = await axiosClient.post(
    `/api/auth/create_meeting/${selectedOrg}/`, // ✅ attach org id to URL
    payload,
    {
      withCredentials: true, // send session cookie
    },
  );
  return response.data;
};

export interface UserStats {
  userEmail: string;
  totalMeetings: number;
  meetingDates: string[];
  totalVideoLengthSec: number;
  averageVideoLengthSec: number;
  totalCollaborators: number;
  membershipStart: string | null;
  membershipDurationDays: number;
}

export const getUserStats = async (): Promise<UserStats> => {
  const response = await axiosClient.get("/api/auth/get_user_stats/", {
    withCredentials: true,
  });
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
  currentPlaying: boolean;
}

export const fetchOrgMeetings = async (
  orgId: number,
): Promise<{ meetings: BackendMeeting[] }> => {
  const response = await axiosClient.get(
    `/api/auth/get_org_meetings/${orgId}/`,
    {
      withCredentials: true,
    },
  );
  return response.data;
};

export const fetchArchivedMeetings = async (): Promise<{
  meetings: BackendMeeting[];
}> => {
  const response = await axiosClient.get(
    "/api/auth/get_user_archieved_meetings/",
    {
      withCredentials: true,
    },
  );
  return { meetings: response.data.archivedMeetings };
};

export const archiveMeeting = async (
  orgId: number,
  meetingName: string,
): Promise<{ message: string }> => {
  const response = await axiosClient.post(
    `/api/auth/archive_meeting/${orgId}/${encodeURIComponent(meetingName)}/`,
    {},
    { withCredentials: true },
  );
  return response.data;
};

export const unarchiveMeeting = async (
  orgId: number,
  meetingName: string,
): Promise<{ message: string }> => {
  const response = await axiosClient.post(
    `/api/auth/unarchive_meeting/${orgId}/${encodeURIComponent(meetingName)}/`,
    {},
    { withCredentials: true },
  );
  return response.data;
};

export const deleteMeeting = async (
  orgId: number,
  meetingName: string,
): Promise<{ message: string }> => {
  const response = await axiosClient.post(
    `/api/auth/delete_meeting/${orgId}/${encodeURIComponent(meetingName)}/`,
    {},
    { withCredentials: true },
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
  orgId: number,
  meetingId: string,
  userEmail?: string,
): Promise<{ admin_access: boolean; participant_access: boolean }> => {
  const url = userEmail
    ? `/api/auth/check_access/${orgId}/${encodeURIComponent(meetingId)}/?email=${encodeURIComponent(userEmail)}`
    : `/api/auth/check_access/${orgId}/${encodeURIComponent(meetingId)}/`;

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

export interface JoinRoomPayload {
  ownerEmail: string;
  name: string;
}

export const joinRoom = async (
  orgId: number,
  meetingName: string,
  payload: JoinRoomPayload,
) => {
  const response = await axiosClient.post(
    `/api/auth/join-room/${orgId}/${encodeURIComponent(meetingName)}/`,
    {
      owner_email: payload.ownerEmail,
      name: payload.name,
    },
    {
      withCredentials: true, // ✅ important so Django sets the cookie
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  return response.data; // ✅ returns { ok, message, redis_key }
};

// ORGANIZATIONS
export interface Organization {
  id: number;
  name: string;
  description: string;
  created_at: string;
  image_url: string | null;
  owner_email: string;
}

export interface GetOrganizationsResponse {
  organizations: Organization[];
}

export const getOrganizations = async (): Promise<Organization[]> => {
  const response = await axiosClient.get<GetOrganizationsResponse>(
    "/api/auth/organizations/",
    {
      withCredentials: true,
    },
  );
  return response.data.organizations;
};

export interface CreateOrganizationPayload {
  name: string;
  description?: string;
  image?: File | null;
}

export interface JoinOrganizationPayload {
  orgId: number;
  ownerEmail: string;
}

export const createOrganization = async (
  payload: CreateOrganizationPayload,
) => {
  const formData = new FormData();
  formData.append("name", payload.name);
  formData.append("description", payload.description || "");
  if (payload.image) {
    formData.append("image", payload.image);
  }

  const response = await axiosClient.post(
    "/api/auth/organization/create/",
    formData,
    {
      withCredentials: true,
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return response.data;
};

export const joinOrganization = async (payload: JoinOrganizationPayload) => {
  const response = await axiosClient.post(
    `/api/auth/organization/${payload.orgId}/join/`,
    { owner_email: payload.ownerEmail },
    { withCredentials: true },
  );
  return response.data;
};

export const deleteOrganization = async (orgId: number) => {
  const response = await axiosClient.post(
    `/api/auth/organization/${orgId}/delete/`,
    {},
    { withCredentials: true },
  );
  return response.data;
};
