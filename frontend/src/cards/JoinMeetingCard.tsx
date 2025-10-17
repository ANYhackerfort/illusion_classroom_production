import React from "react";
import "./JoinMeetingCard.css";

interface JoinMeetingCardProps {
  meetingRoomName: string;
  description?: string;
  onClick?: () => void;
}

const JoinMeetingCard: React.FC<JoinMeetingCardProps> = ({
  meetingRoomName,
  description,
  onClick,
}) => {
  return (
    <div className="join-meeting-card">
      <div className="join-meeting-title">{meetingRoomName}</div>
      <div className="join-meeting-description">
        {description || "Enter the code or click to join the meeting."}
      </div>
      <button className="join-meeting-button" onClick={onClick}>
        Join Virtual Classroom
      </button>
    </div>
  );
};

export default JoinMeetingCard;
