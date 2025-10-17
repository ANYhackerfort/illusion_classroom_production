import React, { useState, useRef, useEffect } from "react";
import "./NoAccessJoinGate.css";
import { useParams } from "react-router-dom";
import { addParticipant } from "../../api/meetingApi";

type NoAccessJoinGateProps = {
  onAccessGranted?: () => void;
};

const NoAccessJoinGate: React.FC<NoAccessJoinGateProps> = ({
  onAccessGranted,
}) => {
  const { roomName } = useParams();
  const [name, setName] = useState("");
  const [participantEmail, setParticipantEmail] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [pictureBlob, setPictureBlob] = useState<Blob | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const getCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError("Unable to access webcam.");
        console.error(err);
      }
    };
    getCamera();
  }, []);

  const handleCapture = () => {
    if (!canvasRef.current || !videoRef.current) return;
    const context = canvasRef.current.getContext("2d");
    if (!context) return;

    const width = videoRef.current.videoWidth;
    const height = videoRef.current.videoHeight;
    canvasRef.current.width = width;
    canvasRef.current.height = height;

    context.drawImage(videoRef.current, 0, 0, width, height);
    canvasRef.current.toBlob((blob) => {
      if (blob) setPictureBlob(blob);
    }, "image/jpeg");
  };

  const handleSubmit = async () => {
    if (!roomName) return;
    if (!name || !participantEmail || !ownerEmail || !pictureBlob) {
      setError("All fields are required.");
      return;
    }

    try {
      const file = new File([pictureBlob], "picture.jpg", {
        type: "image/jpeg",
      });

      await addParticipant(roomName, {
        name,
        participantEmail,
        ownerEmail,
        picture: file,
      });

      // ✅ Cache the participant email in localStorage
      localStorage.setItem("currentUserEmail", participantEmail);

      setSubmitted(true);
      console.log("✅ Participant registered successfully");

      if (onAccessGranted) {
        onAccessGranted();
      }
    } catch (err: any) {
      console.error("❌ Failed to register participant:", err);

      if (err.response && err.response.data) {
        // If backend sends { "error": "message" }
        if (typeof err.response.data === "object" && err.response.data.error) {
          setError(err.response.data.error);
        } else if (typeof err.response.data === "string") {
          setError(err.response.data);
        } else {
          setError(JSON.stringify(err.response.data));
        }
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("Unknown error occurred.");
      }
    }
  };

  return (
    <div className="no-access-form-container">
      <div className={`dark-box ${submitted ? "fade-out" : ""}`}>
        {!submitted ? (
          <>
            <h2>Request Access</h2>
            <p>Please enter your information to join this meeting.</p>

            <input
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              type="email"
              placeholder="Your Email"
              value={participantEmail}
              onChange={(e) => setParticipantEmail(e.target.value)}
            />

            <input
              type="email"
              placeholder="Verification Email (Meeting Owner)"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
            />

            <div className="camera-wrapper">
              <video ref={videoRef} autoPlay muted playsInline />
              <canvas ref={canvasRef} style={{ display: "none" }} />
              <button
                type="button"
                className="capture-button"
                onClick={handleCapture}
              >
                Take Photo
              </button>
              {pictureBlob && <p className="preview-text">✅ Photo captured</p>}
            </div>

            {error && <div className="error">{error}</div>}
            <button onClick={handleSubmit}>Submit</button>
          </>
        ) : (
          <>
            <h2>Request Submitted</h2>
            <p>Your access request has been received.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default NoAccessJoinGate;
