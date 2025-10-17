import React from "react";
import "./FinderButton.css";

type TaskBarButtonProps = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
};

const FinderTaskBarButton: React.FC<TaskBarButtonProps> = ({
  icon,
  label,
  onClick,
}) => {
  return (
    <button className="finder-button-rectangle" onClick={onClick}>
      <div className="finder-icon">{icon}</div>
      <span className="finder-label">{label}</span>
    </button>
  );
};

export default FinderTaskBarButton;
