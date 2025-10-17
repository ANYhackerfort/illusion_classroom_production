import React from "react";
import "./TaskBarButton.css";

type TaskBarButtonProps = {
  icon: React.ReactNode;
  label: React.ReactNode;
  onClick: () => void;
};

const TaskBarButton: React.FC<TaskBarButtonProps> = ({
  icon,
  label,
  onClick,
}) => {
  return (
    <button className="taskbar-button-rectangle" onClick={onClick}>
      <div className="taskbar-icon">{icon}</div>
      <span className="taskbar-label">{label}</span>
    </button>
  );
};

export default TaskBarButton;
