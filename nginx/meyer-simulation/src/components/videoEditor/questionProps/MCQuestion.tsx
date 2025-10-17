import React, { useState, useEffect } from "react";
import "./MCQuestion.css";
import type { BotAnswer } from "../VideoCard";
import { getUserInfo } from "../../../api/userApi";

interface MCQQuestionProps {
  answers: string[];
  botAnswers: BotAnswer[] | null; // passed from parent
  setBotAnswers: React.Dispatch<React.SetStateAction<BotAnswer[] | null>>; // parent updates
  currentTimeRef?: React.RefObject<number>;
}

const MCQQuestion: React.FC<MCQQuestionProps> = ({
  answers,
  botAnswers,
  setBotAnswers,
  currentTimeRef,
}) => {
  const [visibleAnswers, setVisibleAnswers] = useState<BotAnswer[]>([]);
  const [userInfo, setUserInfo] = useState<{ name: string; picture: string } | null>(null);

  // Load user info once
  useEffect(() => {
    getUserInfo()
      .then((user) => {
        setUserInfo({
          name: user.name,
          picture:
            user.picture ??
            "https://images.unsplash.com/photo-1509042239860-f550ce710b93?fit=crop&w=400&q=80",
        });
      })
      .catch(() => {
        setUserInfo({
          name: "Anonymous",
          picture:
            "https://images.unsplash.com/photo-1509042239860-f550ce710b93?fit=crop&w=400&q=80",
        });
      });
  }, []);

  // Handle user clicking an option
  const handleClick = (index: number) => {
    if (!userInfo) return;

    const newAnswer: BotAnswer = {
      name: userInfo.name,
      answer: answers[index],
      timestamp: currentTimeRef?.current ?? 0,
      image_url: userInfo.picture,
    };

    setBotAnswers((prev) => [...(prev ?? []), newAnswer]);
  };

  // Reveal answers based on timestamp + currentTimeRef
  useEffect(() => {
    if (!botAnswers || botAnswers.length === 0 || !currentTimeRef) return;

    const sorted = [...botAnswers].sort((a, b) => a.timestamp - b.timestamp);

    const tick = () => {
      const now = currentTimeRef.current ?? 0;
      const visible = sorted.filter((ans) => ans.timestamp <= now);
      setVisibleAnswers(visible);

      requestAnimationFrame(tick);
    };

    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [botAnswers, currentTimeRef]);

  return (
    <div className="mcq-wrap">
      <div className="mcq-answers">
        {answers.map((answer, index) => {
          // Avatars of people who picked this answer
          const avatarsForAnswer = visibleAnswers.filter(
            (ans) => ans.answer === answer
          );

          return (
            <div
              key={index}
              className="mcq-answer-box"
              onClick={() => handleClick(index)}
            >
              <span className="mcq-answer-text">{answer}</span>
              <div className="mcq-avatars-right">
                {avatarsForAnswer.map((ans, idx) => (
                  <img
                    key={`${ans.name}-${idx}`}
                    className="mcq-avatar"
                    src={ans.image_url}
                    alt={ans.name}
                    style={{ right: `${idx * 36}px` }}
                  />
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
