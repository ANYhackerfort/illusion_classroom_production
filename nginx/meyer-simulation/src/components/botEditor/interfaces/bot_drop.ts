import axiosClient from "../../../api/axiosClient";

export async function storeBotToServer(
  bot: {
    id: string;
    name: string;
    memory: string;
    answer_select: string[];
    img?: File;
    video?: File;
  },
  meetingName: string,
) {
  const formData = new FormData();
  formData.append("unique_id", bot.id);
  formData.append("name", bot.name);
  formData.append("memory", bot.memory);
  formData.append("answers", JSON.stringify(bot.answer_select));
  if (bot.img) formData.append("img", bot.img);
  if (bot.video) formData.append("video", bot.video); // ✅ NEW

  const response = await axiosClient.post(
    `/api/auth/store_bot/${encodeURIComponent(meetingName)}/`,
    formData,
  );

  return response.data;
}


export async function getAllBotsFromServer(meetingName: string) {
  const response = await axiosClient.get(
    `/api/auth/get_bot_names_and_videos/${meetingName}/`,
  );
  console.log("GOT BOTS", response.data)
  return response.data; // { bots: [...] }
}

// ✅ Fetch bot answers with questionId support (used for Redis key)
export async function getBotAnswersFromServer(
  meetingName: string,
  currentQuestion: number,
  startTime: number,
  endTime: number,
  answers: string[],
  questionId: string,
  type: string,
  questionText: string,
) {
  const params = {
    currentQuestion,
    startTime,
    endTime,
    answers: answers.join(","),  // e.g. "Focused,Tired,Motivated"
    questionId,                  // e.g. "q3"
    type,
    questionText,
  };

  const response = await axiosClient.get(
    `/api/auth/get_bot_answers/${encodeURIComponent(meetingName)}/`,
    { params }
  );

  return response.data;
}

export async function updateBotOnServer(
  bot: {
    id: string;
    name?: string;
    memory?: string;
    answer_select?: string[];
  },
  meetingName: string,
) {
  const formData = new FormData();
  formData.append("bot_id", bot.id);
  if (bot.name) formData.append("name", bot.name);
  if (bot.memory) formData.append("memory", bot.memory);
  if (bot.answer_select)
    formData.append("answers", JSON.stringify(bot.answer_select));

  const response = await axiosClient.post(
    `/api/auth/update_bot/${encodeURIComponent(meetingName)}/`,
    formData,
  );

  return response.data;
}

export async function getBotNamesAndVideosFromServer(meetingName: string) {
  const response = await axiosClient.get(
    `/api/auth/get_bot_names_and_videos/${encodeURIComponent(meetingName)}/`
  );
  return response.data; // { bots: [{ name, video_url }, ...] }
}
