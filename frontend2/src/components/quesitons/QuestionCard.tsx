import React, { useEffect, useState } from "react";
import "./QuestionCard.css";
import { useMouse } from "../../hooks/drag/MouseContext";
import type { QuestionCardData } from "../../types/QuestionCard";
import { deleteQuestionById } from "../../indexDB/questionStorage";
import { deleteQuestionCard } from "../videoDisplayer/api/save";

interface QuestionCardProps extends QuestionCardData {
  onDelete?: (id: string) => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  id,
  question,
  answers,
  difficulty,
  type,
  displayType,
  showWinner,
  live,
  correctAnswer,
  onDelete,
}) => {
  const { setDraggedItem } = useMouse();
  const [correctSet, setCorrectSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!correctAnswer) {
      setCorrectSet(new Set());
      return;
    }
    const arr = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
    setCorrectSet(new Set(arr));
  }, [correctAnswer]);

  const handleMouseDown = () => {
    setDraggedItem({
      type: "question-card",
      data: {
        id,
        question,
        answers,
        difficulty,
        type,
        displayType: displayType ?? "anonymous",
        showWinner: showWinner ?? false,
        live: live ?? false,
        correctAnswer,
      },
    });
  };

  const handleDelete = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      console.log(`🗑️ Deleting question ${id}...`);
      await deleteQuestionById(id);
      await deleteQuestionCard(id);
      onDelete?.(id);
    } catch (error) {
      console.error(`❌ Failed to delete question ${id}:`, error);
    }
  };

  const handleAuxClick = async (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      await handleDelete(e);
    }
  };

  return (
    <div
      className={`qcard ${difficulty}`}
      onMouseDown={handleMouseDown}
      onAuxClick={handleAuxClick}
    >
      {/* Delete button */}
      <button
        className="qcard-delete"
        onClick={handleDelete}
        title="Delete question"
      >
        ×
      </button>

      {/* Header */}
      <div className="qcard-header">
        <div className="qcard-question">{question}</div>
        <div className={`qcard-type ${type}`}>{type}</div>
      </div>

      {/* Answers */}
      <div className="qcard-answers">
        {type === "slider" ? (
          <div className="qcard-slider" />
        ) : type === "short" ? (
          <div className="qcard-short" />
        ) : (
          answers.map((answer, index) => {
            const isCorrect = correctSet.has(answer);
            const displayText =
              answer.length > 35 ? answer.slice(0, 35) + "..." : answer;
            return (
              <div
                key={index}
                className={`qcard-answer ${isCorrect ? "correct" : ""}`}
                title={isCorrect ? "Correct answer" : undefined}
              >
                {displayText}
              </div>
            );
          })
        )}
      </div>

      {/* Correct answer display */}
      {correctSet.size > 0 && (
        <div className="qcard-correct">
          Correct Answer:{" "}
          <span className="qcard-correct-text">
            {[...correctSet].join(", ")}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="qcard-footer">
        <span className="qfoot-item">
          <strong>Display:</strong> {displayType ?? "anonymous"}
        </span>
        <span className="qfoot-item">
          <strong>Show Correct:</strong> {showWinner ? "Yes" : "No"}
        </span>
        <span className="qfoot-item">
          <strong>Live:</strong> {live ? "Yes" : "No"}
        </span>
      </div>
    </div>
  );
};

export default QuestionCard;
