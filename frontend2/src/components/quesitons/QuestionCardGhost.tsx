// GhostCard.tsx
import React from "react";
import "./QuestionCardGhost.css";

interface GhostCardProps {
  item: {
    type: string;
    data?: {
      question?: string;
      answers?: string[];
      difficulty?: string;
      type?: string;
    };
  };
}

const GhostCard: React.FC<GhostCardProps> = ({ item }) => {
  if (!item || item.type !== "question-card") return null;

  const { question, answers, difficulty, type } = item.data || {};
  const safeAnswers = Array.isArray(answers) ? answers.slice(0, 2) : [];

  return (
    <div className={`qghost ${difficulty || "easy"}`}>
      <div className="qghost-header">
        <div className="qghost-question">{question || "Untitled Question"}</div>
        {type && <div className={`qghost-type ${type}`}>{type}</div>}
      </div>

      <div className="qghost-answers">
        {type === "slider" ? (
          <div className="qghost-slider" />
        ) : type === "short" ? (
          <div className="qghost-short">Short answer field</div>
        ) : (
          safeAnswers.map((a, i) => (
            <div key={i} className="qghost-answer">
              {a}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GhostCard;
