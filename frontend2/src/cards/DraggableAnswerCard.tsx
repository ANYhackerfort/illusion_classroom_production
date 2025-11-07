import React, { useRef, useState, useEffect } from "react";
import AnswerCard from "./FourAnswerQuestion";

interface DraggableAnswerCardProps {
  question: string;
  options: string[];
  onSelect: (option: string) => void;
}

const DraggableAnswerCard: React.FC<DraggableAnswerCardProps> = ({
  question,
  options,
  onSelect,
}) => {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragging) {
        setGhostPos({
          x: e.clientX - offset.x,
          y: e.clientY - offset.y,
        });
      }
    };

    const handleMouseUp = () => {
      if (dragging) {
        setPosition(ghostPos);
        setDragging(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, offset, ghostPos]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setGhostPos({ x: rect.left, y: rect.top });
      setDragging(true);
    }
  };

  return (
    <>
      {dragging && (
        <div
          style={{
            position: "fixed",
            top: ghostPos.y,
            left: ghostPos.x,
            opacity: 0.5,
            zIndex: 1000,
            pointerEvents: "none",
          }}
        >
          <AnswerCard
            question={question}
            options={options}
            onSelect={onSelect}
          />
        </div>
      )}

      <div
        ref={cardRef}
        onMouseDown={handleMouseDown}
        style={{
          position: "absolute",
          top: position.y,
          left: position.x,
          cursor: "move",
          pointerEvents: dragging ? "none" : "auto",
        }}
      >
        <AnswerCard question={question} options={options} onSelect={onSelect} />
      </div>
    </>
  );
};

export default DraggableAnswerCard;
