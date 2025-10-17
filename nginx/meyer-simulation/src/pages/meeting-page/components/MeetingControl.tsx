import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./MissionControl.css";

const MissionControl: React.FC = () => {
  const navigate = useNavigate();
  const { roomName } = useParams();

  const handleExit = () => {
    navigate("/home");
  };

  const handleSettings = () => {
    if (roomName) {
      navigate(`/meeting-settings/${roomName}`);
    }
  };

  return (
    <div className="mission-control">
      <button
        className="control-button"
        onClick={handleExit}
        aria-label="Leave"
      >
        L
      </button>

      <button
        className="control-button"
        onClick={handleSettings}
        aria-label="Settings"
      >
        S
      </button>
    </div>
  );
};

export default MissionControl;
