import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./MissionControl.css";

const MissionControl: React.FC = () => {
  const navigate = useNavigate();
  const { org_id, roomName } = useParams<{
    org_id: string;
    roomName: string;
  }>();

  const handleExit = () => {
    navigate("/home");
  };

  const handleSettings = () => {
    if (org_id && roomName) {
      navigate(`/meeting-settings/${org_id}/${roomName}`);
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
