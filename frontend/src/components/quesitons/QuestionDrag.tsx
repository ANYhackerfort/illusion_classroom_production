import React, { useState, useEffect, useRef } from "react";
import "./QuestionDrag.css";
import QuestionCard from "./QuestionCard";
import type { QuestionCardData } from "../../types/QuestionCard";
import {
  saveQuestion,
  getAllQuestions,
  deleteQuestionById,
  clearAllQuestions,
  type StoredQuestion,
} from "../../indexDB/questionStorage";
import { useParams } from "react-router-dom";
import {
  getMeetingId,
  getAllQuestionCards,
  saveQuestionToBackend,
  getQuestionCardById,
} from "../videoDisplayer/api/save";
import { useOrgSocketContext } from "../../finder/socket/OrgSocketContext";

interface QuestionDropZoneProps {
  tabIndex?: number;
  userChecked?: boolean;
  orgChecked?: boolean;
  selectedIndex: number;
}

const QuestionDropZone: React.FC<QuestionDropZoneProps> = ({
  tabIndex,
  userChecked = false,
  orgChecked = false,
  selectedIndex,
}) => {
  const [displayQuestionCards, setDisplayQuestionCards] = useState<
    StoredQuestion[]
  >([]);
  const { org_id, roomName } = useParams<{
    org_id: string;
    roomName: string;
  }>();
  const { socket } = useOrgSocketContext();
  const currentMeetingIdRef = useRef<string | null>(null);

  // ===============================
  // 1️⃣ Sync questions from backend
  // ===============================
  useEffect(() => {
    const syncFromBackend = async () => {
      console.log("🔄 Syncing questions from backend...");
      if (!org_id) return;

      try {
        await clearAllQuestions();
        const backendQuestions = await getAllQuestionCards(Number(org_id));
        console.log("BACKEDN AQUESITON ARE", backendQuestions)
        for (const q of backendQuestions) {
          const data: QuestionCardData = {
            id: String(q.id),
            question: q.question,
            difficulty: q.difficulty,
            type: q.type,
            answers: q.answers,
            displayType: q.displayType,
            showWinner: q.showWinner,
            live: q.live,
            associatedTab: tabIndex ?? 1,
            correctAnswer:
              Array.isArray(q.correctAnswers) && q.correctAnswers.length > 0
                ? q.correctAnswers.join(", ")
                : q.correctAnswers || undefined,
          };

          await saveQuestion(String(q.id), data, String(q.meeting_id ?? ""));
        }

        console.log("💾 Questions synced to IndexedDB.");
        await loadFromIndexedDB();
      } catch (err) {
        console.error("❌ Failed to sync questions from backend:", err);
      }
    };

    syncFromBackend();
  }, [selectedIndex, org_id]);

  // ===============================
  // 2️⃣ Fetch current meeting ID
  // ===============================
  useEffect(() => {
    const fetchMeetingId = async () => {
      if (!org_id || !roomName) return;
      const id = await getMeetingId(Number(org_id), roomName);
      if (id) currentMeetingIdRef.current = String(id);
    };
    fetchMeetingId();
  }, [org_id, roomName]);

  // ===============================
  // 3️⃣ Load questions from IndexedDB
  // ===============================
  const loadFromIndexedDB = async () => {
    console.log("💾 Loading questions from IndexedDB...");
    if (!userChecked && !orgChecked) {
      setDisplayQuestionCards([]);
      return;
    }

    const localQuestions = await getAllQuestions();
    let filtered = localQuestions;

    if (userChecked && !orgChecked && currentMeetingIdRef.current) {
      filtered = localQuestions.filter(
        (q) => q.associated_meeting_id === currentMeetingIdRef.current,
      );
    } else if (orgChecked && !userChecked) {
      filtered = localQuestions.filter(
        (q) => q.associated_meeting_id !== currentMeetingIdRef.current,
      );
    }

    setDisplayQuestionCards(filtered);
  };

  useEffect(() => {
    loadFromIndexedDB();
  }, [userChecked, orgChecked]);

  // ===============================
  // 4️⃣ Handle WebSocket updates
  // ===============================
  useEffect(() => {
    if (!socket) return;

    const handleMessage = async (event: MessageEvent) => {
      const msg = JSON.parse(event.data);
      if (msg.type !== "org_update" || msg.category !== "question") return;

      const { action, payload } = msg;
      const questionId = String(payload?.id || "");
      if (!questionId) return;

      switch (action) {
        case "delete":
          await deleteQuestionById(questionId);
          setDisplayQuestionCards((prev) =>
            prev.filter((q) => q.id !== questionId),
          );
          break;

        case "create": {
          console.log("GOT A CREATE ORDER", msg)
          const q = await getQuestionCardById(questionId);
          if (!q) return;

          const associatedMeetingId = String(q.meeting_id ?? "");
          const isCurrentMeeting =
            String(associatedMeetingId) === String(currentMeetingIdRef.current);

          // filter logic: show only when relevant
          if (
            (!userChecked && orgChecked && isCurrentMeeting) ||
            (userChecked && !orgChecked && !isCurrentMeeting)
          )
            return;

          const data: QuestionCardData = {
            id: String(q.id),
            question: q.question,
            difficulty: q.difficulty,
            type: q.type,
            answers: q.answers,
            displayType: q.displayType,
            showWinner: q.showWinner,
            live: q.live,
            associatedTab: tabIndex ?? 1,
            correctAnswer:
              Array.isArray(q.correctAnswers) && q.correctAnswers.length > 0
                ? q.correctAnswers.join(", ")
                : q.correctAnswers || undefined,
          };

          await saveQuestion(String(q.id), data, associatedMeetingId);
          setDisplayQuestionCards((prev) => [
            ...prev,
            {
              id: String(q.id),
              data,
              associated_meeting_id: associatedMeetingId,
            },
          ]);
          break;
        }

        default:
          console.warn("⚠️ Unknown org_update action:", action);
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket, userChecked, orgChecked]);

  // ===============================
  // 5️⃣ Handle file drop (.txt)
  // ===============================
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || file.type !== "text/plain") return;

    if (!org_id || !roomName) return;
    const meetingId = await getMeetingId(Number(org_id), roomName);
    if (!meetingId) return;

    currentMeetingIdRef.current = String(meetingId);

    const text = await file.text();
    const blocks = text.split(/\n\s*\n/);

    for (const block of blocks) {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const question = lines
        .find((l) => l.startsWith("Q:"))
        ?.replace(/^Q:\s*/, "");
      const difficulty = lines
        .find((l) => l.startsWith("D:"))
        ?.replace(/^D:\s*/, "")
        .toLowerCase() as QuestionCardData["difficulty"];
      const type = lines
        .find((l) => l.startsWith("T:"))
        ?.replace(/^T:\s*/, "")
        .toLowerCase() as QuestionCardData["type"];
      const displayType = lines
        .find((l) => l.startsWith("Display:"))
        ?.replace(/^Display:\s*/, "")
        .toLowerCase() as QuestionCardData["displayType"];
      const showWinner =
        lines
          .find((l) => l.startsWith("Winner:"))
          ?.replace(/^Winner:\s*/, "")
          .toLowerCase() === "true";
      const live =
        lines
          .find((l) => l.startsWith("Live:"))
          ?.replace(/^Live:\s*/, "")
          .toLowerCase() === "true";

      const answers = lines
        .filter((l) => l.startsWith("A:"))
        .map((l) => l.replace(/^A:\s*/, ""));

      // ✅ Support multiple Correct: lines
      const correctLines = lines
        .filter((l) => l.startsWith("Correct:"))
        .map((l) => l.replace(/^Correct:\s*/, "").trim());
      // const correctAnswer =
      //   correctLines.length > 0 ? correctLines.join(", ") : undefined;

      // ✅ Validate block
      if (
        !question ||
        !["easy", "medium", "hard"].includes(difficulty) ||
        !["mc", "short", "slider"].includes(type)
      ) {
        console.warn("⚠️ Skipping invalid question block:", block);
        continue;
      }

      try {
        // ✅ Send array to backend
        const res = await saveQuestionToBackend(
          Number(org_id),
          Number(meetingId),
          {
            question,
            answers,
            difficulty,
            type,
            displayType,
            showWinner,
            live,
            correctAnswer: correctLines, // <-- array version
          },
        );

        // ✅ Store readable version locally
        const data: QuestionCardData = {
          id: String(res.question_id),
          question,
          difficulty,
          type,
          answers,
          displayType,
          showWinner,
          live,
          associatedTab: tabIndex ?? 1,
          correctAnswer: correctLines, // e.g. "Dog, Cat"
        };

        await saveQuestion(String(res.question_id), data, String(meetingId));
      } catch (err) {
        console.error("❌ Failed to save question:", err);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) =>
    e.preventDefault();

  // ===============================
  // 6️⃣ Render
  // ===============================
  return (
    <div className="drop-zone" onDrop={handleDrop} onDragOver={handleDragOver}>
      {displayQuestionCards.length === 0 ? (
        <div className="instruction-wrapper">
          <div className="instruction-panel">
            <div className="instruction-box">
              <strong>Example Format:</strong>
              <pre>
                {`Q: What is 2+2?
D: easy
T: mc
A: 3
A: 4
Correct: 4`}
              </pre>
              <ul className="rules-list">
                <li>
                  Only <code>.txt</code> files allowed
                </li>
                <li>
                  Must include <code>Q:</code> line
                </li>
                <li>Difficulties: easy, medium, hard</li>
                <li>Types: mc, short, slider</li>
                <li>At least 2 answers for mc type</li>
                <li>
                  Optional <code>Correct:</code> line
                </li>
              </ul>
            </div>
          </div>
          <div className="no-files-msg">
            No files have been dropped yet. Just drag your <code>.txt</code>{" "}
            here!
          </div>
        </div>
      ) : (
        <div className="questions-row">
          {displayQuestionCards.map((q) => (
            <QuestionCard
              key={q.id}
              id={q.id}
              question={q.data.question}
              answers={q.data.answers}
              difficulty={q.data.difficulty}
              type={q.data.type}
              displayType={q.data.displayType}
              showWinner={q.data.showWinner}
              live={q.data.live}
              correctAnswer={q.data.correctAnswer}
              onDelete={(id) =>
                setDisplayQuestionCards((prev) =>
                  prev.filter((x) => x.id !== id),
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default QuestionDropZone;
