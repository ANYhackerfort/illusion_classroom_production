import React, { useRef, useState, useEffect } from "react";
import { useMouse } from "../../hooks/drag/MouseContext";
import type { QuestionCardData } from "../../types/QuestionCard";

interface VideoSegmentProps {
  source: [number, number]; // [start, end] in seconds
  id: string;
  multiplier: number;
  videoDurationRef: React.RefObject<number>;
  innerBarWidthPx: number;
  setVideoPercent: (percent: number) => void;
  splitAndAdd: (
    source: [number, number],
    time: number,
    questionCardData: QuestionCardData,
    id: string,
  ) => void;
}

const VideoSegment: React.FC<VideoSegmentProps> = ({
  source,
  multiplier,
  videoDurationRef,
  setVideoPercent,
  splitAndAdd,
  id,
}) => {
  const [start, setStart] = useState(source[0]);
  const [end, setEnd] = useState(source[1]);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setStart(source[0]);
    setEnd(source[1]);
  }, [source]);

  const [segmentWidthPx, setSegmentWidthPx] = useState(0);
  const [segmentLeftPx, setSegmentLeftPx] = useState(0);

  useEffect(() => {
    setSegmentWidthPx((end - start) * 100 * multiplier);
    setSegmentLeftPx(start * 100 * multiplier);
  }, [start, end, multiplier]);

  const segmentRef = useRef<HTMLDivElement>(null);
  const { draggedItem } = useMouse();

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.button !== 0) return;

    const rect = segmentRef.current?.getBoundingClientRect();
    if (!rect) return;

    const offsetX = e.clientX - rect.left;
    const ratio = offsetX / rect.width;
    const seconds = start + (end - start) * ratio;

    const time = Math.min(Math.max(seconds, 0), videoDurationRef.current);
    setVideoPercent(time - Math.random() * 1e-6); // tiny nudge
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    // e.stopPropagation();
    if (!draggedItem || draggedItem.type !== "question-card") return;
    const rect = segmentRef.current?.getBoundingClientRect();
    if (!rect) return;

    const offsetX = e.clientX - rect.left;
    const ratio = offsetX / rect.width;
    const seconds = start + (end - start) * ratio;

    splitAndAdd(source, seconds, draggedItem.data, id);
  };

  const handleMouseEnter = () => {
    if (draggedItem?.type === "question-card") {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  // breathing animation keyframes via inline style
  const breatheAnimation = `breathe-${id}`;
  const styleSheet = document.styleSheets[0];
  const existing = Array.from(styleSheet.cssRules).find(
    (r) => (r as CSSKeyframesRule).name === breatheAnimation,
  );
  if (!existing) {
    const keyframes = `
      @keyframes ${breatheAnimation} {
        0%   { transform: translateY(20px) scale(1); }
        50%  { transform: translateY(20px) scale(1.03); }
        100% { transform: translateY(20px) scale(1); }
      }
    `;
    styleSheet.insertRule(keyframes, styleSheet.cssRules.length);
  }

  return (
    <div
      ref={segmentRef}
      onMouseDown={handleClick}
      onMouseUp={handleMouseUp}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: "absolute",
        width: `${segmentWidthPx}px`,
        left: `${segmentLeftPx}px`,
        borderRadius: "8px",
        height: "140px",
        zIndex: 10,
        backgroundColor: "#273F4F", // light blue translucent
        transform: "translateY(20px)",
        animation: isHovered
          ? `${breatheAnimation} 1.5s ease-in-out infinite`
          : "none",
        boxShadow: isHovered ? "0 0 8px rgba(244, 244, 244, 0.4)" : "none",
        transition: "box-shadow 0.3s ease-in-out",
        cursor: isHovered ? "text" : "default",
      }}
    />
  );
};

export default VideoSegment;
