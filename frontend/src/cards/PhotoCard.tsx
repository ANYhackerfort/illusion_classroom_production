import React from "react";
import "./PhotoCard.css";

interface PhotoCardProps {
  photo: string;
  name: string;
}

const PhotoCard: React.FC<PhotoCardProps> = ({ photo, name }) => {
  return (
    <div className="photo-card">
      {!photo ? (
        <p className="no-photo-text">No photo</p>
      ) : (
        <div className="photo-item">
          <img src={photo} alt="Photo" className="photo-image" />
          <span className="photo-label">{name}</span>
        </div>
      )}
    </div>
  );
};

export default PhotoCard;
