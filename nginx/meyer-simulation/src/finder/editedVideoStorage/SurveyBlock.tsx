import React from "react";
import type { Survey } from "./SurveyDropZone";
import { useMouse } from "../../hooks/drag/MouseContext";
import "./SurveyDropZone.css";

interface SurveyBlockProps {
  survey: Survey;
}

const SurveyBlock: React.FC<SurveyBlockProps> = ({ survey }) => {
  const { setDraggedItem } = useMouse();

  const handleMouseDown = () => {
    setDraggedItem({ type: "survey", data: survey });
  };

  const descriptionItem = survey.items.find((item) => item.type === "description");
  const shortDescription = descriptionItem
    ? descriptionItem.content.split(/\s+/).slice(0, 10).join(" ") + "..."
    : "";

  return (
    <div
      className="survey-block"
      onMouseDown={handleMouseDown}
      title="Drag to use this survey"
    >
      <div className="survey-block-content">
        <p className="survey-block-title">🧩 Survey ({survey.items.length} items)</p>

        {shortDescription && (
          <p className="survey-block-preview">🗒️ {shortDescription}</p>
        )}

        <ul className="survey-summary-list">
          {survey.items.slice(0, 3).map((item, index) => (
            <li key={index}>
              {item.type === "description" && <>📄 Description</>}
              {item.type === "slider" && <>🎚️ {item.question}</>}
              {item.type === "mcq" && <>📝 {item.question}</>}
              {item.type === "qualtrics" && <>🔗 Qualtrics Link</>}
            </li>
          ))}
          {survey.items.length > 3 && <li>...and more</li>}
        </ul>
      </div>
    </div>
  );
};

export default SurveyBlock;
