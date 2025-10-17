// GhostCard.tsx
import React from "react";
import "./QuestionCard.css"; // reuse existing styles
import { FaMicrophone } from "react-icons/fa";

const GhostCard: React.FC<{ item: any }> = ({ item }) => {
  if (!item || !item.type) return null;

  if (item.type === "question-card") {
    const { question, answers, difficulty, type } = item.data || {};
    const safeAnswers = Array.isArray(answers) ? answers.slice(0, 2) : [];

    return (
      <div className={`question-card ghost ${difficulty || "easy"}`}>
        <div className="question-header">
          <div className="question-text">{question}</div>
          <div className={`question-type ${type}`}>{type}</div>
        </div>
        <div className="answers-container">
          {type === "ai" ? (
            <div className="ai-ui">
              <div className="ai-mic-ring">
                <FaMicrophone size={20} />
              </div>
              <div className="ai-prompt">
                This is an AI interview-style question. Speak your answer.
              </div>
            </div>
          ) : (
            safeAnswers.map((a: string, i: number) => (
              <div key={i} className="answer-box">
                {a}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Future support for other types
  return null;
};

export default GhostCard;
