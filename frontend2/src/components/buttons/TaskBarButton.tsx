import React from "react";
import "./TaskBarButton.css";

type TaskBarButtonProps = {
  icon: React.ReactNode;
  label: React.ReactNode;
  onClick: () => void;
  active?: boolean; // ✅ optional
};

const TaskBarButton: React.FC<TaskBarButtonProps> = ({
  icon,
  label,
  onClick,
  active = false,
}) => {
  return (
    <button
      className={`taskbar-button-rectangle ${active ? "active" : ""}`}
      onClick={onClick}
    >
      <div className="taskbar-icon">{icon}</div>
      <span className="taskbar-label">{label}</span>
    </button>
  );
};

export default TaskBarButton;
