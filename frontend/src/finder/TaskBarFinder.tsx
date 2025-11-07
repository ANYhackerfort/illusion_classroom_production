import React from "react";
import FinderTaskBarButton from "../components/buttons/FinderButton";
import "./TaskBarFinder.css";

const SurveyIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="#007aff"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM8 7H16C16.55 7 17 7.45 17 8C17 8.55 16.55 9 16 9H8C7.45 9 7 8.55 7 8C7 7.45 7.45 7 8 7ZM8 11H13C13.55 11 14 11.45 14 12C14 12.55 13.55 13 13 13H8C7.45 13 7 12.55 7 12C7 11.45 7.45 11 8 11ZM8 15H11C11.55 15 12 15.45 12 16C12 16.55 11.55 17 11 17H8C7.45 17 7 16.55 7 16C7 15.45 7.45 15 8 15Z" />
  </svg>
);

const EditIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="#007aff"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.41L18.37 3.29a1.003 1.003 0 0 0-1.41 0L15.13 5.12l3.75 3.75 1.83-1.83z" />
  </svg>
);

const QuestionIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="#007aff"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M11 18H13V20H11V18ZM12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 19C8.13 19 5 15.87 5 12C5 8.13 8.13 5 12 5C15.87 5 19 8.13 19 12C19 15.87 15.87 19 12 19ZM12 7C10.34 7 9 8.34 9 10H11C11 9.45 11.45 9 12 9C12.55 9 13 9.45 13 10C13 11 11 10.75 11 13H13C13 11.75 15 11.5 15 10C15 8.34 13.66 7 12 7Z" />
  </svg>
);

const RobotIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="#007aff"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 2C12.55 2 13 2.45 13 3V5H17C18.66 5 20 6.34 20 8V17C20 18.66 18.66 20 17 20H7C5.34 20 4 18.66 4 17V8C4 6.34 5.34 5 7 5H11V3C11 2.45 11.45 2 12 2ZM17 18C17.55 18 18 17.55 18 17V8C18 7.45 17.55 7 17 7H7C6.45 7 6 7.45 6 8V17C6 17.55 6.45 18 7 18H17ZM9 10C9.55 10 10 10.45 10 11C10 11.55 9.55 12 9 12C8.45 12 8 11.55 8 11C8 10.45 8.45 10 9 10ZM15 10C15.55 10 16 10.45 16 11C16 11.55 15.55 12 15 12C14.45 12 14 11.55 14 11C14 10.45 14.45 10 15 10ZM8 14H16V16H8V14Z" />
  </svg>
);

type LeftTaskBarProps = {
  onSelect: (index: number) => void;
  selectedIndex: number; // ✅ keep track of selected
};

const LeftTaskBarFinder: React.FC<LeftTaskBarProps> = ({
  onSelect,
  selectedIndex,
}) => {
  return (
    <div className="finder-taskbar-container">
      <div className="finder-taskbar-section-label"></div>
      <div className="finder-taskbar-section-label">User</div>

      <div className="finder-taskbar-buttons-group">
        <FinderTaskBarButton
          icon={SurveyIcon}
          label="Surveys"
          onClick={() => onSelect(1)}
          active={selectedIndex === 1}
        />
        <FinderTaskBarButton
          icon={EditIcon}
          label="Edited Videos"
          onClick={() => onSelect(2)}
          active={selectedIndex === 2}
        />
        <FinderTaskBarButton
          icon={QuestionIcon}
          label="Questions"
          onClick={() => onSelect(3)}
          active={selectedIndex === 3}
        />
        <FinderTaskBarButton
          icon={RobotIcon}
          label="Bots"
          onClick={() => onSelect(4)}
          active={selectedIndex === 4}
        />
      </div>
    </div>
  );
};

export default LeftTaskBarFinder;
