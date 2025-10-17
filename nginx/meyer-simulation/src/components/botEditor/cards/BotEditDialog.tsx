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
import { updateBotOnServer } from "../interfaces/bot_drop";

type BotEditDialogProps = {
  open: boolean;
  botId: string;
  initialMemory: string;
  initialAnswers: string[];
  initialName: string;
  meetingName: string;
  onClose: () => void;
  onSaveLocal?: (
    botId: string,
    data: {
      name: string;
      memory: string;
      answers: string[];
    },
  ) => void;
};

const BotEditDialog: React.FC<BotEditDialogProps> = ({
  open,
  botId,
  initialMemory,
  initialAnswers,
  onClose,
  onSaveLocal,
  initialName,
  meetingName,
}) => {
  const [name, setName] = useState<string>(initialName);
  const [memory, setMemory] = useState<string>(initialMemory);
  const [answers, setAnswers] = useState<string>(initialAnswers.join(", "));
  const [answersArray, setAnswersArray] = useState<string[]>(initialAnswers);
  const [position] = useState<number>(1);

  const handleAnswersChange = (value: string) => {
    setAnswers(value);
    const parsedArray = value
      .split(",")
      .map((answer) => answer.trim())
      .filter((answer) => answer.length > 0);
    setAnswersArray(parsedArray);
  };

  const handleSave = async () => {
    // Optional local save logic
    onSaveLocal?.(botId, {
      memory,
      answers: answersArray,
      name,
    });

    // ✅ Backend update
    try {
      await updateBotOnServer(
        {
          id: botId,
          name,
          memory,
          answer_select: answersArray,
        },
        meetingName,
      );
      console.log("✅ Bot updated on server.");
    } catch (err) {
      console.error("❌ Failed to update bot:", err);
    }

    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Bot</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mt: 1 }}>
          <TextField
            fullWidth
            label="Bot Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            helperText={`Previous: ${initialName}`}
          />
        </Box>

        {/* Memory */}
        <Box sx={{ mt: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Tip:</strong> We highly recommend using the <strong>Memory</strong> field instead of Answers.
              The memory tells the bot what kind of personality or behavior it should have. 
              You can describe what the bot knows, how it should respond, or what role it plays.
              For example: “You struggle on the first few questions but do well at the end and also respond quickly.”
            </Typography>
          </Box>

          <TextField
            fullWidth
            label="Memory"
            value={memory}
            onChange={(e) => setMemory(e.target.value)}
            helperText={`Previous: ${initialMemory}`}
            multiline
            minRows={3}
          />
        </Box>

        {/* OR Divider */}
        <Box sx={{ mt: 2, mb: 2 }}>
          <Divider>
            <Typography variant="caption" color="text.secondary">
              OR
            </Typography>
          </Divider>
        </Box>

        {/* Answers */}
        <Box sx={{ mt: 1 }}>
          <TextField
            fullWidth
            label="Answers (comma separated)"
            value={answers}
            onChange={(e) => handleAnswersChange(e.target.value)}
            helperText="Separate each answer with a comma"
          />
        </Box>

        {/* Render highlighted answers */}
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
        <Button onClick={onClose} variant="text">
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BotEditDialog;
