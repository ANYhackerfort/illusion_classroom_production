import React from "react";
import "./VideoCard.css";

interface VideoCardProps {
  location: string;
  thumbnail: string;
  title: string;
  createdTime: string;
  lastAccessed: string;
}

const VideoCard: React.FC<VideoCardProps> = ({ thumbnail, title }) => {
  return (
    <div className="video-card-wrapper">
      <div className="video-card">
        <img src={thumbnail} alt={title} className="video-thumbnail" />
      </div>
      <div className="video-title">{title}</div>
    </div>
  );
};

export default VideoCard;
