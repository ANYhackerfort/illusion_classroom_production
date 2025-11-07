import React, { useRef, useState, useEffect } from "react";
import "./DisplayBar.css";
import "./Question.css";

import type { QuestionCardData } from "../../types/QuestionCard";

interface QuestionDudProps {
  index: number;
  source: [number, number];
  multiplier: number;
  videoDurationRef: React.RefObject<number>;
  questionCardData: QuestionCardData;
  setVideoPercent: (p: number) => void;
}

const QuestionDud: React.FC<QuestionDudProps> = ({
  source,
  multiplier,
  videoDurationRef,
  questionCardData,
  setVideoPercent,
}) => {
  const [start, setStart] = useState(source[0]);
  const [end, setEnd] = useState(source[1]);
  const [wPx, setWPx] = useState(0);
  const [lPx, setLPx] = useState(0);

  const segmentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStart(source[0]);
    setEnd(source[1]);
  }, [source]);

  useEffect(() => {
    setWPx((end - start) * 100 * multiplier);
    setLPx(start * 100 * multiplier);
  }, [start, end, multiplier]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.button === 0) {
      const rect = segmentRef.current?.getBoundingClientRect();
      if (!rect) return;

      const offsetX = e.clientX - rect.left;
      const ratio = offsetX / rect.width;
      const seconds = start + (end - start) * ratio;

      const time = Math.min(
        Math.max(seconds, 0),
        videoDurationRef.current ?? 0,
      );
      setVideoPercent(time - Math.random() * 1e-6);
    }
  };

  return (
    <>
      <div
        ref={segmentRef}
        onMouseDown={handleMouseDown}
        className={`segment question-segment ${questionCardData.difficulty}`}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: "absolute",
          width: `${wPx}px`,
          left: `${lPx}px`,
          padding: "4px",
          boxSizing: "border-box",
          borderRadius: "8px",
          height: "140px",
          transform: "translateY(20px)",
          zIndex: 40,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-start",
          gap: "4px",
        }}
      >
        {[
          {
            content: questionCardData.question,
            fontSize: "12px",
            fontWeight: "bold",
          },
          {
            content: `${questionCardData.type.toUpperCase()} (${questionCardData.difficulty})`,
            fontSize: "10px",
            fontWeight: "normal",
          },
          {
            content: questionCardData.answers.join(", "),
            fontSize: "8px",
            fontWeight: "normal",
          },
        ].map((item, idx) => (
          <div
            key={idx}
            style={{
              width: "100%",
              padding: "4px 8px",
              fontSize: item.fontSize,
              fontWeight: item.fontWeight,
              backgroundColor: "rgba(255, 255, 255, 0.4)",
              borderRadius: "6px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
              color: "#333",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              boxSizing: "border-box",
            }}
          >
            {item.content}
          </div>
        ))}
      </div>
    </>
  );
};

export default QuestionDud;
