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

const DisplayIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="white"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M21 3H3C1.89 3 1.01 3.89 1.01 5L1 16C1 17.11 1.89 18 3 18H10V20H6V22H18V20H14V18H21C22.11 18 23 17.11 23 16V5C23 3.89 22.11 3 21 3Z" />
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
const MeetingIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="white"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" />
  </svg>
);

const AudioIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="white"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 3C10.34 3 9 4.34 9 6V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V6C15 4.34 13.66 3 12 3ZM5 9V11H7V9H5ZM17 9V11H19V9H17ZM12 17C9.33 17 4 18.34 4 21V22H20V21C20 18.34 14.67 17 12 17Z" />
  </svg>
);

const SearchIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="white"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C8.01 14 6 11.99 6 9.5S8.01 5 10.5 5 15 7.01 15 9.5 12.99 14 10.5 14z" />
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

const QuestionIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="white"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M11 18H13V20H11V18ZM12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 19C8.13 19 5 15.87 5 12C5 8.13 8.13 5 12 5C15.87 5 19 8.13 19 12C19 15.87 15.87 19 12 19ZM12 7C10.34 7 9 8.34 9 10H11C11 9.45 11.45 9 12 9C12.55 9 13 9.45 13 10C13 11 11 10.75 11 13H13C13 11.75 15 11.5 15 10C15 8.34 13.66 7 12 7Z" />
  </svg>
);

const InviteIcon = (
  <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4S8 5.79 8 8s1.79 4 4 4zm6 2h-2.2c-.73 0-1.37.4-1.72 1.03C13.23 16.1 12.14 16.5 11 16.5s-2.23-.4-3.08-1.47A2.003 2.003 0 006.2 14H4v2h16v-2z" />
  </svg>
);

const ManageIcon = (
  <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
    <path d="M12 2c-4.97 0-9 4.03-9 9 0 3.87 2.47 7.19 5.92 8.38l.58-.58C9.04 17.77 9 17.4 9 17c0-.92.37-1.75.98-2.35L15.3 7.3c.39-.39 1.03-.39 1.42 0l.88.88c.39.39.39 1.03 0 1.42L12.4 17.4c-.6.61-1.43.98-2.35.98-.4 0-.77-.04-1.13-.1l-.58.58C14.81 20.53 19 16.2 19 11c0-4.97-4.03-9-9-9z" />
  </svg>
);

type LeftTaskBarProps = {
  onSelect: (index: number) => void;
};

const LeftTaskBar: React.FC<LeftTaskBarProps> = ({ onSelect }) => {
    const { roomName } = useParams<{ roomName: string }>();
    const navigate = useNavigate();


  return (
    <div className="left-taskbar-container">
          <div className="section-label">Your Current Profile</div>

      <LoggedInUserBlock/>
    <div className="section-label">Meeting Name</div>
      <TaskBarButton
          icon={VideoIcon}
          label={roomName}
          onClick={() => onSelect(0)}
        />
      <div className="section-label">Meeting Owner</div>
      <UserBlock />

      <div className="section-label">Navigation</div>

      <div className="taskbar-buttons-group">
        <TaskBarButton
          icon={HomeIcon}
          label="Return LIVE"
          onClick={() => onSelect(-1)}
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
        />
      </div>

      <div className="section-label">Tools </div>

        <div className="taskbar-buttons-group">
        <TaskBarButton
          icon={EditIcon}
          label="Video Editor"
          onClick={() => onSelect(1)}
        />

        <TaskBarButton icon={BotIcon} label="Bot Editor" onClick={() => onSelect(2)} />
      </div>

      <div className="section-label">Data</div>
      <div className="taskbar-buttons-group">
        <TaskBarButton
          icon={InboxIcon}
          label="Results"
          onClick={() => onSelect(102)}
        />
      </div>

      <div className="section-label">Collboration</div>

      <div className="taskbar-buttons-group">
        <TaskBarButton
          icon={ManageIcon}
          label="Manage Collaborators"
          onClick={() => onSelect(7)}
        />
      </div>
    </div>
  );
};

export default LeftTaskBar;
