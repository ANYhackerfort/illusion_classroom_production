import React from "react";
import { Card, Box, Typography } from "@mui/material";

interface NameOverlayCardProps {
  image: string;
  name: string;
  ratio?: string; // e.g. "16 / 9" (default)
}

const NameOverlayCard: React.FC<NameOverlayCardProps> = ({
  image,
  name,
  ratio = "16 / 9",
}) => {
  return (
    <Card
      sx={{
        position: "relative",
        width: "100%",
        maxWidth: 300,
        borderRadius: 2,
        overflow: "hidden",
        boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
      }}
    >
      {/* Aspect-ratio box */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          aspectRatio: ratio, // keeps 16:9 no matter the width
          backgroundColor: "#000",
        }}
      >
        <Box
          component="img"
          src={image}
          alt={name}
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover", // crop like a webcam frame
            display: "block",
          }}
        />
        {/* Name overlay */}
        <Box
          sx={{
            position: "absolute",
            left: 8,
            bottom: 8,
            bgcolor: "rgba(0,0,0,0.6)",
            color: "#fff",
            px: 1,
            py: 0.25,
            borderRadius: 1,
            fontSize: "0.85rem",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <Typography variant="body2">{name}</Typography>
        </Box>
      </Box>
    </Card>
  );
};

export default NameOverlayCard;
