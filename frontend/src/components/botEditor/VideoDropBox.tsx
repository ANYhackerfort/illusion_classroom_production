import React, { useEffect, useRef, useState, useCallback } from "react";
import "./VideoDropBox.css";
import BotCard from "./cards/BotCard";
import type { Bot, BotAnswer } from "./interfaces/bot"; // ✅ includes new BotAnswer interface
import {
  getAllBotsView,
  storeBotView,
  clearAllBotsView,
  deleteBotView,
} from "./interfaces/bot_view_db";
import {
  getAllBotsFromServer,
  getBotByIdFromServer,
  storeBotToServer,
} from "./interfaces/bot_drop";
import { useOrgSocketContext } from "../../finder/socket/OrgSocketContext";
import { useParams } from "react-router-dom";
import { getMeetingId } from "../videoDisplayer/api/save";
import type { ServerBot } from "./interfaces/bot_drop";

interface VideoDropBoxProps {
  userChecked: boolean;
  orgChecked: boolean;
  selectedIndex: number;
}

const VideoDropBox: React.FC<VideoDropBoxProps> = ({
  userChecked,
  orgChecked,
  selectedIndex,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [bots, setBots] = useState<Bot[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const { socket } = useOrgSocketContext();
  const { org_id, roomName } = useParams<{
    org_id: string;
    roomName: string;
  }>();
  const currentMeetingIdRef = useRef<string | null>(null);

  // =======================================================
  // 1️⃣ Fetch meeting ID once
  // =======================================================
  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        const meetingId = await getMeetingId(Number(org_id), roomName!);
        if (meetingId) {
          currentMeetingIdRef.current = meetingId;
          console.log("✅ Meeting ID loaded:", meetingId);
        }
      } catch (err) {
        console.error("❌ Failed to get meeting ID:", err);
      }
    };
    fetchMeeting();
  }, [org_id, roomName]);

  // =======================================================
  // 2️⃣ Reload bots when selectedIndex changes
  // =======================================================
  useEffect(() => {
    const reloadBots = async () => {
      const meetingId = await getMeetingId(Number(org_id), roomName!);
      currentMeetingIdRef.current = meetingId;
      await loadInitialBots();
    };
    reloadBots();
  }, [selectedIndex]);

  // =======================================================
  // 3️⃣ Load Bots from Backend → Save to IndexedDB
  // =======================================================
  const loadInitialBots = async () => {
    try {
      console.log("%c🚀 Loading bots from backend...", "color: #00aaff;");
      await clearAllBotsView();
      const orgBots = await getAllBotsFromServer(Number(org_id));

      if (orgBots.bots?.length) {
        await Promise.all(
          orgBots.bots.map(async (b: ServerBot) => {
            const parsedAnswers: BotAnswer[] = Array.isArray(b.answers)
              ? b.answers.map((a: any) => ({
                  question_id: a.question_id ?? a.id ?? "",
                  answers: Array.isArray(a.answers) ? a.answers : [],
                  answer_time: Number(a.answer_time ?? 0),
                }))
              : [];

            const botRecord: Bot = {
              id: String(b.id),
              name: b.name,
              memory: b.memory || "",
              answers: parsedAnswers, // ✅ structured answers
              image_url: b.image_url || "",
              video_url: b.video_url || "",
              associated_meeting_id: String(b.meeting_id ?? ""),
            };

            await storeBotView(botRecord);
          }),
        );
      }
      await loadFromIndexedDB();
    } catch (err) {
      console.error("❌ Failed to load bots:", err);
    }
  };

  // =======================================================
  // 4️⃣ Load from IndexedDB
  // =======================================================
  const loadFromIndexedDB = async () => {
    if (!userChecked && !orgChecked) {
      setBots([]);
      return;
    }

    try {
      const localBots = await getAllBotsView();
      let filtered = localBots;

      if (userChecked && !orgChecked && currentMeetingIdRef.current) {
        filtered = localBots.filter(
          (b) =>
            String(b.associated_meeting_id) === currentMeetingIdRef.current,
        );
      } else if (orgChecked && !userChecked) {
        filtered = localBots.filter(
          (b) =>
            String(b.associated_meeting_id) !== currentMeetingIdRef.current,
        );
      }

      setBots(filtered);
    } catch (err) {
      console.error("❌ Failed to fetch bots from IndexedDB:", err);
      setBots([]);
    }
  };

  useEffect(() => {
    loadFromIndexedDB();
  }, [userChecked, orgChecked]);

  // =======================================================
  // 5️⃣ WebSocket Listener
  // =======================================================
  useEffect(() => {
    if (!socket) return;

    const handleMessage = async (event: MessageEvent) => {
      const msg = JSON.parse(event.data);
      if (msg.type !== "org_update" || msg.category !== "bot") return;

      const { action, payload } = msg;
      const botId = String(payload?.id || payload?.bot_id || "");
      if (!botId) return;

      try {
        switch (action) {
          case "delete":
            await deleteBotView(botId);
            break;

          case "create":
          case "update": {
            const botResp = await getBotByIdFromServer(botId);
            const b = botResp?.bot;

            if (b) {
              const parsedAnswers: BotAnswer[] = Array.isArray(b.answers)
                ? b.answers.map((a: any) => ({
                    question_id: a.question_id ?? a.id ?? "",
                    answers: Array.isArray(a.answers) ? a.answers : [],
                    answer_time: Number(a.answer_time ?? 0),
                  }))
                : [];

              const botRecord: Bot = {
                id: String(b.id),
                name: b.name || "Unnamed Bot",
                memory: b.memory || "",
                answers: parsedAnswers,
                image_url: b.image || b.image_url || "",
                video_url: b.video_url || "",
                associated_meeting_id: b.meeting_id || null,
              };

              await storeBotView(botRecord);
              console.log(`✅ [BotTable] Synced bot ${b.id} (${action})`);
            }
            break;
          }
        }
        await loadFromIndexedDB();
      } catch (err) {
        console.error(`❌ [BotTable] Error handling ${action}:`, err);
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket, userChecked, orgChecked]);

  // =======================================================
  // 6️⃣ Drag-and-Drop Upload
  // =======================================================
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files).filter(
        (f) =>
          f.type.startsWith("video/") || f.name.toLowerCase().endsWith(".mp4"),
      );
      if (!files.length) return;

      try {
        for (const file of files) {
          const baseName = file.name.replace(/\.[^/.]+$/, "");

          const created = await storeBotToServer(Number(org_id), roomName!, {
            name: baseName,
            memory: "",
            answers: [],
            video: file,
          });

          const botRecord: Bot = {
            id: String(created.bot_id),
            name: created.name || baseName,
            memory: created.memory || "",
            answers: [], // ✅ no answers yet
            image_url: created.image_url || "",
            video_url: created.video_url || "",
            associated_meeting_id:
              created.meeting_id || currentMeetingIdRef.current,
          };

          await storeBotView(botRecord);
        }

        await loadFromIndexedDB();
      } catch (err) {
        console.error("❌ Error while creating bots:", err);
      }
    },
    [org_id, roomName],
  );

  // =======================================================
  // 7️⃣ UI
  // =======================================================
  return (
    <div
      ref={containerRef}
      className={`video-drop-box ${isDragging ? "dragging" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {bots.length === 0 && (
        <div className="drop-message">
          <strong>Drag and drop MP4 videos here</strong>
          <br />
          They’ll automatically turn into bot cards linked to this meeting.
        </div>
      )}

      <div className="bot-masonry">
        {bots.map((b) => (
          <div className="bot-card-wrapper" key={b.id}>
            <BotCard
              id={b.id}
              name={b.name}
              memory={b.memory}
              answers={b.answers} // ✅ now BotAnswer[]
              image_url={b.image_url}
              video_url={b.video_url}
              associated_meeting_id={b.associated_meeting_id}
              meetingName={roomName!}
              onDeleted={(deletedId) =>
                setBots((prev) => prev.filter((bot) => bot.id !== deletedId))
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default VideoDropBox;
