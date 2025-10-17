import React, { useEffect, useState } from "react";
import LocalBotCard from "./cards/LocalBotCard";
import type { Bot } from "./interfaces/bot";
import "./CurrentBotDrop.css";
import { useMouse } from "../../hooks/drag/MouseContext";
import { useParams } from "react-router-dom";
import { getMeetingId } from "../../components/videoDisplayer/api/save";
import { getBotByIdFromServer } from "./interfaces/bot_drop";
import { getActiveMeeting, updateActiveMeeting } from "../../api/userApi";

const CurrentBotDropZone: React.FC = () => {
  const { draggedItem } = useMouse();
  const [bots, setBots] = useState<Bot[]>([]);
  const [meetingId, setMeetingId] = useState<number | null>(null);
  const { org_id, roomName } = useParams<{
    org_id: string;
    roomName: string;
  }>();

  // ✅ Fetch meeting ID + active bots on mount
  useEffect(() => {
    const fetchActiveBots = async () => {
      try {
        if (!org_id || !roomName) return;

        console.log("🚀 Loading current active meeting bots...");
        const meetingIdFetched = await getMeetingId(Number(org_id), roomName);
        if (!meetingIdFetched) {
          console.warn("⚠️ No meeting ID found.");
          return;
        }
        setMeetingId(Number(meetingIdFetched));

        const res = await getActiveMeeting(
          Number(org_id),
          Number(meetingIdFetched),
        );
        const activeBotIds = res.data?.active_bot_ids || [];
        console.log("🧠 Active bot IDs:", activeBotIds);

        if (activeBotIds.length === 0) {
          console.log("ℹ️ No active bots found in current meeting.");
          setBots([]);
          return;
        }

        // ✅ Fetch all bots concurrently
        const fetchedBots = await Promise.all(
          activeBotIds.map(async (botId: number) => {
            try {
              const botRes = await getBotByIdFromServer(botId);
              console.log(`🤖 Loaded Bot ${botId}:`, botRes);
              return botRes.bot; // ✅ unwrap the bot object
            } catch (err) {
              console.error(`❌ Failed to fetch bot ${botId}`, err);
              return null;
            }
          }),
        );

        // ✅ Filter out nulls
        const validBots = fetchedBots.filter((b): b is Bot => b !== null);
        console.log("✅ VALID BOTS:", validBots);
        setBots(validBots);
      } catch (err) {
        console.error("❌ Failed to load active meeting bots:", err);
      }
    };

    fetchActiveBots();
  }, []);

  // ✅ Handle dropping bot manually + persist backend
  const handleMouseUp = async () => {
    if (!org_id || !meetingId) return;
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
          meeting_id: Number(meetingId),
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
              answer_select={b.answer_select}
              image_url={b.image_url}
              video_url={b.video_url}
              associated_meeting_id={b.associated_meeting_id}
              meetingName={roomName ?? ""}
              // ✅ Now only remove locally — LocalBotCard handles backend update
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
