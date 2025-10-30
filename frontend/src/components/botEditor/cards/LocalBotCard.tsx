import React, { useMemo, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
} from "@mui/material";
import type { Bot } from "../interfaces/bot";
import BotEditDialog from "./BotEditDialog";
import { useParams } from "react-router-dom";
import { getMeetingId } from "../../videoDisplayer/api/save";
import "./BotCard.css";
import { getActiveMeeting, updateActiveMeeting } from "../../../api/userApi";
import { useEffect } from "react";

export const matteColors = ["#F0F4F8", "#FEF7F0", "#F9FAFB"];

interface LocalBotCardProps extends Bot {
  meetingName: string;
  onDeleted: (id: string) => void; // updates local state only
}

const LocalBotCard: React.FC<LocalBotCardProps> = ({
  id,
  image_url,
  memory,
  answer_select,
  name,
  meetingName,
  onDeleted,
}) => {
  const [editOpen, setEditOpen] = useState(false);
  const { org_id, roomName} = useParams<{ org_id: string; roomName: string }>();

  useEffect(() => {
    console.log("🎞️ videoThumbnail for bot:", name, "→", image_url);
  }, [image_url, name]);

  const cardColor = useMemo(
    () => matteColors[Math.floor(Math.random() * matteColors.length)],
    [],
  );

  // 🗑️ Local delete only (no confirm, no backend)
  const handleDelete = useCallback(async () => {
    try {
      console.log(`🗑️ Removing bot ${id} locally & from backend...`);

      // ✅ 1. Update local UI
      onDeleted(id);

      if (!org_id) return;
      const meetingId = await getMeetingId(Number(org_id), meetingName);
      if (!meetingId) {
        console.warn("⚠️ No meeting ID found, skipping backend update.");
        return;
      }

      // ✅ 2. Fetch current active meeting state
      const res = await getActiveMeeting(Number(org_id), roomName!);
      const current = res.data;
      const updatedBotIds = current.active_bot_ids.filter(
        (botId: number) => botId !== Number(id),
      );

      console.log("UDPATED BOTS", updatedBotIds)

      // ✅ 3. Update backend with new list
      await updateActiveMeeting({
        org_id: Number(org_id),
        roomName: roomName!,
        active_bot_ids: updatedBotIds,
        active_video_id: "djsut", // don't touch
        active_survey_id: "djsut", // don't touch
      });

      console.log(`✅ Bot ${id} removed from active meeting cache.`);
    } catch (err) {
      console.error("❌ Failed to remove bot from backend:", err);
    }
  }, [id, onDeleted, org_id, roomName]);

  return (
    <>
      <Card className="bot-card" sx={{ backgroundColor: cardColor }}>
        {/* 🗑️ Delete Button */}
        <div className="delete-btn-wrapper">
          <button
            className="delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleDelete();
            }}
          >
            ×
          </button>
        </div>

        {/* 🎞️ Thumbnail */}
        <CardMedia
          component="img"
          height="180"
          image={image_url || "/static/default-bot.jpg"}
          alt="Bot Thumbnail"
          className="bot-thumbnail"
        />

        {/* 🧠 Info */}
        <CardContent className="bot-content">
          <Typography variant="h6" className="bot-name">
            {name}
          </Typography>

          <Typography variant="subtitle1" gutterBottom>
            <strong>Memory:</strong> {memory || "None"}
          </Typography>

          {Array.isArray(answer_select) && answer_select.length > 0 && (
            <div className="bot-answers">
              {answer_select.slice(0, 4).map((row: string, rowIdx: number) => (
                <div key={rowIdx} className="bot-answer-row">
                  {row
                    .split(" ||| ")
                    .filter((ans) => ans.trim().length > 0)
                    .map((ans: string, i: number) => (
                      <span key={i} className="bot-answer-pill">
                        {ans.trim()}
                      </span>
                    ))}
                </div>
              ))}
            </div>
          )}

          <Button
            fullWidth
            onClick={() => setEditOpen(true)}
            className="edit-btn"
          >
            Edit
          </Button>
        </CardContent>
      </Card>

      {/* ⚙️ Edit Dialog */}
      <BotEditDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        botId={id}
        initialMemory={memory}
        initialAnswers={answer_select}
        initialName={name}
        meetingName={meetingName}
      />
    </>
  );
};

export default LocalBotCard;
