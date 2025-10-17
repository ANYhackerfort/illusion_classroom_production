import React from "react";
import "./FinderButton.css";

type TaskBarButtonProps = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean; // ✅ new
};

const FinderTaskBarButton: React.FC<TaskBarButtonProps> = ({
  icon,
  label,
  onClick,
  active = false,
}) => {
  return (
    <button
      className={`finder-button-rectangle ${active ? "active" : ""}`}
      onClick={onClick}
    >
      <div className="finder-icon">{icon}</div>
      <span className="finder-label">{label}</span>
    </button>
  );
};

export default FinderTaskBarButton;
