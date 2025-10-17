import axiosClient from "./axiosClient";

export type UserInfo = {
  email: string;
  name: string;
  picture: string | null;
};

export const getUserInfo = async (): Promise<UserInfo> => {
  const res = await axiosClient.get("/api/auth/userinfo/");
  return res.data;
};

export type MeetingOwner = {
  meeting: string;
  owner_id: number;
  owner_username: string;
  owner_email: string;
  owner_name: string; // ✅ new field
  owner_picture: string | null; // keep this if Django returns it
};

export const getMeetingOwner = async (
  orgId: number,
  meetingName: string,
): Promise<MeetingOwner> => {
  const res = await axiosClient.get(
    `/api/auth/get_meeting_owner/${orgId}/${encodeURIComponent(meetingName)}/`,
    { withCredentials: true },
  );
  return res.data;
};

export type ActiveMeeting = {
  org_id: number;
  meeting_id: number;
  active_bot_ids: number[];
  active_video_id: number | null;
  active_survey_id: number | null;
  last_updated: string;
};

export const updateActiveMeeting = async (data: {
  org_id: number;
  meeting_id: number;
  active_bot_ids?: number[] | "djsut";
  active_video_id?: number | "djsut" | null;
  active_survey_id?: number | "djsut" | null;
}): Promise<{ message: string; data: ActiveMeeting }> => {
  const { org_id, meeting_id, ...body } = data;

  const res = await axiosClient.post(
    `/api/auth/update_active_meeting/${org_id}/${meeting_id}/`,
    body,
    { withCredentials: true },
  );

  return res.data;
};

export const getActiveMeeting = async (
  orgId: number,
  meetingId: number,
): Promise<{ message: string; data: ActiveMeeting }> => {
  const res = await axiosClient.get(
    `/api/auth/get_active_meeting/${orgId}/${meetingId}/`,
    { withCredentials: true },
  );
  return res.data;
};
