import React from "react";
import { Box, Typography } from "@mui/material";

interface NameOverlayCardGlassProps {
  image?: string;
  name: string;
  ratio?: string;
  videoSrc?: string;
  muted?: boolean; // 👈 optional, defaults true
}

// 🎤 Inline Mic-Off SVG component
const MicOffIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 16,
  color = "#fff",
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
    <path d="M15 9.34V5a3 3 0 0 0-6 0v1.34" />
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M19 11v1a7 7 0 0 1-12 5M12 19v4M8 23h8" />
  </svg>
);

const NameOverlayCardGlass: React.FC<NameOverlayCardGlassProps> = ({
  image,
  name,
  ratio = "16 / 9",
  videoSrc,
  muted = true,
}) => {
  const handleVideoError = () => {
    console.error(`[ERROR] Failed to load video for bot: ${name}`);
  };

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        maxWidth: 300,
        borderRadius: 3,
        overflow: "hidden",
        backdropFilter: "blur(20px)",
        backgroundColor: "rgba(255,255,255,0.1)",
        border: "1px solid rgba(255,255,255,0.25)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
      }}
    >
      {/* Aspect-ratio box */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          aspectRatio: ratio,
          backgroundColor: videoSrc ? "#000" : "#111",
        }}
      >
        {videoSrc ? (
          <video
            autoPlay
            muted={muted}
            loop
            playsInline
            src={videoSrc}
            onError={handleVideoError}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              backgroundColor: "red", // visible when failed
            }}
          />
        ) : (
          <Box
            component="img"
            src={image}
            alt={name}
            sx={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              backgroundColor: "#444",
            }}
          />
        )}

        {/* 🔇 Mic-off badge */}
        {muted && (
          <Box
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              backgroundColor: "rgba(255, 0, 0, 0.85)",
              borderRadius: "50%",
              width: 24,
              height: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 6px rgba(0,0,0,0.4)",
            }}
          >
            <MicOffIcon size={14} color="#fff" />
          </Box>
        )}

        {/* 🪟 Liquid glass name tag */}
        <Box
          sx={{
            position: "absolute",
            left: 12,
            bottom: 12,
            bgcolor: "rgba(0, 0, 0, 0.6)",
            color: "#fff",
            px: 1.2,
            py: 0.5,
            borderRadius: 1.5,
            fontSize: "0.85rem",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {name}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default NameOverlayCardGlass;
