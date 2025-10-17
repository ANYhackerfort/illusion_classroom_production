import axiosClient from "../../../api/axiosClient";
// =======================================================
// 🤖 CREATE BOT
// =======================================================
export async function storeBotToServer(
  orgId: number,
  meetingName: string,
  bot: {
    name: string;
    memory: string;
    answers: string[];
    video?: File;
  },
) {
  const formData = new FormData();
  formData.append("name", bot.name);
  formData.append("memory", bot.memory);
  formData.append("answers", JSON.stringify(bot.answers));

  if (bot.video) {
    formData.append("video", bot.video);
  }

  const response = await axiosClient.post(
    `/api/auth/store_bot/${encodeURIComponent(orgId)}/${encodeURIComponent(meetingName)}/`,
    formData,
    { withCredentials: true },
  );

  return response.data; // will include {bot_id, identifier, video_url, image_url, meeting_id, ...}
}

// =======================================================
// ✏️ EDIT BOT
// =======================================================
export async function editBotOnServer(
  bot_id: string | number,
  updates: {
    name?: string;
    memory?: string;
    answers?: string[];
  },
) {
  const id = Number(bot_id);
  if (isNaN(id)) {
    throw new Error(`Invalid bot_id: ${bot_id}`);
  }

  const payload = {
    ...(updates.name && { name: updates.name }),
    ...(updates.memory && { memory: updates.memory }),
    ...(updates.answers && { answers: updates.answers }),
  };

  const response = await axiosClient.post(
    `/api/auth/edit_bot/${id}/`,
    payload,
    { withCredentials: true },
  );

  return response.data; // { message, bot_id }
}

// =======================================================
// 🗑️ DELETE BOT
// =======================================================
export async function deleteBotFromServer(botIdentifier: string) {
  const response = await axiosClient.delete(
    `/api/auth/delete_bot/${encodeURIComponent(botIdentifier)}/`,
    { withCredentials: true },
  );

  return response.data; // { message }
}

// =======================================================
// 📥 GET SINGLE BOT BY ID
// =======================================================
export async function getBotByIdFromServer(botIdentifier: number | string) {
  // ✅ Convert string to number before sending to backend
  const numericId = Number(botIdentifier);

  if (isNaN(numericId)) {
    throw new Error(`Invalid bot ID: ${botIdentifier}`);
  }

  const response = await axiosClient.get(
    `/api/auth/get_bot_by_id/${numericId}/`,
    { withCredentials: true },
  );

  // returns { cached: boolean, bot: { ... } }
  return response.data;
}

// =======================================================
// 📦 GET ALL BOTS (ORG-WIDE)
// =======================================================
export interface ServerBot {
  id: number;
  name: string;
  memory?: string | null;
  answers?: string[] | null;
  video_url?: string | null;
  image_url?: string | null;
  meeting_id?: number | null;
  meeting_name?: string | null;
}

export interface GetAllBotsResponse {
  cached: boolean;
  bots: ServerBot[];
}

export async function getAllBotsFromServer(orgId: number) {
  const response = await axiosClient.get(
    `/api/auth/get_all_bots/${encodeURIComponent(orgId)}/`,
    { withCredentials: true },
  );

  // returns { cached: boolean, bots: [...] }
  return response.data;
}
