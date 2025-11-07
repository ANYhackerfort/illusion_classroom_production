import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
} from "@mui/material";
import type { Bot, BotAnswer } from "../interfaces/bot";
import BotEditDialog from "./BotEditDialog";
import { useParams } from "react-router-dom";
import { getMeetingId } from "../../videoDisplayer/api/save";
import "./BotCard.css";
import { getActiveMeeting, updateActiveMeeting } from "../../../api/userApi";

export const matteColors = ["#F0F4F8", "#FEF7F0", "#F9FAFB"];

interface LocalBotCardProps extends Bot {
  meetingName: string;
  onDeleted: (id: string) => void; // updates local state only
}

const LocalBotCard: React.FC<LocalBotCardProps> = ({
  id,
  image_url,
  memory,
  answers,
  name,
  meetingName,
  onDeleted,
}) => {
  const [editOpen, setEditOpen] = useState(false);
  const { org_id, roomName } = useParams<{ org_id: string; roomName: string }>();

  useEffect(() => {
    console.log("🎞️ videoThumbnail for bot:", name, "→", image_url);
  }, [image_url, name]);

  const cardColor = useMemo(
    () => matteColors[Math.floor(Math.random() * matteColors.length)],
    [],
  );

  // 🗑️ Local delete (UI + backend sync)
  const handleDelete = useCallback(async () => {
    try {
      console.log(`🗑️ Removing bot ${id} locally & from backend...`);

      // ✅ 1. Update local UI immediately
      onDeleted(id);

      if (!org_id) return;
      const meetingId = await getMeetingId(Number(org_id), meetingName);
      if (!meetingId) {
        console.warn("⚠️ No meeting ID found, skipping backend update.");
        return;
      }

      // ✅ 2. Fetch current meeting state
      const res = await getActiveMeeting(Number(org_id), roomName!);
      const current = res.data;
      const updatedBotIds = current.active_bot_ids.filter(
        (botId: number) => botId !== Number(id),
      );

      console.log("🧩 Updated active bot list:", updatedBotIds);

      // ✅ 3. Update backend
      await updateActiveMeeting({
        org_id: Number(org_id),
        roomName: roomName!,
        active_bot_ids: updatedBotIds,
        active_video_id: "djsut", // placeholder, not modified
        active_survey_id: "djsut", // placeholder, not modified
      });

      console.log(`✅ Bot ${id} removed from active meeting cache.`);
    } catch (err) {
      console.error("❌ Failed to remove bot from backend:", err);
    }
  }, [id, onDeleted, org_id, roomName, meetingName]);

  // 🎨 Render structured answers
  const renderAnswers = (answers: BotAnswer[]) => {
    if (!answers?.length)
      return <Typography color="text.secondary">No answers yet</Typography>;

    return (
      <div className="bot-answers">
        {answers.slice(0, 3).map((a, i) => (
          <div key={i} className="bot-answer-row">
            <Typography variant="subtitle2" color="text.primary">
              <strong>Q{i + 1}</strong>{" "}
              <span style={{ fontSize: "0.85rem", color: "#777" }}>
                ({a.answer_time.toFixed(1)}s)
              </span>
            </Typography>
            <div className="bot-answer-pill-group">
              {a.answers.map((ans, j) => (
                <span key={j} className="bot-answer-pill">
                  {ans}
                </span>
              ))}
            </div>
          </div>
        ))}
        {answers.length > 3 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            ...and more
          </Typography>
        )}
      </div>
    );
  };

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

          {/* 💬 Structured Answers */}
          {renderAnswers(answers)}

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
        initialAnswers={answers}
        initialName={name}
        meetingName={meetingName}
      />
    </>
  );
};

export default LocalBotCard;
