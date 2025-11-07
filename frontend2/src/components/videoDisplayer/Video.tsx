import React, { useRef, useState, useEffect } from "react";

interface VideoDudProps {
  source: [number, number]; // [start, end] in seconds
  index: number;
  multiplier: number;
  videoDurationRef: React.RefObject<number>;
  innerBarWidthPx: number;
  setVideoPercent: (percent: number) => void;
}

const VideoDud: React.FC<VideoDudProps> = ({
  source,
  multiplier,
  videoDurationRef,
  setVideoPercent,
}) => {
  const [start, setStart] = useState(source[0]);
  const [end, setEnd] = useState(source[1]);

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

  return (
    <div
      ref={segmentRef}
      onMouseDown={handleClick}
      style={{
        position: "absolute",
        width: `${segmentWidthPx}px`,
        left: `${segmentLeftPx}px`,
        borderRadius: "8px",
        height: "140px",
        zIndex: 10,
        backgroundColor: "#273F4F", // light blue translucent
        transform: "translateY(20px)",
        boxShadow: "none",
        transition: "box-shadow 0.3s ease-in-out",
        cursor: "text",
      }}
    />
  );
};

export default VideoDud;
