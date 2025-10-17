import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Divider,
} from "@mui/material";
import { editBotOnServer } from "../interfaces/bot_drop";
import { getBotByIdView, storeBotView } from "../interfaces/bot_view_db";

type BotEditDialogProps = {
  open: boolean;
  botId: string;
  initialMemory: string;
  initialAnswers: string[];
  initialName: string;
  meetingName: string;
  onClose: () => void;
};

const BotEditDialog: React.FC<BotEditDialogProps> = ({
  open,
  botId,
  initialMemory,
  initialAnswers,
  onClose,
  initialName,
}) => {
  const [name, setName] = useState<string>(initialName);
  const [memory, setMemory] = useState<string>(initialMemory);
  const [answers, setAnswers] = useState<string>(initialAnswers.join(", "));
  const [answersArray, setAnswersArray] = useState<string[]>(initialAnswers);
  const [position] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  // ✅ Parse comma-separated answers
  const handleAnswersChange = (value: string) => {
    setAnswers(value);
    const parsedArray = value
      .split(",")
      .map((answer) => answer.trim())
      .filter((answer) => answer.length > 0);
    setAnswersArray(parsedArray);
  };

  // ✅ Save bot both locally and to server
  const handleSave = async () => {
    setSaving(true);
    try {
      // 1️⃣ Update on backend
      await editBotOnServer(botId, {
        name,
        memory,
        answers: answersArray,
      });
      console.log("✅ Bot successfully updated on server.");

      // 2️⃣ Update locally in IndexedDB
      const existing = await getBotByIdView(botId);
      if (existing) {
        const updatedBot = {
          ...existing,
          id: String(existing.id),
          name,
          memory,
          answer_select: answersArray,
          videoThumbnail: existing.image_url, // preserve
          video_url: existing.video_url, // preserve
          associated_meeting_id: existing.associated_meeting_id, // preserve
        };
        await storeBotView(updatedBot);
        console.log(`💾 Locally updated bot ${botId} in IndexedDB.`);
      }
    } catch (err) {
      console.error("❌ Failed to update bot:", err);
    } finally {
      setSaving(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Bot</DialogTitle>

      <DialogContent dividers>
        {/* 🧠 Bot Name */}
        <Box sx={{ mt: 1 }}>
          <TextField
            fullWidth
            label="Bot Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            helperText={`Previous: ${initialName}`}
          />
        </Box>

        {/* 💭 Memory */}
        <Box sx={{ mt: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Tip:</strong> Use the <strong>Memory</strong> field to
              define the bot’s personality or context. Example: “You act like a
              friendly lab assistant who helps students debug experiments.”
            </Typography>
          </Box>

          <TextField
            fullWidth
            label="Memory"
            value={memory}
            onChange={(e) => setMemory(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            helperText={`Previous: ${initialMemory}`}
            multiline
            minRows={3}
          />
        </Box>

        {/* Divider */}
        <Box sx={{ mt: 2, mb: 2 }}>
          <Divider>
            <Typography variant="caption" color="text.secondary">
              OR
            </Typography>
          </Divider>
        </Box>

        {/* ✍️ Answers */}
        <Box sx={{ mt: 1 }}>
          <TextField
            fullWidth
            label="Answers (comma separated)"
            value={answers}
            onChange={(e) => handleAnswersChange(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            helperText="Separate each answer with a comma"
          />
        </Box>

        {/* 🎯 Answer Preview */}
        <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
          {answersArray.map((ans, idx) => (
            <Typography
              key={idx}
              sx={{
                px: 1,
                py: 0.5,
                borderRadius: "6px",
                bgcolor: idx === position ? "error.main" : "grey.300",
                color: idx === position ? "white" : "black",
                fontWeight: idx === position ? "bold" : "normal",
                fontSize: "0.875rem",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "150px",
              }}
              title={ans}
            >
              {ans.length > 15 ? `${ans.substring(0, 15)}...` : ans}
            </Typography>
          ))}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="text" disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BotEditDialog;
