import React from "react";
import { Card, CardContent, CardMedia, Typography } from "@mui/material";
import "./GhostBotCard.css";

interface GhostBotCardProps {
  id: string;
  name: string;
  memory?: string;
  image_url?: string | null;
}

const GhostBotCard: React.FC<GhostBotCardProps> = ({
  name,
  memory,
  image_url,
}) => {
  return (
    <Card className="ghost-bot-card">
      {/* Thumbnail */}
      <CardMedia
        component="img"
        height="160"
        image={image_url || "/static/default-bot.jpg"}
        alt={`Bot ${name}`}
        className="ghost-bot-thumbnail"
      />

      {/* Info */}
      <CardContent className="ghost-bot-content">
        <Typography variant="h6" className="ghost-bot-name">
          {name}
        </Typography>

        <Typography variant="body2" color="text.secondary">
          <strong>Memory:</strong> {memory || "None"}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default GhostBotCard;
