import React, { useState, useEffect } from "react";
import "./MCQuestion.css";
import { getUserInfo } from "../../../api/userApi";
import { storeVideoQuestionAnswers } from "../../../components/videoDisplayer/api/save";
import { useParams } from "react-router-dom";
import type { GetBotAnswersResponse } from "../../../components/videoDisplayer/api/save";

// Constants
export const REVEAL_THRESHOLD_SECONDS = 6;
export const CHECK_INTERVAL_MS = 300;

interface MCQQuestionProps {
  answers: string[];
  questionId: string;
  displayType?: "face" | "initial" | "anonymous";
  showWinner?: boolean;
  correctAnswers?: string[];
  currentTimeRef: React.RefObject<number>;
  start?: number;
  end?: number;
  botAnswersData?: GetBotAnswersResponse;
}

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

  // Load user info
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

  // Timer reveal logic
  useEffect(() => {
    if (!showWinner) return;

    const intervalId = setInterval(() => {
      const currentTime = currentTimeRef.current ?? 0;
      const secondsRemaining = end - currentTime;

      const beforeReveal = Math.max(end - REVEAL_THRESHOLD_SECONDS - currentTime, 0);
      setTimeRemaining(beforeReveal);

      setWinnerVisible(secondsRemaining <= REVEAL_THRESHOLD_SECONDS);
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [showWinner, end, currentTimeRef]);

  // Bot answers
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

  // Handle user selection
  const handleClick = async (index: number) => {
    if (winnerVisible) return;

    const participantId = localStorage.getItem("participant_id");
    if (!participantId) return;

    const rawAnswer = answers[index]; // keep EXCEPTION tag
    const cleanAnswer = rawAnswer.replace("[EXCEPTION:SKIP]", "").trim();

    // UI uses clean answer
    setSelectedAnswer(cleanAnswer);

    if (org_id && roomName && questionId) {
      // Backend receives the RAW answer including tag
      await storeVideoQuestionAnswers(
        Number(org_id),
        roomName,
        questionId,
        participantId,
        { answers: [rawAnswer] }
      );
    }
  };

  // Avatar renderer
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
          const isSkip = answer.includes("[EXCEPTION:SKIP]");
          const cleanAnswer = answer.replace("[EXCEPTION:SKIP]", "").trim();

          const userSelected = selectedAnswer === cleanAnswer;

          // Bots use clean answers too
          const botsHere = botSelections.filter((b) => b.answer === cleanAnswer);

          // Skip answers NEVER highlight correct/incorrect
          const isCorrect =
            !isSkip &&
            winnerVisible &&
            correctAnswers.includes(cleanAnswer);

          const isWrong =
            !isSkip &&
            winnerVisible &&
            !correctAnswers.includes(cleanAnswer) &&
            userSelected;

          return (
            <div
              key={index}
              className={`mcq-answer-box 
                ${userSelected ? "selected" : ""} 
                ${isCorrect ? "correct" : ""} 
                ${isWrong ? "wrong" : ""} 
                ${isSkip ? "skip-gray" : ""}
              `}
              onClick={() => handleClick(index)}
            >
              <div className="mcq-answer-top">
                <span className="mcq-answer-text">{cleanAnswer}</span>
              </div>

              <div className="mcq-avatars-row">
                {/* user always anonymous for skip answers */}
                {userSelected &&
                  (isSkip
                    ? renderAvatar("Anonymous", ANON_IMAGE)
                    : renderAvatar(userInfo.name, userInfo.picture))
                }

                {/* bots */}
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
