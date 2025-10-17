import React, { useRef, useState, useEffect } from "react";
import "./ProfilePhotoCapture.css";

const ProfilePhotoCapture: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [captured, setCaptured] = useState(false);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access failed:", err);
      }
    };
    startCamera();
  }, []);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL("image/png");
    localStorage.setItem("profile-picture", imageData);
    setCaptured(true);
  };

  return (
    <div className="floating-modal-container">
      <div className="floating-modal-content">
        <h2>Please take a photo</h2>
        <video ref={videoRef} autoPlay muted className="profile-video" />
        <canvas ref={canvasRef} style={{ display: "none" }} />
        <button className="capture-button" onClick={handleCapture}>
          {captured ? "✅ Photo Taken" : "📸 Snap"}
        </button>
      </div>
    </div>
  );
};

export default ProfilePhotoCapture;
