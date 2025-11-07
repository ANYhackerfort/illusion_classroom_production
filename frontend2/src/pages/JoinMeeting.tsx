import React, { useState } from "react";
import { Box, Typography, Button, TextField } from "@mui/material";
import { useNavigate } from "react-router-dom";
import "./Login.css"; // reuse the same styles for consistency

const JoinMeetingPage: React.FC = () => {
  const [roomName, setRoomName] = useState("");
  const navigate = useNavigate();

  const handleJoin = () => {
    if (roomName.trim()) {
      navigate(`/join_room/${roomName}`);
    }
  };

  return (
    <Box className="login-background">
      {/* Animated blobs */}
      <Box className="psychedelic-art">
        {Array.from({ length: 50 }).map((_, i) => (
          <Box
            key={i}
            className={`blob ${i < 20 ? "blob-large" : "blob-small"}`}
            style={
              {
                "--x": Math.random().toString(),
                "--y": Math.random().toString(),
              } as React.CSSProperties
            }
          />
        ))}
      </Box>

      {/* Card */}
      <Box className="login-card">
        <Typography variant="h4" className="login-title">
          Join a Meeting
        </Typography>

        <Typography variant="subtitle1" className="login-description">
          Enter a room name to connect instantly
        </Typography>

        <TextField
          fullWidth
          variant="outlined"
          placeholder="Room Name"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          className="room-input"
          InputProps={{
            style: {
              borderRadius: "8px",
              background: "#fff",
            },
          }}
        />

        <Button
          className="custom-google-button"
          onClick={handleJoin}
          disabled={!roomName.trim()}
        >
          Join Room
        </Button>

        <Typography variant="body2" className="login-footer">
          Illusion Classroom © Richard Meyer Labs
        </Typography>
      </Box>
    </Box>
  );
};

export default JoinMeetingPage;
