import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./WaitingArt.css";

const TOTAL_BLOBS = 60;

const generatePositions = () =>
  Array.from({ length: TOTAL_BLOBS }).map(() => ({
    x: Math.random(),
    y: Math.random(),
  }));

interface WaitingArtProps {
  hasAccess: boolean; // 🔥 admin_access flag
}

const WaitingArt: React.FC<WaitingArtProps> = ({ hasAccess }) => {
  const [positions, setPositions] = useState(generatePositions());
  const navigate = useNavigate();
  const { org_id, roomName } = useParams(); // <-- Extract roomName from current URL

  const handleClick = () => {
    setPositions(generatePositions());
  };

  const handleConfigureClick = () => {
    if (roomName) {
      navigate(`/meeting-settings/${org_id}/${roomName}`);
    } else {
      console.warn("Room name is missing in URL.");
    }
  };

  return (
    <div className="art-background" onClick={handleClick}>
      <div className="glass-box">
        <div className="art-text">Waiting for meeting to start...</div>
        <div className="lab-credit">
          Mayer Lab @ University Of California, Santa Barbara
        </div>
        {hasAccess && (
          <button className="configure-button" onClick={handleConfigureClick}>
            Configure Meeting
          </button>
        )}
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

export default WaitingArt;
