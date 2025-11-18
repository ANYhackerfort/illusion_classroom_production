import React, { useState, useEffect } from "react";
import "./MCQuestion.css";
import { getUserInfo } from "../../../api/userApi";
import { storeVideoQuestionAnswers } from "../../../components/videoDisplayer/api/save";
import { useParams } from "react-router-dom";
import type { GetBotAnswersResponse } from "../../../components/videoDisplayer/api/save";

// ✅ Constants
export const REVEAL_THRESHOLD_SECONDS = 6; // seconds before end to reveal correct answers
export const CHECK_INTERVAL_MS = 300;      // how often to poll current time

// ✅ Props
interface MCQQuestionProps {
  answers: string[];
  questionId: string;
  displayType?: "face" | "initial" | "anonymous";
  showWinner?: boolean;
  correctAnswers?: string[];
  currentTimeRef: React.RefObject<number>;
  start?: number;
  end?: number;
  botAnswersData?: GetBotAnswersResponse; // 🧠 new prop for live bot answers
}

// ✅ Fallback anonymous image (clean and neutral look)
const ANON_IMAGE =
  "https://cdn-icons-png.flaticon.com/512/149/149071.png";

const MCQQuestion: React.FC<MCQQuestionProps> = ({
  answers,
  questionId,
  displayType = "anonymous",
  showWinner = false,
  correctAnswers = [],
  currentTimeRef,
  start = 0,
  end = 0,
  botAnswersData,
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{ name: string; picture: string }>({
    name: "Anonymous",
    picture: ANON_IMAGE,
  });
  const [winnerVisible, setWinnerVisible] = useState(false);
  const [botSelections, setBotSelections] = useState<
    { botName: string; imgUrl: string; answer: string }[]
  >([]);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  const { org_id, roomName } = useParams<{ org_id: string; roomName: string }>();

  // 🧠 Load user info
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getUserInfo();
        if (user?.name) {
          setUserInfo({
            name: user.name,
            picture: user.picture ?? ANON_IMAGE,
          });
          return;
        }
      } catch {}
      const localName = localStorage.getItem("participantName") || "Anonymous";
      const localPhoto =
        localStorage.getItem("capturedPhoto") || ANON_IMAGE;
      setUserInfo({ name: localName, picture: localPhoto });
    };
    loadUser();
  }, []);

  // 🕓 Timer and reveal logic
  useEffect(() => {
    if (!showWinner) return;

    const intervalId = setInterval(() => {
      const currentTime = currentTimeRef.current ?? 0;
      const secondsRemaining = end - currentTime;

      // timer before reveal (subtract 6)
      const beforeReveal = Math.max(end - REVEAL_THRESHOLD_SECONDS - currentTime, 0);
      setTimeRemaining(beforeReveal);

      if (secondsRemaining <= REVEAL_THRESHOLD_SECONDS) {
        setWinnerVisible(true);
      } else {
        setWinnerVisible(false);
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [showWinner, end, currentTimeRef]);

  // 🤖 Track bot responses
  useEffect(() => {
    if (!botAnswersData || !currentTimeRef) return;

    const botsForThisQuestion = botAnswersData.bots
      .map((bot) => {
        const entry = bot.answers.find(
          (a) => String(a.question_id) === String(questionId)
        );
        return entry
          ? {
              botName: bot.name,
              imgUrl: bot.image_url || ANON_IMAGE,
              possibleAnswers: entry.answers,
              triggerTime: entry.answer_time,
            }
          : null;
      })
      .filter(Boolean) as {
        botName: string;
        imgUrl: string;
        possibleAnswers: string[];
        triggerTime: number;
      }[];

    const interval = setInterval(() => {
      const now = currentTimeRef.current ?? 0;
      const visibleBots = botsForThisQuestion
        .filter((bot) => now >= bot.triggerTime)
        .map((bot) => ({
          botName: bot.botName,
          imgUrl: bot.imgUrl,
          answer:
            bot.possibleAnswers?.[0] ??
            answers[Math.floor(Math.random() * answers.length)],
        }));

      setBotSelections(visibleBots);
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [botAnswersData, questionId, currentTimeRef, start, end]);

  // ✅ Handle user selection (disabled after reveal)
  const handleClick = async (index: number) => {
    if (winnerVisible) return;

    // ⭐ Require participant_id (user must join first)
    const participantId = localStorage.getItem("participant_id");
    if (!participantId) {
      console.warn("❌ No participant_id found — cannot submit answer.");
      return;
    }

    const answer = answers[index];
    setSelectedAnswer(answer);

    if (org_id && roomName && questionId) {
      await storeVideoQuestionAnswers(
        Number(org_id),
        roomName,
        questionId,
        participantId,          // ⭐ use ID, not name
        { answers: [answer] }   // ⭐ single answer array
      );
    }
  };


  // ✅ Avatar renderer
  const renderAvatar = (name: string, imgUrl: string) => {
    if (displayType === "face") {
      return (
        <div className="mcq-avatar fade-in">
          <img src={imgUrl || ANON_IMAGE} alt={name} title={name} />
        </div>
      );
    } else if (displayType === "initial") {
      return (
        <div className="mcq-avatar-initial fade-in">
          {name.charAt(0).toUpperCase()}
        </div>
      );
    } else {
      return (
        <div className="mcq-avatar-anon fade-in">
          <img src={ANON_IMAGE} alt="Anon" />
        </div>
      );
    }
  };

  return (
    <div className="mcq-wrap">
      {/* 🕓 Timer Display */}
      {showWinner && (
        <div className="mcq-timer">
          {timeRemaining > 0
            ? `⏳ Reveal in ${timeRemaining.toFixed(1)}s`
            : winnerVisible
            ? "✅ Answers revealed"
            : ""}
        </div>
      )}

      <div className={`mcq-answers ${winnerVisible ? "reveal-active" : ""}`}>
        {answers.map((answer, index) => {
          const userSelected = selectedAnswer === answer;
          const botsHere = botSelections.filter((b) => b.answer === answer);

          return (
            <div
              key={index}
              className={`mcq-answer-box ${userSelected ? "selected" : ""} ${
                winnerVisible && correctAnswers.includes(answer) ? "correct" : ""
              }`}
              onClick={() => handleClick(index)}
            >
              <div className="mcq-answer-top">
                <span className="mcq-answer-text">{answer}</span>
              </div>

              <div className="mcq-avatars-row">
                {userSelected && renderAvatar(userInfo.name, userInfo.picture)}
                {botsHere.map((b, i) => (
                  <React.Fragment key={i}>
                    {renderAvatar(b.botName, b.imgUrl)}
                  </React.Fragment>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MCQQuestion;
