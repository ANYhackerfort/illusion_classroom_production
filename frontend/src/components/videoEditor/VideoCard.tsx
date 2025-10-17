import React, { useState, useEffect } from "react";
import "./VideoCard.css"; // renamed CSS
import { FaMicrophone } from "react-icons/fa";
import SliderQuestion from "./questionProps/SliderQuestion";
import MCQQuestion from "./questionProps/MCQuestion";
import ShortAnswerQuestion from "./questionProps/ShortAnswer";
import { useParams } from "react-router-dom";

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
  difficulty: "easy" | "medium" | "hard";
  type: "slider" | "short" | "mc" | "match" | "rank" | "ai";
  displayType?: "face" | "initial" | "anonymous";
  showWinner?: boolean;
  live?: boolean;
  questionNumber?: number;
  start?: number;
  end?: number;
  currentTimeRef?: React.RefObject<number>;
}

const VideoQuestionCard: React.FC<QuestionCardProps> = ({
  id,
  question,
  answers,
  // difficulty,
  type,
  displayType,
  showWinner,
  live,
  questionNumber,
  start,
  end,
  currentTimeRef,
}) => {
  const [displayTypeState] = useState<"face" | "initial" | "anonymous">(
    displayType ?? "anonymous"
  );
  const [showWinnerState] = useState<boolean>(showWinner ?? false);
  const [liveState] = useState<boolean>(live ?? false);
  const [botAnswers, setBotAnswers] = useState<BotAnswer[] | null>(null);

  const { roomName } = useParams();

  useEffect(() => {
    const fetchBotAnswers = async () => {
      console.log("Question type is", type);
      console.log("Question is", question);
      // placeholder for backend fetch if needed
    };

    if (
      id &&
      questionNumber !== undefined &&
      start !== undefined &&
      end !== undefined &&
      answers !== undefined
    ) {
      fetchBotAnswers();
    }
  }, [id, questionNumber, start, end, answers, roomName, type, question]);

  const handleMouseDown = () => {
    console.log(displayTypeState);
  };

  return (
    <div
      className={"vq-card"}
      onMouseDown={handleMouseDown}
    >
      <div className="vq-header">
        <div className="vq-text">{question}</div>
        <div className={`vq-type ${type}`}>{type.toUpperCase()}</div>
      </div>

      <div className="vq-answers">
        {type === "slider" ? (
          <SliderQuestion
            answers={answers}
            displayState={displayTypeState}
            showWinner={showWinnerState}
            live={liveState}
          />
        ) : type === "short" ? (
          <ShortAnswerQuestion
            botAnswers={botAnswers}
            setBotAnswers={setBotAnswers}
            currentTimeRef={currentTimeRef}
          />
        ) : type === "match" ? (
          answers.map((answer, index) => (
            <div key={index} className="vq-match-row">
              <div className="vq-match-box">{answer}</div>
              <div className="vq-match-box">?</div>
            </div>
          ))
        ) : type === "rank" ? (
          answers.map((answer, index) => (
            <div key={index} className="vq-rank-row">
              <span className="vq-rank-number">{index + 1}.</span>
              <span className="vq-rank-text">{answer}</span>
            </div>
          ))
        ) : type === "ai" ? (
          <div className="vq-ai-ui">
            <div className="vq-ai-mic-ring">
              <FaMicrophone size={24} />
            </div>
            <div className="vq-ai-prompt">
              This is an AI interview-style question. Speak your answer.
            </div>
          </div>
        ) : type === "mc" ? (
          <MCQQuestion
            answers={answers}
            botAnswers={botAnswers}
            setBotAnswers={setBotAnswers}
            currentTimeRef={currentTimeRef}
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
        <span className="vq-badge">{displayTypeState}</span>
        {showWinnerState && <span className="vq-badge">🏆 Winner</span>}
        {liveState && <span className="vq-badge">🔴 Live</span>}
      </div>
    </div>
  );
};

export default VideoQuestionCard;
