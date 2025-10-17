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
  owner_name: string;              // ✅ new field
  owner_picture: string | null;    // keep this if Django returns it
};

export const getMeetingOwner = async (
  meetingName: string,
): Promise<MeetingOwner> => {
  const res = await axiosClient.get(
    `/api/auth/get_meeting_owner/${encodeURIComponent(meetingName)}/`,
  );
  return res.data;
};
