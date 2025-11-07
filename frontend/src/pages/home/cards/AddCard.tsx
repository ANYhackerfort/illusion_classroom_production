import React from "react";
import { Icon } from "@mui/material";
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
        {/* ✅ Use MUI Icon font instead of @mui/icons-material */}
        <Icon
          className="mic__addIcon"
          sx={{ fontSize: 40, opacity: 0.9 }}
        >
          add
        </Icon>
      </div>
    </article>
  );
};

export default AddMeetingCard;
