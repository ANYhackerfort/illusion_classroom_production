import React, { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
} from "@mui/material";
import type { Bot } from "../interfaces/bot";
import BotEditDialog from "./BotEditDialog";
import { getBotByIdView, storeBotView } from "../interfaces/bot_view_db";

export const matteColors = [
  "#F0F4F8", // soft blue-grey
  "#FEF7F0", // warm cream
  "#F9FAFB", // neutral off-white
];

interface BotCardProps extends Bot {
  meetingName: string;
}

const BotCard: React.FC<BotCardProps> = ({
  id,
  videoThumbnail,
  memory: initialMemory,
  answer_select: initialAnswerSelect,
  name,
  meetingName,
}) => {
  const [editOpen, setEditOpen] = useState(false);

  const [memory, setMemory] = useState(initialMemory);
  const [nameCard, setName] = useState(name);
  const [answerSelect, setAnswerSelect] = useState(initialAnswerSelect);

  const cardColor = useMemo(
    () => matteColors[Math.floor(Math.random() * matteColors.length)],
    [],
  );

  const handleSaveLocal = async (
    botId: string,
    data: { name: string | null; memory: string | null; answers: string[] | null }
  ) => {
    // Update local React state
    if (data.memory !== null) setMemory(data.memory);
    if (data.name !== null) setName(data.name);
    if (data.answers !== null) setAnswerSelect(data.answers);

    try {
      const existing = await getBotByIdView(botId);
      if (!existing) {
        console.warn("Bot not found in IndexedDB:", botId);
        return;
      }

      const updatedBot = {
        ...existing,
        name: data.name ?? existing.name,
        memory: data.memory ?? existing.memory,
        answers: data.answers ?? existing.answers,
      };

      await storeBotView(updatedBot);
      console.log("✅ Bot updated in IndexedDB:", updatedBot);
    } catch (err) {
      console.error("❌ Failed to update bot in IndexedDB", err);
    }
  };


  return (
    <>
      <Card
        sx={{
          maxWidth: 300,
          backgroundColor: cardColor,
          borderRadius: "12px",
          boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
        }}
      >
        <CardMedia
          component="img"
          height="180"
          image={videoThumbnail}
          alt="Bot Thumbnail"
        />

        <CardContent>
          <Typography
            variant="h6"
            sx={{
              textAlign: "center",
              padding: "8px 12px",
              fontWeight: "bold",
              wordBreak: "break-word",
            }}
          >
            {nameCard}
          </Typography>

          <Typography variant="subtitle1" gutterBottom>
            <strong>Memory:</strong> {memory}
          </Typography>

          <Typography variant="subtitle1" gutterBottom>
            <strong>Answer:</strong> {answerSelect.join(", ")}
          </Typography>

          <Button
            fullWidth
            onClick={() => setEditOpen(true)}
            sx={{
              mt: 2,
              backgroundColor: "#333",
              color: "#fff",
              fontWeight: "bold",
              textTransform: "none",
              borderRadius: "8px",
              "&:hover": {
                backgroundColor: "#444",
              },
            }}
          >
            Edit
          </Button>
        </CardContent>
      </Card>

      <BotEditDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        botId={id}
        initialMemory={memory}
        initialAnswers={answerSelect}
        initialName={nameCard}
        meetingName={meetingName}
        onSaveLocal={handleSaveLocal}
      />
    </>
  );
};

export default BotCard;
