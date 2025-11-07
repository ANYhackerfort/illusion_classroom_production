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
  Popover,
} from "@mui/material";
import {
  editBotOnServer,
  generateAnswersForBot,
  getQuestionById,
} from "../interfaces/bot_drop";
import { useParams } from "react-router-dom";
import type { BotAnswer } from "../interfaces/bot";
import { getAllQuestions } from "../../../indexDB/questionStorage";
import { updateQuestionStartEnd } from "../../../indexDB/questionStorage";

type BotEditDialogProps = {
  open: boolean;
  botId: string;
  initialMemory: string;
  initialAnswers: BotAnswer[];
  initialName: string;
  meetingName: string;
  onClose: () => void;
};

interface HoveredQuestion {
  question: string;
  correct_answers: string[];
  start?: number | null;
  end?: number | null;
}

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
  const [answersArray, setAnswersArray] = useState<BotAnswer[]>(initialAnswers || []);
  const [saving, setSaving] = useState(false);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const { org_id, roomName } = useParams<{ org_id: string; roomName: string }>();

  // 💬 Hover popover state
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [hoveredQuestion, setHoveredQuestion] = useState<HoveredQuestion | null>(null);

  const handleQuestionHover = async (
    event: React.MouseEvent<HTMLElement>,
    questionId: number
  ) => {
    setAnchorEl(event.currentTarget);

    try {
      // 🗂️ Try IndexedDB first
      const allQuestions = await getAllQuestions();
      console.log("🧠 All IndexedDB Questions:", allQuestions);

      const found = allQuestions.find((q) => {
        try {
          return q?.data?.id === String(questionId);
        } catch {
          return false;
        }
      });

      if (found && found.data) {
        console.log("✅ Loaded question from IndexedDB:", found.data.question);

        const questionText = found.data?.question ?? "Unknown question";
        const correctArray = Array.isArray(found.data?.correctAnswer)
          ? found.data.correctAnswer
          : found.data?.correctAnswer
          ? [found.data.correctAnswer]
          : [];

        // ✅ Read directly from top-level start/end
        const start = found.start ?? null;
        const end = found.end ?? null;

        // 🔍 If missing start/end, fallback to backend
        if (start == null || end == null) {
          console.log("⚠️ Missing start/end in IndexedDB — fetching from backend...");
          const data = await getQuestionById(questionId);

          // ✅ Update locally
          await updateQuestionStartEnd(String(questionId), data.start!, data.end!);

          // ✅ Update UI
          setHoveredQuestion({
            question: data.question,
            correct_answers: data.correct_answers,
            start: data.start,
            end: data.end,
          });
          return;
        }

        // ✅ Use local data
        setHoveredQuestion({
          question: questionText,
          correct_answers: correctArray,
          start,
          end,
        });
        return;
      }

      // 🌐 Fallback: if not found at all
      console.log("⚠️ Not found in IndexedDB — fetching from backend...");
      const data = await getQuestionById(questionId);
      setHoveredQuestion({
        question: data.question,
        correct_answers: data.correct_answers,
        start: data.start,
        end: data.end,
      });
    } catch (err) {
      console.error("❌ Failed to fetch question details:", err);
    }
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
    setHoveredQuestion(null);
  };

  const openPopover = Boolean(anchorEl);

  // 🧠 Save changes to backend
  const handleSave = async () => {
    setSaving(true);
    try {
      await editBotOnServer(
        botId,
        Number(org_id),
        roomName!,
        memory,
        name,
        answersArray
      );
      console.log("✅ Bot fully updated (name, memory, answers) on server.");
    } catch (err) {
      console.error("❌ Failed to update bot:", err);
    } finally {
      setSaving(false);
      onClose();
    }
  };

  // ⚙️ Generate new answers
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
        const structured: BotAnswer[] = result.answers.map((a: any) => ({
          question_id: a.question_id ?? a.id ?? "",
          answers: Array.isArray(a.answers) ? a.answers : [],
          answer_time: Number(a.answer_time ?? 0),
        }));
        setAnswersArray(structured);
        console.log("✅ Generated structured bot answers:", structured);
      } else {
        console.warn("⚠️ No answers returned from backend.");
      }
    } catch (err) {
      console.error("❌ Failed to generate answers:", err);
    } finally {
      setLoadingAnswers(false);
    }
  };

  // ✏️ Inline edit handlers
  const handleAnswerEdit = (index: number, field: keyof BotAnswer, value: any) => {
    setAnswersArray((prev) => {
      const updated = [...prev];
      (updated[index] as any)[field] = value;
      return updated;
    });
  };

  const handleBlurSave = async () => {
    try {
      await editBotOnServer(
        botId,
        Number(org_id),
        roomName!,
        memory,
        name,
        answersArray
      );
      console.log("💾 Auto-saved after inline edit.");
    } catch (err) {
      console.error("❌ Failed to auto-save edited answer:", err);
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
              context for generating answers.
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
              Generated answers (with timing)
            </Typography>
          </Divider>
        </Box>

        {/* 🧩 Editable Answers */}
        <Box
          sx={{
            mt: 1,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          {answersArray.length > 0 ? (
            answersArray.map((a, idx) => (
              <Box
                key={idx}
                sx={{
                  bgcolor: "grey.100",
                  borderRadius: "8px",
                  px: 2,
                  py: 1.5,
                  border: "1px solid #ddd",
                }}
              >
                {/* 🧠 Hoverable Question ID */}
                <Typography
                  variant="subtitle2"
                  color="text.primary"
                  sx={{ mb: 1, display: "flex", justifyContent: "space-between" }}
                >
                  <strong
                    style={{
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                    onMouseEnter={(e) => handleQuestionHover(e, Number(a.question_id))}
                    onMouseLeave={handlePopoverClose}
                  >
                    Q{idx + 1}
                  </strong>

                  <TextField
                    variant="standard"
                    label="Exact Time (s)"
                    type="number"
                    value={a.answer_time}
                    onChange={(e) =>
                      handleAnswerEdit(idx, "answer_time", Number(e.target.value))
                    }
                    onBlur={handleBlurSave}
                    sx={{ width: "30%" }}
                  />
                </Typography>

                {/* Editable Answers */}
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {a.answers.map((ans, i) => (
                    <TextField
                      key={i}
                      variant="outlined"
                      size="small"
                      value={ans}
                      onChange={(e) => {
                        const updated = [...a.answers];
                        updated[i] = e.target.value;
                        handleAnswerEdit(idx, "answers", updated);
                      }}
                      onBlur={handleBlurSave}
                      sx={{
                        bgcolor: "grey.200",
                        borderRadius: "6px",
                        "& .MuiInputBase-input": {
                          fontWeight: 500,
                          fontSize: "0.9rem",
                        },
                      }}
                    />
                  ))}

                  {/* ➕ Add answer */}
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      const updated = [...a.answers, ""];
                      handleAnswerEdit(idx, "answers", updated);
                    }}
                  >
                    + Add
                  </Button>
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

        {/* 🟦 Popover for question + correct answer */}
        <Popover
          open={openPopover}
          anchorEl={anchorEl}
          onClose={handlePopoverClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          sx={{ pointerEvents: "none" }}
          disableRestoreFocus
        >
          <Box sx={{ p: 2, maxWidth: 300 }}>
            {hoveredQuestion ? (
              <>
                {/* 🧠 Question text */}
                <Typography variant="subtitle2" gutterBottom>
                  {hoveredQuestion.question}
                </Typography>

                {/* ✅ Correct answers */}
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Correct Answer(s):</strong>{" "}
                  {hoveredQuestion.correct_answers.length > 0
                    ? hoveredQuestion.correct_answers.join(", ")
                    : "None"}
                </Typography>

                {/* ⏱️ Start–End times */}
                {hoveredQuestion.start != null && hoveredQuestion.end != null && (
                  <Typography variant="caption" color="text.secondary">
                    <strong>Appears:</strong>{" "}
                    {hoveredQuestion.start.toFixed(1)} s → {hoveredQuestion.end.toFixed(1)} s
                  </Typography>
                )}
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Loading question...
              </Typography>
            )}
          </Box>
        </Popover>
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
