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
  CircularProgress,
} from "@mui/material";
import { editBotOnServer, generateAnswersForBot } from "../interfaces/bot_drop";
import { useParams } from "react-router-dom";

type BotEditDialogProps = {
  open: boolean;
  botId: string;
  initialMemory: string;
  initialAnswers: string[]; // still the flat list in Bot
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
  const [answersArray, setAnswersArray] = useState<string[]>(initialAnswers);
  const [saving, setSaving] = useState(false);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const { org_id, roomName } = useParams<{ org_id: string; roomName: string }>();

  // 🧠 Save changes to backend
  const handleSave = async () => {
    setSaving(true);
    try {
      await editBotOnServer(botId, Number(org_id), roomName!, memory);
      console.log("✅ Bot successfully updated on server.");
    } catch (err) {
      console.error("❌ Failed to update bot:", err);
    } finally {
      setSaving(false);
      onClose();
    }
  };

  // ⚙️ Generate new answers from backend
  const handleGenerateAnswers = async () => {
    setLoadingAnswers(true);
    try {
      const result = await generateAnswersForBot(
        Number(botId),
        Number(org_id),
        roomName!,
        memory
      );

      if (result.ok && Array.isArray(result.answers)) {
        // backend returns [{ question, answers }]
        // now store each question’s answers as a single string using " ||| " delimiter
        const structured = result.answers.map((a: any) =>
          Array.isArray(a.answers) ? a.answers.join(" ||| ") : ""
        );
        setAnswersArray(structured);
        console.log("✅ Generated bot answers:", structured);
      } else {
        console.warn("⚠️ No answers returned from backend.");
      }
    } catch (err) {
      console.error("❌ Failed to generate answers:", err);
    } finally {
      setLoadingAnswers(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Bot</DialogTitle>

      <DialogContent
        dividers
        sx={{
          maxHeight: "65vh",
          overflowY: "auto",
        }}
      >
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
              <strong>Tip:</strong> This is the bot's memory — use it to provide
              context for generating answers. Example:{" "}
              <em>
                “This bot likes to get things wrong about Jupyter but gets it
                right later in the video.”
              </em>
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

          {/* ⚙️ Generate Button */}
          <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-start" }}>
            <Button
              onClick={handleGenerateAnswers}
              variant="contained"
              disabled={loadingAnswers}
              startIcon={
                loadingAnswers ? (
                  <CircularProgress size={18} color="inherit" />
                ) : undefined
              }
            >
              {loadingAnswers ? "Generating..." : "Generate Bot Answers"}
            </Button>
          </Box>
        </Box>

        {/* Divider */}
        <Box sx={{ mt: 2, mb: 2 }}>
          <Divider>
            <Typography variant="caption" color="text.secondary">
              Generated answers (in order as they appear in the video)
            </Typography>
          </Divider>
        </Box>

        {/* 🧩 Display delimited answers */}
        <Box
          sx={{
            mt: 1,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          {answersArray.length > 0 ? (
            answersArray.map((line, idx) => (
              <Box
                key={idx}
                sx={{
                  bgcolor: "grey.200",
                  borderRadius: "8px",
                  px: 2,
                  py: 1.5,
                  width: "100%",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                  }}
                >
                  {line
                    .split(" ||| ")
                    .filter((ans) => ans.trim().length > 0)
                    .map((ans, i) => (
                      <Box
                        key={i}
                        sx={{
                          bgcolor: "grey.300",
                          px: 1.5,
                          py: 0.5,
                          borderRadius: "6px",
                          fontWeight: 500,
                          fontSize: "0.9rem",
                        }}
                      >
                        {ans.trim()}
                      </Box>
                    ))}
                </Box>
              </Box>
            ))
          ) : loadingAnswers ? (
            <Typography color="text.secondary" variant="body2">
              Generating answers...
            </Typography>
          ) : (
            <Typography color="text.secondary" variant="body2">
              No generated answers yet.
            </Typography>
          )}
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
