import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import "./MainPage.css";

const MainPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="art-background">
      {/* Animated blobs */}
      <div className="psychedelic-art">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
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
      </div>

      {/* Content Box */}
      <Box className="content-box">
        <Typography variant="h3" className="main-title">
          Illusion Classroom
        </Typography>

        <Typography variant="subtitle1" className="main-subtitle">
          Behavioral Science Experimentation Suite
        </Typography>

        <Box className="button-group">
          <Button className="login-btn" onClick={() => navigate("/login")}>
            Login
          </Button>
          <Button className="join-btn" onClick={() => navigate("/join-room")}>
            Join Room
          </Button>
        </Box>

        <Typography variant="body2" className="main-footer">
          © Richard Meyer Lab
        </Typography>
      </Box>
    </div>
  );
};

export default MainPage;
