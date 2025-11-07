import React, { useMemo, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import type { Bot, BotAnswer } from "../interfaces/bot"; // ✅ import BotAnswer
import BotEditDialog from "./BotEditDialog";
import { deleteBotView } from "../interfaces/bot_view_db";
import { deleteBotFromServer } from "../interfaces/bot_drop";
import { useMouse } from "../../../hooks/drag/MouseContext";
import "./BotCard.css";

export const matteColors = ["#F0F4F8", "#FEF7F0", "#F9FAFB"];

interface BotCardProps extends Bot {
  meetingName: string;
  onDeleted: (id: string) => void;
}

const BotCard: React.FC<BotCardProps> = ({
  id,
  image_url,
  memory,
  answers,
  name,
  meetingName,
  onDeleted,
  video_url,
  associated_meeting_id,
}) => {
  const [editOpen, setEditOpen] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const { setDraggedItem } = useMouse();

  const cardColor = useMemo(
    () => matteColors[Math.floor(Math.random() * matteColors.length)],
    [],
  );

  // 🖱️ Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(".delete-btn")) return; // prevent dragging when pressing delete

    setDraggedItem({
      type: "bot-card",
      data: {
        id,
        name,
        memory,
        answers, // ✅ now structured answers
        image_url,
        video_url,
        associated_meeting_id,
        meetingName,
      },
    });
  };

  // 🗑️ Delete logic
  const handleDelete = useCallback(async () => {
    try {
      await deleteBotFromServer(id);
      await deleteBotView(id);
      onDeleted(id);
      console.log(`✅ Deleted bot ${id} (backend + IndexedDB)`);
      setOpenConfirm(false);
    } catch (err) {
      console.error("❌ Failed to delete bot:", err);
    }
  }, [id, onDeleted]);

  // 🧠 Render compact preview of answers
  const renderAnswerPreview = (answers: BotAnswer[]) => {
    if (!answers?.length) return <em>No answers yet</em>;
    return (
      <ul className="bot-answer-list">
        {answers.slice(0, 3).map((a) => (
          <li key={a.question_id}>
            <strong>Q{a.question_id}</strong>: {a.answers.join(", ")}{" "}
            <span className="bot-answer-time">({a.answer_time.toFixed(1)}s)</span>
          </li>
        ))}
        {answers.length > 3 && <li className="bot-answer-more">...and more</li>}
      </ul>
    );
  };

  return (
    <>
      <Card
        className="bot-card"
        sx={{ backgroundColor: cardColor }}
        onMouseDown={handleMouseDown}
      >
        {/* 🗑️ Delete Button */}
        <div className="delete-btn-wrapper">
          <button
            className="delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setOpenConfirm(true);
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

          {/* 💬 Answers Preview */}
          {renderAnswerPreview(answers)}

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
        initialAnswers={answers} // ✅ structured answers
        initialName={name}
        meetingName={meetingName}
      />

      {/* ⚠️ Confirm Delete Dialog */}
      <Dialog open={openConfirm} onClose={() => setOpenConfirm(false)}>
        <DialogTitle>Delete Bot?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to permanently delete <strong>{name}</strong>?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirm(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              await handleDelete();
            }}
            color="error"
            variant="contained"
            sx={{ textTransform: "none" }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BotCard;
