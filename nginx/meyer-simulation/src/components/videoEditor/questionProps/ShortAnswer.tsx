import React, { useState, useEffect } from "react";
import "./ShortAnswer.css";
import type { BotAnswer } from "../VideoCard";
import { getUserInfo } from "../../../api/userApi";

const getAvatarForUser = () =>
  "https://i.pravatar.cc/64?img=" + (Math.floor(Math.random() * 70) + 1);

interface ShortAnswerQuestionProps {
  placeholder?: string;
  botAnswers: BotAnswer[] | null; // passed from parent
  setBotAnswers: React.Dispatch<React.SetStateAction<BotAnswer[] | null>>; // parent updates
  currentTimeRef?: React.RefObject<number>;
}

const ShortAnswerQuestion: React.FC<ShortAnswerQuestionProps> = ({
  placeholder = "Type your answer and press Enter...",
  botAnswers,
  setBotAnswers,
  currentTimeRef,
}) => {
  const [input, setInput] = useState("");
  const [visibleAnswers, setVisibleAnswers] = useState<BotAnswer[]>([]);
  const [userInfo, setUserInfo] = useState<{ name: string; picture: string } | null>(null);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim() && userInfo) {
      const newAnswer: BotAnswer = {
        name: userInfo.name,
        answer: input.trim(),
        timestamp: currentTimeRef?.current ?? 0,
        image_url: userInfo.picture,
      };

      setBotAnswers((prev) => [...(prev ?? []), newAnswer]);
      setInput("");
    }
  };

  // Display answers based on timestamp order
  useEffect(() => {
    if (!botAnswers || botAnswers.length === 0 || !currentTimeRef) return;

    const sorted = [...botAnswers].sort((a, b) => a.timestamp - b.timestamp);

    const tick = () => {
      const now = currentTimeRef.current ?? 0;
      // Filter answers that should be visible
      const visible = sorted.filter(ans => ans.timestamp <= now);

      setVisibleAnswers(visible);

      requestAnimationFrame(tick);
    };

    const raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [botAnswers, currentTimeRef]);


  return (
    <div className="shortq-wrap">
      <input
        className="shortq-input"
        type="text"
        placeholder={placeholder}
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />

      {visibleAnswers.map((ans, i) => (
        <div key={i} className="shortq-answer-display">
          {ans.image_url && (
            <img src={ans.image_url} className="shortq-avatar" alt={ans.name} />
          )}
          <span className="shortq-answer-text">
            <b>{ans.name}:</b> {ans.answer}
          </span>
        </div>
      ))}
    </div>
  );
};

export default ShortAnswerQuestion;
