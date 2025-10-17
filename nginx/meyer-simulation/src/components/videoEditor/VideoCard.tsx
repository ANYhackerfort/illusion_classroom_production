import React, { useState, useEffect } from "react";
import "./VideoCard.css";
import { FaMicrophone } from "react-icons/fa";
import SliderQuestion from "./questionProps/SliderQuestion";
import MCQQuestion from "./questionProps/MCQuestion";
import { getBotAnswersFromServer } from "../botEditor/interfaces/bot_drop";
import ShortAnswerQuestion from "./questionProps/ShortAnswer";
import { useParams } from "react-router-dom";

export interface BotAnswer {
  name: string;
  answer: string;
  timestamp: number;
  image_url: string; // ✅ in case image support is needed
}

interface QuestionCardProps {
  id: string;  // ✅ question ID for backend use
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
  meetingName: string;
}

const VideoQuestionCard: React.FC<QuestionCardProps> = ({
  id,
  question,
  answers,
  difficulty,
  type,
  displayType,
  showWinner,
  live,
  questionNumber,
  start,
  end,
  currentTimeRef,
  meetingName,
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
      console.log("Question type is", type)
      console.log("questiion is", question)
      try {
        const res = await getBotAnswersFromServer(
          roomName!,
          questionNumber!,
          start!,
          end!,
          answers!,
          id,
          type,
          question
        );

        if (res?.botAnswers) {
          setBotAnswers([]); // reset previous answers
          setBotAnswers(
            res.botAnswers.map((entry: any) => ({
              name: entry.name,
              answer: entry.answer,
              timestamp: entry.timestamp,
              image_url: entry.image_url,
            }))
          );
        }
      } catch (err) {
        console.error("Failed to fetch bot answers:", err);
      }
    };

    if (
      questionNumber !== undefined &&
      start !== undefined &&
      end !== undefined &&
      answers !== undefined
    ) {
      fetchBotAnswers();
    }
  }, []);

  useEffect(() => {
    if (botAnswers) {
      console.log("Bot Answers:", botAnswers);
      console.log("Current Time Ref:", currentTimeRef?.current);
    }
  }, [botAnswers]);

  const handleMouseDown = () => {
    console.log(displayTypeState);
  };

  return (
    <div
      className={`video-question-card ${difficulty}`}
      onMouseDown={handleMouseDown}
    >
      <div className="video-question-header">
        <div className="video-question-text">{question}</div>
        <div className={`video-question-type ${type}`}>
          {type.toUpperCase()}
        </div>
      </div>

      <div className="video-answers-container">
        {type === "slider" ? (
          <SliderQuestion
            answers={answers}
            displayState={displayTypeState}
            showWinner={showWinnerState}
            live={liveState}
          />
        ) : type === "short" ? (
          <ShortAnswerQuestion botAnswers={botAnswers} setBotAnswers={setBotAnswers} currentTimeRef={currentTimeRef}/> 
        ) : type === "match" ? (
          answers.map((answer, index) => (
            <div key={index} className="video-match-row">
              <div className="video-match-box">{answer}</div>
              <div className="video-match-box">?</div>
            </div>
          ))
        ) : type === "rank" ? (
          answers.map((answer, index) => (
            <div key={index} className="video-rank-row">
              <span className="video-rank-number">{index + 1}.</span>
              <span className="video-rank-text">{answer}</span>
            </div>
          ))
        ) : type === "ai" ? (
          <div className="video-ai-ui">
            <div className="video-ai-mic-ring">
              <FaMicrophone size={24} />
            </div>
            <div className="video-ai-prompt">
              This is an AI interview-style question. Speak your answer.
            </div>
          </div>
        ) : type === "mc" ? (
          <MCQQuestion answers={answers} botAnswers={botAnswers} setBotAnswers={setBotAnswers} currentTimeRef={currentTimeRef}/>
        ) : (
          answers.map((answer, index) => (
            <div key={index} className="video-answer-box">
              {answer}
            </div>
          ))
        )}
      </div>

      <div className="video-question-footer">
        <span className="footer-badge">{displayTypeState}</span>
        {showWinnerState && <span className="footer-badge">🏆 Winner</span>}
        {liveState && <span className="footer-badge">🔴 Live</span>}
      </div>
    </div>
  );
};

export default VideoQuestionCard;
