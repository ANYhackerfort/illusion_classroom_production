import React from "react";
import TaskBarButton from "./buttons/TaskBarButton";
import UserBlock from "./blocks/UserBlock";
import LoggedInUserBlock from "./blocks/AUserBlocker";
import "./TaskBar.css";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";

const VideoIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="white"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17 10.5V7C17 5.9 16.1 5 15 5H5C3.9 5 3 5.9 3 7V17C3 18.1 3.9 19 5 19H15C16.1 19 17 18.1 17 17V13.5L21 17V7L17 10.5Z" />
  </svg>
);

const BotIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="white"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 2C13.1 2 14 2.9 14 4V4.18C17.45 4.86 20 7.92 20 11.5C20 15.64 16.64 19 12.5 19H11.5C7.36 19 4 15.64 4 11.5C4 7.92 6.55 4.86 10 4.18V4C10 2.9 10.9 2 12 2ZM9 12C9.55 12 10 11.55 10 11C10 10.45 9.55 10 9 10C8.45 10 8 10.45 8 11C8 11.55 8.45 12 9 12ZM15 12C15.55 12 16 11.55 16 11C16 10.45 15.55 10 15 10C14.45 10 14 10.45 14 11C14 11.55 14.45 12 15 12Z" />
  </svg>
);

const EditIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="white"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM21.41 6.34c.39-.39.39-1.02 0-1.41L19.07 2.59c-.39-.39-1.02-.39-1.41 0L15.13 5.12l3.75 3.75 2.53-2.53z" />
  </svg>
);

const HomeIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="8" fill="red" />
  </svg>
);

const InboxIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="white"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M19 3H4.99C3.89 3 3.01 3.89 3.01 5L3 19c0 1.1.89 2 1.99 2H19c1.1 0 2-.9 2-2V5c0-1.11-.9-2-2-2zm0 16H5v-4h4c0 1.1.9 2 2 2s2-.9 2-2h4v4zm0-6h-4c0-1.1-.9-2-2-2s-2 .9-2 2H5V5h14v8z" />
  </svg>
);

const ReturnIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="white"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);

const ManageIcon = (
  <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
    <path d="M12 2c-4.97 0-9 4.03-9 9 0 3.87 2.47 7.19 5.92 8.38l.58-.58C9.04 17.77 9 17.4 9 17c0-.92.37-1.75.98-2.35L15.3 7.3c.39-.39 1.03-.39 1.42 0l.88.88c.39.39.39 1.03 0 1.42L12.4 17.4c-.6.61-1.43.98-2.35.98-.4 0-.77-.04-1.13-.1l-.58.58C14.81 20.53 19 16.2 19 11c0-4.97-4.03-9-9-9z" />
  </svg>
);

type LeftTaskBarProps = {
  selectedPage: number;
  onSelect: (index: number) => void;
};

const LeftTaskBar: React.FC<LeftTaskBarProps> = ({
  selectedPage,
  onSelect,
}) => {
  const { roomName } = useParams<{ roomName: string }>();
  const navigate = useNavigate();

  // helper to check if tab is active
  const isActive = (index: number) => selectedPage === index;

  return (
    <div className="left-taskbar-container">
      <div className="section-label">Your Current Profile</div>
      <LoggedInUserBlock />

      <div className="section-label">Meeting Name</div>
      <TaskBarButton
        icon={VideoIcon}
        label={roomName}
        onClick={() => onSelect(0)}
        active={isActive(0)} // ✅ highlight logic
      />

      <div className="section-label">Meeting Owner</div>
      <UserBlock />

      <div className="section-label">Navigation</div>
      <div className="taskbar-buttons-group">
        <TaskBarButton
          icon={HomeIcon}
          label="Return LIVE"
          onClick={() => onSelect(-1)}
          active={isActive(-1)}
        />
        <TaskBarButton
          icon={ReturnIcon}
          label="Return Home"
          onClick={() => navigate("/home")}
        />
      </div>

      <div className="section-label">Control</div>
      <div className="taskbar-buttons-group">
        <TaskBarButton
          icon={VideoIcon}
          label="Video Control"
          onClick={() => onSelect(0)}
          active={isActive(0)}
        />
        <TaskBarButton
          icon={BotIcon}
          label="Bot Control"
          onClick={() => onSelect(2)}
          active={isActive(2)}
        />
      </div>

      <div className="section-label">Tools</div>
      <div className="taskbar-buttons-group">
        <TaskBarButton
          icon={EditIcon}
          label="Video Editor"
          onClick={() => onSelect(1)}
          active={isActive(1)}
        />
      </div>

      <div className="section-label">Data</div>
      <div className="taskbar-buttons-group">
        <TaskBarButton
          icon={InboxIcon}
          label="Results"
          onClick={() => onSelect(102)}
          active={isActive(102)}
        />
      </div>

      <div className="section-label">Collaboration</div>
      <div className="taskbar-buttons-group">
        <TaskBarButton
          icon={ManageIcon}
          label="Manage Collaborators"
          onClick={() => onSelect(7)}
          active={isActive(7)}
        />
      </div>
    </div>
  );
};

export default LeftTaskBar;
