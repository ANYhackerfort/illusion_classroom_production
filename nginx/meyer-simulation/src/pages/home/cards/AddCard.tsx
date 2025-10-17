// AddMeetingCard.tsx
import React from "react";
import AddIcon from "@mui/icons-material/Add";
import "./AddCard.css";

interface AddMeetingCardProps {
  onClick: () => void;
  className?: string;
}

const AddMeetingCard: React.FC<AddMeetingCardProps> = ({
  onClick,
  className,
}) => {
  return (
    <article
      className={`mic mic--add ${className ?? ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="mic__addIconWrapper">
        <AddIcon className="mic__addIcon" />
      </div>
    </article>
  );
};

export default AddMeetingCard;
