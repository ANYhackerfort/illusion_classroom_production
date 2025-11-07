import React, { useEffect, useState } from "react";
import LocalBotCard from "./cards/LocalBotCard";
import type { Bot, BotAnswer } from "./interfaces/bot";
import "./CurrentBotDrop.css";
import { useMouse } from "../../hooks/drag/MouseContext";
import { useParams } from "react-router-dom";
import { getBotByIdFromServer } from "./interfaces/bot_drop";
import { getActiveMeeting, updateActiveMeeting } from "../../api/userApi";
import { useMainMeetingWebSocket } from "../../api/MainSocket";

const CurrentBotDropZone: React.FC = () => {
  const { draggedItem } = useMouse();
  const [bots, setBots] = useState<Bot[]>([]);
  const { org_id, roomName } = useParams<{ org_id: string; roomName: string }>();
  const { socket } = useMainMeetingWebSocket();

  // =======================================================
  // 🧩 Load active bots for the meeting
  // =======================================================
  const fetchActiveBots = async () => {
    try {
      if (!org_id || !roomName) return;

      console.log("🚀 Loading current active meeting bots...");
      const res = await getActiveMeeting(Number(org_id), roomName!);
      const activeBotIds = res.data?.active_bot_ids || [];
      console.log("🧠 Active bot IDs:", activeBotIds);

      if (activeBotIds.length === 0) {
        console.log("No active bots found in current meeting.");
        setBots([]);
        return;
      }

      // ✅ Fetch all bots concurrently
      const fetchedBots = await Promise.all(
        activeBotIds.map(async (botId: number) => {
          try {
            const botRes = await getBotByIdFromServer(botId);
            console.log(`🤖 Loaded Bot ${botId}:`, botRes);

            // ✅ Parse structured BotAnswer[] from backend
            const structuredAnswers: BotAnswer[] = Array.isArray(botRes.bot.answers)
              ? botRes.bot.answers.map((a: any) => ({
                  question_id: a.question_id ?? a.id ?? "",
                  answers: Array.isArray(a.answers) ? a.answers : [],
                  answer_time: Number(a.answer_time ?? 0),
                }))
              : [];

            const parsedBot: Bot = {
              id: String(botRes.bot.id),
              name: botRes.bot.name,
              memory: botRes.bot.memory || "",
              answers: structuredAnswers,
              image_url: botRes.bot.image_url || "",
              video_url: botRes.bot.video_url || "",
              associated_meeting_id: botRes.bot.meeting_id || null,
            };

            return parsedBot;
          } catch (err) {
            console.error(`❌ Failed to fetch bot ${botId}`, err);
            return null;
          }
        })
      );

      // ✅ Filter out nulls and update state
      const validBots = fetchedBots.filter((b): b is Bot => b !== null);
      console.log("✅ VALID BOTS:", validBots);
      setBots(validBots);
    } catch (err) {
      console.error("❌ Failed to load active meeting bots:", err);
    }
  };

  // =======================================================
  // 🔄 React to meeting WebSocket updates
  // =======================================================
  useEffect(() => {
    if (!socket) return;
    const handleMessage = async (event: MessageEvent) => {
      const msg = JSON.parse(event.data);
      console.log(msg, "ORG SOCKET MESSAGE");
      if (msg.type === "meeting_state_changed") {
        console.log("🔄 Meeting state changed, refreshing active bots...");
        fetchActiveBots();
      }
    };
    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket]);

  // =======================================================
  // 🚀 Initial mount: load active bots
  // =======================================================
  useEffect(() => {
    fetchActiveBots();
  }, []);

  // =======================================================
  // 🖱️ Handle dropping new bots into active zone
  // =======================================================
  const handleMouseUp = async () => {
    if (draggedItem && draggedItem.type === "bot-card") {
      const botData = draggedItem.data as Bot;
      console.log(botData, "BOT DATA HERE");

      // prevent duplicates
      if (bots.some((b) => b.id === botData.id)) return;

      try {
        const newBots = [...bots, botData];
        setBots(newBots);

        // 🧠 Sync backend active meeting
        const newBotIds = newBots.map((b) => Number(b.id));
        await updateActiveMeeting({
          org_id: Number(org_id),
          roomName: roomName!,
          active_bot_ids: newBotIds,
          active_video_id: "djsut",
          active_survey_id: "djsut",
        });
        console.log("💾 Synced active meeting with bots:", newBotIds);
      } catch (err) {
        console.error("❌ Failed to update active meeting:", err);
      }
    }
  };

  // =======================================================
  // 🧱 Render UI
  // =======================================================
  return (
    <div className="bot-dropzone" onMouseUp={handleMouseUp}>
      {bots.length === 0 ? (
        <div className="bot-dropzone-placeholder">
          <p>Drag in bot cards here</p>
        </div>
      ) : (
        <div className="bot-dropzone-list">
          {bots.map((b) => (
            <LocalBotCard
              key={b.id}
              id={b.id}
              name={b.name}
              memory={b.memory}
              answers={b.answers} // ✅ structured BotAnswer[]
              image_url={b.image_url}
              video_url={b.video_url}
              associated_meeting_id={b.associated_meeting_id}
              meetingName={roomName ?? ""}
              // ✅ Remove locally; backend updates handled in LocalBotCard
              onDeleted={(deletedId) =>
                setBots((prev) => prev.filter((bot) => bot.id !== deletedId))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CurrentBotDropZone;
