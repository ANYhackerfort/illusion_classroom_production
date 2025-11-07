import React, { useState, useRef, useEffect } from "react";
import "./PhotoGalleryWrapper.css";

interface PhotoGalleryWrapperProps {
  children: React.ReactNode;
}

const PhotoGalleryWrapper: React.FC<PhotoGalleryWrapperProps> = ({
  children,
}) => {
  const [position, setPosition] = useState({ x: 1600, y: 50 });
  const [ghostPosition, setGhostPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragging) {
        setGhostPosition({
          x: e.clientX - offset.x,
          y: e.clientY - offset.y,
        });
      }
    };

    const handleMouseUp = () => {
      if (dragging) {
        setPosition(ghostPosition);
        setDragging(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, ghostPosition, offset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (rect) {
      setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setGhostPosition({ x: rect.left, y: rect.top });
      setDragging(true);
    }
  };

  return (
    <>
      {dragging && (
        <div
          className="gallery-wrapper ghost"
          style={{
            top: ghostPosition.y,
            left: ghostPosition.x,
            opacity: 0.5,
          }}
        >
          <div className="gallery-content">{children}</div>
        </div>
      )}

      <div
        ref={wrapperRef}
        className="gallery-wrapper"
        style={{
          top: position.y,
          left: position.x,
          pointerEvents: dragging ? "none" : "auto",
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="gallery-content">{children}</div>
      </div>
    </>
  );
};

export default PhotoGalleryWrapper;
