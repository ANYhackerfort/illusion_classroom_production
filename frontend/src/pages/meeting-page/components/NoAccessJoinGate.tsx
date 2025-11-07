import React, { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { joinRoom } from "../../api/meetingApi";
import { Box, TextField, Typography, Alert, Button, Paper } from "@mui/material";

const NoAccessJoinGate: React.FC<{ orgId: number; onAccessGranted?: () => void }> = ({
  orgId,
  onAccessGranted,
}) => {
  const { roomName } = useParams();
  const [name, setName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [pictureBlob, setPictureBlob] = useState<Blob | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 🎥 Camera access
  useEffect(() => {
    const getCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        setError("Unable to access webcam.");
      }
    };
    getCamera();
  }, []);

  // 📸 Capture photo
  const handleCapture = () => {
    if (!canvasRef.current || !videoRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const width = videoRef.current.videoWidth;
    const height = videoRef.current.videoHeight;
    canvasRef.current.width = width;
    canvasRef.current.height = height;
    ctx.drawImage(videoRef.current, 0, 0, width, height);
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        setPictureBlob(blob);
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) localStorage.setItem("capturedPhoto", reader.result.toString());
        };
        reader.readAsDataURL(blob);
      }
    }, "image/jpeg");
  };

  // 🚀 Submit join request
  const handleSubmit = async () => {
    if (!roomName) return setError("Meeting name missing from URL.");
    if (!name || !ownerEmail) return setError("Please fill in all fields.");

    try {
      await joinRoom(orgId, roomName, { ownerEmail, name });
      localStorage.setItem("participantName", name);
      setSubmitted(true);
      if (onAccessGranted) onAccessGranted();
    } catch (err: any) {
      if (err.response?.data?.message) setError(err.response.data.message);
      else setError("Unable to verify access.");
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "transparent",
      }}
    >
      <Paper
        elevation={6}
        sx={{
          backdropFilter: "blur(20px) saturate(180%)",
          background: "rgba(255, 255, 255, 0.78)",
          borderRadius: "20px",
          p: "48px 56px",
          width: "440px",
          maxWidth: "90%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {!submitted ? (
          <>
            <Typography sx={{ fontSize: 28, fontWeight: 700, mb: 1, color: "#222" }}>
              Join a Meeting
            </Typography>
            <Typography
              sx={{
                fontSize: 15,
                color: "#444",
                mb: 3,
                textAlign: "center",
                opacity: 0.9,
                lineHeight: 1.5,
              }}
            >
              Enter your name and the meeting owner’s email to verify access.
            </Typography>

            {/* Input Fields */}
            <TextField
              label="Your Name"
              variant="outlined"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{ mb: 3 }}
            />

            <TextField
              label="Meeting Owner Email"
              variant="outlined"
              fullWidth
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              sx={{ mb: 4 }}
            />

            {/* Camera Section */}
            <Box
              sx={{
                mt: 1,
                mb: 3,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100%",
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: "100%",
                  borderRadius: "10px",
                  border: "2px solid #ccc",
                  objectFit: "cover",
                }}
              />
              <canvas ref={canvasRef} style={{ display: "none" }} />
              <Button
                onClick={handleCapture}
                variant="outlined"
                sx={{
                  mt: 2,
                  borderColor: "#222",
                  color: "#222",
                  borderRadius: "10px",
                  textTransform: "none",
                  fontWeight: 600,
                  "&:hover": { backgroundColor: "#222", color: "#fff" },
                }}
              >
                Snap Picture
              </Button>
              {pictureBlob && (
                <Typography sx={{ fontSize: "0.9rem", color: "#333", mt: 1 }}>
                  ✅ Photo saved locally
                </Typography>
              )}
            </Box>

            {error && (
              <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              variant="outlined"
              fullWidth
              sx={{
                border: "2px solid #222",
                borderRadius: "10px",
                color: "#222",
                fontWeight: 600,
                py: 1.2,
                textTransform: "none",
                "&:hover": { backgroundColor: "#222", color: "#fff" },
              }}
            >
              JOIN ROOM
            </Button>

            <Typography sx={{ fontSize: 13, color: "#777", mt: 4 }}>
              Illusion Classroom © Richard Meyer Labs
            </Typography>
          </>
        ) : (
          <>
            <Typography sx={{ fontSize: 28, fontWeight: 700, mb: 2, color: "#222" }}>
              Access Granted
            </Typography>
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 600,
                color: "#2e7d32",
                textAlign: "center",
              }}
            >
              You’re now authorized to join the meeting.
            </Typography>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default NoAccessJoinGate;
