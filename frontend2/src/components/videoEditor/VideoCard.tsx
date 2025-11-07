import React, { useEffect } from "react";
import "./VideoCard.css";
import SliderQuestion from "./questionProps/SliderQuestion";
import MCQQuestion from "./questionProps/MCQuestion";
import ShortAnswerQuestion from "./questionProps/ShortAnswer";
import type { GetBotAnswersResponse } from "../videoDisplayer/api/save";

export interface BotAnswer {
  name: string;
  answer: string;
  timestamp: number;
  image_url: string;
}

interface QuestionCardProps {
  id?: string;
  question: string;
  answers: string[];
  correctAnswers?: string[];
  difficulty: "easy" | "medium" | "hard";
  type: "slider" | "short" | "mc" | "match" | "rank" | "ai";
  displayType?: "face" | "initial" | "anonymous";
  showWinner?: boolean;
  live?: boolean;
  questionNumber?: number;
  start?: number;
  end?: number;
  currentTimeRef: React.RefObject<number>;
  botAnswersData?: GetBotAnswersResponse; // ✅ Now passed in as a prop
}

const VideoQuestionCard: React.FC<QuestionCardProps> = ({
  id,
  question,
  answers,
  correctAnswers = [],
  type,
  displayType = "anonymous",
  showWinner = false,
  live = true,
  start,
  end,
  currentTimeRef,
  botAnswersData,
}) => {
  const handleMouseDown = () => {
    console.log(`🖱️ Clicked card for ${question}`);
  };

  useEffect(() => {
  if (!botAnswersData) {
    console.log("🤖 No botAnswersData yet for", question);
    return;
  }

  console.log("🤖 [VideoQuestionCard] Bot answers received:", {
    questionId: id,
    question,
    botCount: botAnswersData.bots?.length ?? 0,
    bots: botAnswersData.bots.map((b) => ({
      name: b.name,
      answers: b.answers.map((a) => ({
        question_id: a.question_id,
        question: a.question,
        answer_time: a.answer_time,
      })),
    })),
  });
}, [botAnswersData, id, question]);


  return (
    <div className="vq-card" onMouseDown={handleMouseDown}>
      <div className="vq-header">
        <div className="vq-text">{question}</div>
        <div className={`vq-type ${type}`}>{type.toUpperCase()}</div>
      </div>

      <div className="vq-answers">
        {type === "slider" ? (
          <SliderQuestion
            answers={answers}
            displayState={displayType}
            showWinner={showWinner}
            live={live}
          />
        ) : type === "short" ? (
          <ShortAnswerQuestion
            botAnswers={[]}
            setBotAnswers={() => {}}
            currentTimeRef={currentTimeRef}
          />
        ) : type === "mc" ? (
          <MCQQuestion
            answers={answers}
            questionId={id!}
            currentTimeRef={currentTimeRef}
            displayType={displayType}
            showWinner={showWinner}
            correctAnswers={correctAnswers}
            start={start}
            end={end}
            botAnswersData={botAnswersData} // ✅ passed in from parent
          />
        ) : (
          answers.map((answer, index) => (
            <div key={index} className="vq-answer-box">
              {answer}
            </div>
          ))
        )}
      </div>

      <div className="vq-footer">
        <span className="vq-badge">{displayType}</span>
        {showWinner && <span className="vq-badge">🏆 Winner</span>}
        {live && <span className="vq-badge">🔴 Live</span>}
      </div>
    </div>
  );
};

export default VideoQuestionCard;
