import React from "react";
import "./QuestionCard.css";
import { FaMicrophone } from "react-icons/fa";
import { useMouse } from "../../hooks/drag/MouseContext";
import type { QuestionCardData } from "../../types/QuestionCard";
import { deleteQuestionById } from "../../indexDB/questionStorage";

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
  onDelete,
}) => {
  const { setDraggedItem } = useMouse();

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
      },
    });
  };

  const handleAuxClick = async (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      console.log("Middle click detected, deleting question with id:", id);
      try {
        await deleteQuestionById(id); // This is the internal QuestionCardData id
        onDelete?.(id); // Call parent deletion handler
      } catch (error) {
        console.error("Failed to delete question with id:", id, error);
      }
    }
  };

  return (
    <div
      className={`question-card ${difficulty}`}
      onMouseDown={handleMouseDown}
      onAuxClick={handleAuxClick}
    >
      <div className="question-header">
        <div className="question-text">{question}</div>
        <div className={`question-type ${type}`}>{type}</div>
      </div>
      <div className="answers-container">
        {type === "slider" ? (
          <div className="slider-ui" />
        ) : type === "short" ? (
          <div className="short-ui" />
        ) : type === "match" ? (
          answers.map((answer, index) => (
            <div key={index} className="match-row">
              <div className="match-box">{answer}</div>
              <div className="match-box">?</div>
            </div>
          ))
        ) : type === "rank" ? (
          answers.map((answer, index) => (
            <div key={index} className="rank-row">
              <span className="rank-number">{index + 1}.</span>
              <span className="rank-text">{answer}</span>
            </div>
          ))
        ) : type === "ai" ? (
          <div className="ai-ui">
            <div className="ai-mic-ring">
              <FaMicrophone size={20} />
            </div>
            <div className="ai-prompt">
              This is an AI interview-style question. Speak your answer.
            </div>
          </div>
        ) : (
          answers.map((answer, index) => (
            <div key={index} className="answer-box">
              {answer}
            </div>
          ))
        )}
      </div>
      <div className="question-footer">
        <span className="footer-badge">{displayType ?? "anonymous"}</span>
        {showWinner && <span className="footer-badge">🏆 Winner</span>}
        {live && <span className="footer-badge">🔴 Live</span>}
      </div>
    </div>
  );
};

export default QuestionCard;
