import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./WaitingArtJoin.css";

const TOTAL_BLOBS = 60;

const generatePositions = () =>
  Array.from({ length: TOTAL_BLOBS }).map(() => ({
    x: Math.random(),
    y: Math.random(),
  }));

const JoinMeetingArt: React.FC = () => {
  const [positions, setPositions] = useState(generatePositions());
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  const handleBackgroundClick = () => setPositions(generatePositions());

  const handleJoin = () => {
    if (code.trim().length > 0) {
      navigate(`/meeting-room/${code.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="art-background" onClick={handleBackgroundClick}>
      <div className="glass-box" onClick={(e) => e.stopPropagation()}>
        <div className="art-text">Enter your meeting code</div>
        <div className="lab-credit">
          Mayer Lab @ University of California, Santa Barbara
        </div>

        <input
          type="text"
          className="code-input"
          placeholder="Enter code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />

        <button
          className={`configure-button ${code ? "btn-ready" : "btn-disabled"}`}
          onClick={handleJoin}
          disabled={!code}
        >
          Join Meeting
        </button>
      </div>

      <div className="psychedelic-art">
        {positions.map((pos, i) => (
          <div
            key={i}
            className={`blob ${i < 20 ? "blob-large" : "blob-small"}`}
            style={
              {
                "--x": pos.x.toString(),
                "--y": pos.y.toString(),
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
};

export default JoinMeetingArt;
