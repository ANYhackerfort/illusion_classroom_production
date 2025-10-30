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
import type { Bot } from "../interfaces/bot";
import BotEditDialog from "./BotEditDialog";
import { deleteBotView } from "../interfaces/bot_view_db";
import { deleteBotFromServer } from "../interfaces/bot_drop";
import { useMouse } from "../../../hooks/drag/MouseContext";
import "./BotCard.css";

export const matteColors = ["#F0F4F8", "#FEF7F0", "#F9FAFB"];

interface BotCardProps extends Bot {
  meetingName: string;
  onDeleted: (id: string) => void; // keep string for frontend
}

const BotCard: React.FC<BotCardProps> = ({
  id,
  image_url,
  memory,
  answer_select,
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

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(".delete-btn")) return; // prevent dragging when pressing delete

    setDraggedItem({
      type: "bot-card",
      data: {
        id,
        name,
        memory,
        answer_select,
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

  return (
    <>
      <Card
        className="bot-card"
        sx={{ backgroundColor: cardColor }}
        onMouseDown={handleMouseDown} // 🔹 attach here
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
