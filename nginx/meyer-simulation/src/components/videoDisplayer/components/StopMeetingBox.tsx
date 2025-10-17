import React, { useEffect, useRef, useState } from "react";
import { useMouse } from "../../../hooks/drag/MouseContext";
import "./StopMeetingBox.css";

interface SurveyItem {
  id: string;
  type: string;
  question?: string;
  content?: string;
  url?: string;
  options?: string[];
}

interface StopMeetingBoxProps {
  onStopMeeting: (id: string) => void;
  dropText?: string;
  buttonText?: string;
}

const StopMeetingBox: React.FC<StopMeetingBoxProps> = ({
  onStopMeeting,
  dropText = "Drop Final Form Here",
  buttonText = "STOP Meeting",
}) => {
  const { draggedItem } = useMouse();
  const [isHovered, setIsHovered] = useState(false);
  const [droppedSurvey, setDroppedSurvey] = useState<SurveyItem[] | null>(null);
  const [surveyId, setSurveyId] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      const isOverBox = boxRef.current?.contains(e.target as Node);

      if (draggedItem?.type === "survey" && isOverBox) {
        setDroppedSurvey(draggedItem.data.items);
        setSurveyId(draggedItem.data.id); // Store the ID
      }

      setIsHovered(false);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!boxRef.current || !draggedItem || draggedItem.type !== "survey") {
        setIsHovered(false);
        return;
      }

      const rect = boxRef.current.getBoundingClientRect();
      const isInside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      setIsHovered(isInside);
    };

    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [draggedItem, onStopMeeting]);

  return (
    <div className="stop-meeting-wrapper">
      <div
        ref={boxRef}
        className={`drop-box ${isHovered ? "active" : ""}`}
      >
        {!droppedSurvey ? (
          <div>{dropText}</div>
        ) : (
          <div className="light-summary">
            <div className="summary-title">🧩 Survey Preview</div>
            <ul>
              {droppedSurvey.slice(0, 2).map((item, idx) => (
                <li key={idx}>
                  {item.type === "description" && <em>📄 {item.content}</em>}
                  {item.type === "slider" && <>🎚️ {item.question}</>}
                  {item.type === "mcq" && <>📝 {item.question}</>}
                  {item.type === "qualtrics" && <>🔗 {item.url}</>}
                </li>
              ))}
              {droppedSurvey.length > 2 && <li>…and more</li>}
            </ul>
          </div>
        )}
      </div>

      <button
        className="stop-button"
        onClick={() => onStopMeeting(surveyId!)}
      >
        {buttonText}
      </button>
    </div>
  );
};

export default StopMeetingBox;
