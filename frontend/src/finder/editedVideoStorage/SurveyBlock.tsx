import React from "react";
import { Survey } from "../../indexDB/surveyStorage";
import { useMouse } from "../../hooks/drag/MouseContext";
import { deleteSurveyById } from "../../indexDB/surveyStorage";
import { deleteSurvey } from "../../components/videoDisplayer/api/save";
import "./SurveyBlockModern.css";

interface SurveyBlockProps {
  survey: Survey;
  onDelete?: (id: string) => void;
}

const SurveyBlock: React.FC<SurveyBlockProps> = ({ survey, onDelete }) => {
  const { setDraggedItem } = useMouse();

  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent drag when clicking delete
    const target = e.target as HTMLElement;
    if (target.closest(".survey-card-delete")) return;
    setDraggedItem({ type: "survey", data: survey });
  };

  const handleDelete = async () => {
    try {
      console.log(`🗑️ Deleting survey ${survey.id}...`);
      await deleteSurveyById(survey.id);
      await deleteSurvey(survey.id);
      onDelete?.(survey.id);
      console.log(`✅ Survey ${survey.id} deleted successfully`);
    } catch (err) {
      console.error(`❌ Failed to delete survey ${survey.id}:`, err);
    }
  };

  const descriptionItem = survey.items.find(
    (item) => item.type === "description",
  );
  const shortDescription = descriptionItem
    ? descriptionItem.content.split(/\s+/).slice(0, 12).join(" ") + "..."
    : "";

  return (
    <div className="survey-card-wrapper">
      {/* ❌ Delete button OUTSIDE card */}
      <button className="survey-card-delete" onClick={handleDelete}>
        ×
      </button>

      <div className="survey-card" onMouseDown={handleMouseDown}>
        <div className="survey-card-body">
          <div className="survey-card-header">
            <p className="survey-card-title">Survey</p>
            <span className="survey-card-count">
              {survey.items.length} item{survey.items.length !== 1 ? "s" : ""}
            </span>
          </div>

          {shortDescription && (
            <p className="survey-card-description">{shortDescription}</p>
          )}

          <ul className="survey-card-list">
            {survey.items.slice(0, 3).map((item, index) => (
              <li key={index}>
                {item.type === "slider" && item.question}
                {item.type === "mcq" && item.question}
                {item.type === "qualtrics" && "Qualtrics Link"}
              </li>
            ))}
            {survey.items.length > 3 && (
              <li className="survey-card-more">...and more</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SurveyBlock;
