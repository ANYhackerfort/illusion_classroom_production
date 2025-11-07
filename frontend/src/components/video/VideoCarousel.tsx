import React from "react";
import "./VideoCarousel.css";

type VideoCarouselProps = {
  children: React.ReactNode;
};

const VideoCarousel: React.FC<VideoCarouselProps> = ({ children }) => {
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY === 0) return;
    e.preventDefault();
    e.currentTarget.scrollLeft += e.deltaY;
  };

  return (
    <div className="video-carousel-wrapper" onWheel={handleWheel}>
      <div className="video-carousel-track">{children}</div>
    </div>
  );
};

export default VideoCarousel;
