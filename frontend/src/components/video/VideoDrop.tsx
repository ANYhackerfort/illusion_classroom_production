import React, { useRef, useState } from "react";
import "./VideoDrop.css";

type VideoDropProps = {
  onFileSelect: (file: File) => void;
  thumbnail?: string;
};

const VideoDrop: React.FC<VideoDropProps> = ({ onFileSelect, thumbnail }) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <div
      className={`video-drop ${dragging ? "dragging" : ""}`}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={() => setDragging(true)}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      {thumbnail ? (
        <img src={thumbnail} alt="Thumbnail" className="video-thumbnail" />
      ) : (
        <>
          <p className="video-drop-label">Drop a video or click to upload</p>
          <p className="video-drop-subtext">
            Supported formats: .mp4, .mov, .webm
          </p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </div>
  );
};

export default VideoDrop;
