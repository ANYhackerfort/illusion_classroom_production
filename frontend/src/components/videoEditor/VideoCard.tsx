import React, { useEffect, useState } from "react";
import "./VideoCard.css";
import SliderQuestion from "./questionProps/SliderQuestion";
import MCQQuestion from "./questionProps/MCQuestion";
import ShortAnswerQuestion from "./questionProps/ShortAnswer";
import { useParams } from "react-router-dom";
import { getBotAnswers } from '../videoDisplayer/api/save';
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
  currentTimeRef?: React.RefObject<number>;
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
}) => {
  const [botAnswersData, setBotAnswersData] = useState<GetBotAnswersResponse | null>(null);
  const { org_id, roomName } = useParams<{ org_id: string; roomName: string }>();

  // 🟡 Debug props
  useEffect(() => {
    console.log("🧩 [VideoQuestionCard Debug]");
    console.log("🟢 Question:", question);
    console.log("🟣 Type:", type);
    console.log("🟡 DisplayType:", displayType);
    console.log("🏆 showWinner:", showWinner);
    console.log("🔴 live:", live);
    console.log("✅ Correct Answers:", correctAnswers);
    console.log("🧮 Answers:", answers);
  }, [question, type, displayType, showWinner, live, correctAnswers, answers]);

  // 🧠 Fetch bot answers (refresh every 5s)
  useEffect(() => {
    if (!org_id || !roomName) return;

    const fetchBots = async () => {
      try {
        console.log(`📡 Fetching bot answers for org=${org_id}, room=${roomName}`);
        const data = await getBotAnswers(Number(org_id), roomName);
        setBotAnswersData(data);
      } catch (err) {
        console.error("❌ Failed to fetch bot answers:", err);
      }
    };

    fetchBots();
    const interval = setInterval(fetchBots, 5000); // refresh every 5 seconds
    return () => clearInterval(interval);
  }, [org_id, roomName]);

  const handleMouseDown = () => {
    console.log(`🖱️ Clicked card for ${question}`);
  };

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
            botAnswersData={botAnswersData ?? undefined} // 👈 pass live bot data
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
