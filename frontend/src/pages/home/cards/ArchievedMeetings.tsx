import React from "react";
import "./OnGoingMeeting.css";
import type { VideoSegmentData } from "../../../types/QuestionCard";
import { useNavigate } from "react-router-dom";
import { Button } from "@mui/material";

export type MediaInfoCardProps = {
  name: string;
  imageUrl: string;
  description: string;
  questionsCount: number;
  videoLengthSec: number;
  tags: string[];
  createdAt: string | number | Date;
  ownerEmail: string;
  sharedWith: string[];
  VideoSegments: VideoSegmentData[];
  className?: string;

  handleDelete?: (name: string) => void;
  handleUnarchive?: (name: string) => void;

  selectedOrgId: number | null;
};

const formatDuration = (totalSec: number) => {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
};

const toDateLabel = (d: string | number | Date) =>
  new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const MediaInfoCardArchieved: React.FC<MediaInfoCardProps> = ({
  name,
  imageUrl,
  description,
  questionsCount,
  videoLengthSec,
  tags,
  createdAt,
  ownerEmail,
  className,
  selectedOrgId,
  handleDelete,
  handleUnarchive,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (!selectedOrgId) return;
    navigate(`/meeting-room/${selectedOrgId}/${encodeURIComponent(name)}`);
  };

  return (
    <article
      className={`mic mic--clickable ${className ?? ""}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="mic__imageWrapper">
        <img
          className="mic__image"
          src={imageUrl}
          alt="Thumbnail"
          loading="lazy"
        />
      </div>

      <div className="mic__body">
        <h3 className="mic__title">{name}</h3>

        <p className="mic__description">{description}</p>

        <div className="mic__meta">
          <span className="mic__metaItem">
            {questionsCount} {questionsCount === 1 ? "question" : "questions"}
          </span>
          <span className="mic__dot" />
          <span className="mic__metaItem">
            {formatDuration(videoLengthSec)}
          </span>
        </div>

        {tags.length > 0 && (
          <div className="mic__tags" aria-label="tags">
            {tags.map((t, i) => (
              <span className="mic__tag" key={`${t}-${i}`}>
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="mic__footer">
          <span className="mic__created">
            Created: {toDateLabel(createdAt)}
          </span>
          <span className="mic__owner">{ownerEmail}</span>
        </div>

        {/* Buttons row */}
        <div className="mic__actions">
          <Button
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              if (handleDelete) handleDelete(name);
            }}
          >
            Delete
          </Button>
          <Button
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              if (handleUnarchive) handleUnarchive(name);
            }}
          >
            Un-Archieve
          </Button>
        </div>
      </div>
    </article>
  );
};

export default MediaInfoCardArchieved;
