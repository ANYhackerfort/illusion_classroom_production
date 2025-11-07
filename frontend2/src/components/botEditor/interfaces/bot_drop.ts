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
import type { BotAnswer } from "./bot";

export async function editBotOnServer(
  bot_id: string | number,
  orgId: number,
  meetingName: string,
  memory: string,
  name: string,
  answers?: BotAnswer[] | null
) {
  const id = Number(bot_id);
  if (isNaN(id)) throw new Error(`Invalid bot_id: ${bot_id}`);

  // ✅ only include non-null fields
  const payload: Record<string, any> = { memory, name };
  if (answers !== null && answers !== undefined) {
    payload.answers = answers;
  }

  const response = await axiosClient.post(
    `/api/auth/edit_bot/${id}/${orgId}/${encodeURIComponent(meetingName)}/`,
    payload,
    { withCredentials: true }
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

export async function generateAnswersForBot(
  botId: number,
  orgId: number,
  roomName: string,
  botMemory?: string
): Promise<{
  ok: boolean;
  bot_id: number;
  generated_answers_count: number;
  answers: {
    question_id: number | string;
    answers: string[];
    answer_time: number;
  }[];
}> {
  const url = `/api/auth/generate_answers_bot/${encodeURIComponent(
    botId
  )}/${encodeURIComponent(orgId)}/${encodeURIComponent(roomName)}/`;

  const response = await axiosClient.post(
    url,
    { bot_memory: botMemory || "" },
    { withCredentials: true }
  );

  // 🔹 Ensure a consistent count field even if backend doesn’t provide it directly
  const data = response.data;
  const generated_answers_count = data.answers?.length ?? 0;

  return {
    ok: data.ok ?? false,
    bot_id: data.bot_id,
    generated_answers_count,
    answers: data.answers || [],
  };
}

export interface QuestionResponse {
  id: number;
  question: string;
  correct_answers: string[];
  start: number | null;
  end: number | null;
}

// 📡 Fetch question by ID
export const getQuestionById = async (
  questionId: number
): Promise<QuestionResponse> => {
  try {
    console.log(`📡 Fetching question ${questionId}...`);

    const response = await axiosClient.get<QuestionResponse>(
      `/api/auth/get_question_by_id/${encodeURIComponent(questionId)}/`,
      { withCredentials: true }
    );

    console.log("✅ Question fetched:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Failed to fetch question:", error);
    throw error;
  }
};