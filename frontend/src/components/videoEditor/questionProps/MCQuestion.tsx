import React, { useState, useEffect } from "react";
import "./MCQuestion.css";
import { getUserInfo } from "../../../api/userApi";
import { storeVideoQuestionAnswers } from "../../../components/videoDisplayer/api/save";
import { useParams } from "react-router-dom";
import type { GetBotAnswersResponse } from "../../../components/videoDisplayer/api/save";

interface MCQQuestionProps {
  answers: string[];
  questionId: string;
  displayType?: "face" | "initial" | "anonymous";
  showWinner?: boolean;
  correctAnswers?: string[];
  currentTimeRef?: React.RefObject<number>;
  start?: number;
  end?: number;
  botAnswersData?: GetBotAnswersResponse;
}

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
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [userInfo, setUserInfo] = useState<{ name: string; picture: string }>({
    name: "Anonymous",
    picture:
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?fit=crop&w=400&q=80",
  });
  const [winnerVisible, setWinnerVisible] = useState(false);
  const [botSelections, setBotSelections] = useState<
    { botName: string; imgUrl: string; answer: string }[]
  >([]);

  const { org_id, roomName } = useParams<{ org_id: string; roomName: string }>();

  // ✅ Load user info
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getUserInfo();
        if (user?.name) {
          setUserInfo({
            name: user.name,
            picture:
              user.picture ??
              "https://images.unsplash.com/photo-1509042239860-f550ce710b93?fit=crop&w=400&q=80",
          });
          return;
        }
      } catch {}
      const localName = localStorage.getItem("participantName") || "Anonymous";
      const localPhoto =
        localStorage.getItem("capturedPhoto") ||
        "https://images.unsplash.com/photo-1509042239860-f550ce710b93?fit=crop&w=400&q=80";
      setUserInfo({ name: localName, picture: localPhoto });
    };
    loadUser();
  }, []);

  // ✅ Reveal correct answers near end
  useEffect(() => {
    if (!showWinner || !currentTimeRef || !end || winnerVisible) return;
    const interval = setInterval(() => {
      const now = currentTimeRef.current ?? 0;
      if (end - now <= 6) setWinnerVisible(true);
    }, 300);
    return () => clearInterval(interval);
  }, [showWinner, currentTimeRef, end, winnerVisible]);

  // ✅ Bot appearance: at 3–7 s after start
useEffect(() => {
  if (!botAnswersData || !currentTimeRef || !start || !end) return;

  const triggerOffsets = [3, 4, 5, 6, 7]; // seconds after start

  const bots = botAnswersData.bots
    .filter((bot) => Array.isArray(bot.answers))
    .map((bot) => {
      const match = bot.answers.find(
        (a) => a && a.question_id?.toString() === questionId
      );
      if (!match) return null;
      return {
        botName: bot.name || `AnonBot${Math.floor(Math.random() * 1000)}`,
        imgUrl: bot.img_url || "",
        possibleAnswers: Array.isArray(match.answers) ? match.answers : [],
        triggerTime:
          start + triggerOffsets[Math.floor(Math.random() * triggerOffsets.length)],
      };
    })
    .filter(Boolean) as {
      botName: string;
      imgUrl: string;
      possibleAnswers: string[];
      triggerTime: number;
    }[];

  if (!bots.length) return;
  setBotSelections([]); // reset each segment

  const shownBots = new Set<string>();

  const interval = setInterval(() => {
    const now = currentTimeRef.current ?? 0;

    bots.forEach((bot) => {
      // ✅ Show bot once when video time >= its trigger time
      if (!shownBots.has(bot.botName) && now >= bot.triggerTime) {
        shownBots.add(bot.botName);

        const chosen =
          bot.possibleAnswers[
            Math.floor(Math.random() * bot.possibleAnswers.length)
          ] ?? answers[Math.floor(Math.random() * answers.length)];

        setBotSelections((prev) => [
          ...prev,
          { botName: bot.botName, imgUrl: bot.imgUrl, answer: chosen },
        ]);
      }
    });
  }, 250); // check 4x per second

  return () => clearInterval(interval);
}, [botAnswersData, start, end, questionId]);


  // ✅ User click
  const handleClick = async (index: number) => {
    const answer = answers[index];
    setSelectedAnswers((prev) => {
      const updated = prev.includes(answer)
        ? prev.filter((a) => a !== answer)
        : [...prev, answer];
      const participantName =
        localStorage.getItem("participantName") || userInfo.name;

      if (org_id && roomName && questionId) {
        storeVideoQuestionAnswers(
          Number(org_id),
          roomName,
          questionId,
          participantName,
          { answers: updated }
        );
      }
      return updated;
    });
  };

  // ✅ Render user avatar
  const renderAvatar = () => {
    if (displayType === "face") {
      return (
        <img
          className="mcq-avatar-bot fade-in"
          src={userInfo.picture}
          alt={userInfo.name}
          title={userInfo.name}
        />
      );
    } else if (displayType === "initial") {
      return (
        <div className="mcq-avatar-initial fade-in">
          {userInfo.name.charAt(0).toUpperCase()}
        </div>
      );
    } else {
      return <div className="mcq-avatar-anon fade-in" />;
    }
  };

  return (
    <div className="mcq-wrap">
      <div className="mcq-answers">
        {answers.map((answer, index) => {
          const userSelected = selectedAnswers.includes(answer);
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
                {userSelected && renderAvatar()}
                {botsHere.map((b, i) => (
                  <React.Fragment key={i}>
                    {displayType === "face" && b.imgUrl ? (
                      <img
                        className="mcq-avatar-bot fade-in"
                        src={b.imgUrl}
                        alt={b.botName}
                        title={b.botName}
                      />
                    ) : displayType === "initial" ? (
                      <div className="mcq-avatar-initial fade-in">
                        {b.botName.charAt(0).toUpperCase()}
                      </div>
                    ) : (
                      <div className="mcq-avatar-anon fade-in" />
                    )}
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
