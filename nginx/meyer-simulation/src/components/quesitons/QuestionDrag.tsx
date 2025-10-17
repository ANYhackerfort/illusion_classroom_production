import React, { useState, useEffect } from "react";
import "./QuestionDrag.css";
import QuestionCard from "./QuestionCard";
import type { QuestionCardData } from "../../types/QuestionCard";
import { saveQuestion, getAllQuestions } from "../../indexDB/questionStorage";
import { v4 as uuidv4 } from "uuid";
import type { StoredQuestion } from "../../indexDB/questionStorage";

interface QuestionDropZoneProps {
  tabIndex: number;
}

const QuestionDropZone: React.FC<QuestionDropZoneProps> = ({ tabIndex }) => {
  const [parsedQuestions, setParsedQuestions] = useState<StoredQuestion[]>([]);

  useEffect(() => {
    const loadFromDB = async () => {
      const stored = await getAllQuestions();
      const filtered = stored.filter((q) => q.data.associatedTab === tabIndex);
      setParsedQuestions(filtered);
    };
    loadFromDB();
  }, [tabIndex]);

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === "text/plain") {
      const text = await file.text();

      const blocks = text.split(/\n\s*\n/);
      const questions: QuestionCardData[] = [];

      for (const block of blocks) {
        const lines = block
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

        const questionLine = lines.find((line) => line.startsWith("Q:"));
        const difficultyLine = lines.find((line) => line.startsWith("D:"));
        const typeLine = lines.find((line) => line.startsWith("T:"));
        const displayTypeLine = lines.find((line) =>
          line.startsWith("Display:"),
        );
        const showWinnerLine = lines.find((line) => line.startsWith("Winner:"));
        const liveLine = lines.find((line) => line.startsWith("Live:"));
        const answerLines = lines.filter((line) => line.startsWith("A:"));

        const difficulty = difficultyLine
          ?.replace(/^D:\s*/, "")
          .toLowerCase() as QuestionCardData["difficulty"];
        const type = typeLine
          ?.replace(/^T:\s*/, "")
          .toLowerCase() as QuestionCardData["type"];
        const minAnswers = ["short", "slider", "ai"].includes(type) ? 1 : 2;

        const displayType = displayTypeLine
          ?.replace(/^Display:\s*/, "")
          .toLowerCase() as QuestionCardData["displayType"];

        const showWinner =
          showWinnerLine?.replace(/^Winner:\s*/, "").toLowerCase() === "true";
        const live =
          liveLine?.replace(/^Live:\s*/, "").toLowerCase() === "true";

        if (
          questionLine &&
          ["easy", "medium", "hard"].includes(difficulty) &&
          ["slider", "short", "mc", "match", "rank", "ai"].includes(type) &&
          answerLines.length >= minAnswers
        ) {
          const newQuestion: QuestionCardData = {
            id: uuidv4(),
            question: questionLine.replace(/^Q:\s*/, ""),
            difficulty,
            type,
            answers: answerLines.map((a) => a.replace(/^A:\s*/, "")),
            displayType,
            showWinner,
            live,
            associatedTab: tabIndex, // ✅ tag it with current tab
          };
          questions.push(newQuestion);
          await saveQuestion(newQuestion);
        }
      }

      setParsedQuestions((prev) => [
        ...prev,
        ...questions.map((q) => ({ id: q.id, data: q })), // Wrap to StoredQuestion
      ]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="drop-zone" onDrop={handleDrop} onDragOver={handleDragOver}>
      {parsedQuestions.length === 0 ? (
        <div className="placeholder-text">
          Drag in a .txt file with questions, types, and difficulty
        </div>
      ) : (
        <div className="questions-masonry">
          {parsedQuestions.map((q) => (
            <QuestionCard
              key={q.data.id}
              id={q.data.id}
              question={q.data.question}
              answers={q.data.answers}
              difficulty={q.data.difficulty}
              type={q.data.type}
              displayType={q.data.displayType}
              showWinner={q.data.showWinner}
              live={q.data.live}
              onDelete={(id) => {
                setParsedQuestions((prev) =>
                  prev.filter((q) => q.data.id !== id),
                );
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default QuestionDropZone;
