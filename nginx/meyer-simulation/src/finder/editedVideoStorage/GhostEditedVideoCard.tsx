import React from "react";
import "./EditedVideoCard.css";

interface GhostEditedVideoCardProps {
  id: string;
  videoName: string;
  videoTags: string[];
  thumbnailUrl: string;
}

const GhostEditedVideoCard: React.FC<GhostEditedVideoCardProps> = ({
  id,
  videoName,
  videoTags,
  thumbnailUrl,
}) => {
  return (
    <div className="edited-video-card ghost">
      <div className="thumbnail-container">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt="thumbnail"
            className="video-thumbnail ghost-thumb"
          />
        ) : (
          <div className="video-placeholder ghost-thumb">Preview</div>
        )}
      </div>
      <div className="video-name ghost-text">
        {videoName || `Video ID: ${id}`}
      </div>
      <div className="video-tags">
        {videoTags.length > 0 ? (
          videoTags.map((tag, index) => (
            <span key={index} className="video-tag ghost-tag">
              {tag}
            </span>
          ))
        ) : (
          <span className="video-tag ghost-tag">Dragging...</span>
        )}
      </div>
    </div>
  );
};

export default GhostEditedVideoCard;
