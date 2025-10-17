import React, { useState, useEffect } from "react";
import "./SurveyDropZone.css";
import { v4 as uuidv4 } from "uuid";
import { saveSurvey, getAllSurveys } from "../../indexDB/surveyStorage";
import { saveSurveyToBackend } from "../../components/videoDisplayer/api/save";
import SurveyBlock from "./SurveyBlock";
import { useParams } from "react-router-dom"; // ✅ For grabbing meetingName from URL

export type SurveyItem =
  | {
      id: string;
      type: "description";
      content: string;
      associatedTab: number;
    }
  | {
      id: string;
      type: "slider";
      question: string;
      min: number;
      max: number;
      associatedTab: number;
    }
  | {
      id: string;
      type: "mcq";
      question: string;
      options: string[];
      associatedTab: number;
    }
  | {
      id: string;
      type: "qualtrics";
      url: string;
      associatedTab: number;
    };

export class Survey {
  id: string;
  items: SurveyItem[];

  constructor(id: string, items: SurveyItem[]) {
    this.id = id;
    this.items = items;
  }
}

interface SurveyDropZoneProps {
  tabIndex: number;
}

const SurveyDropZone: React.FC<SurveyDropZoneProps> = ({ tabIndex }) => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const { roomName } = useParams();

  useEffect(() => {
    const loadFromDB = async () => {
      const storedSurveys = await getAllSurveys();
      const filteredSurveys = storedSurveys.filter((s) =>
        s.items.some((item) => item.associatedTab === tabIndex)
      );
      setSurveys(filteredSurveys);
    };
    loadFromDB();
  }, [tabIndex]);

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || file.type !== "text/plain") return;

    const text = await file.text();
    const blocks = text.split(/\n\s*\n/);

    const newItems: SurveyItem[] = [];

    for (const block of blocks) {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines[0]?.startsWith("Description:")) {
        newItems.push({
          id: uuidv4(),
          type: "description",
          content: lines.slice(1).join(" "),
          associatedTab: tabIndex,
        });
      } else if (lines[0]?.startsWith("Q:")) {
        const typeLine = lines.find((l) => l.startsWith("T:"));
        const type = typeLine
          ? (typeLine.replace(/^T:\s*/, "").toLowerCase() as "slider" | "mcq")
          : "mcq";

        const question = lines[0].replace(/^Q:\s*/, "");
        const options = lines
          .filter((l) => l.startsWith("A:"))
          .map((a) => a.replace(/^A:\s*/, ""));

        if (type === "slider") {
          const [min, max] = [0, 10]; // Optional: parse from text
          newItems.push({
            id: uuidv4(),
            type,
            question,
            min,
            max,
            associatedTab: tabIndex,
          });
        } else {
          newItems.push({
            id: uuidv4(),
            type,
            question,
            options,
            associatedTab: tabIndex,
          });
        }
      } else if (lines[0]?.startsWith("Qualtrics:")) {
        const url = lines[0].replace(/^Qualtrics:\s*/, "");
        newItems.push({
          id: uuidv4(),
          type: "qualtrics",
          url,
          associatedTab: tabIndex,
        });
      }
    }

    if (newItems.length > 0) {
      const newSurvey = new Survey(uuidv4(), newItems);
      await saveSurvey(newSurvey); // Save to IndexedDB
      setSurveys((prev) => [...prev, newSurvey]);
      console.log("✅ Saved survey locally", newSurvey, roomName);
      // ✅ Save to backend
      if (roomName) {
        try {
          await saveSurveyToBackend(roomName, newSurvey);
          console.log("saved to backend", newSurvey,  roomName);
          console.log("✅ Synced survey with backend");
        } catch (err) {
          console.error("❌ Failed to sync survey with backend:", err);
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div
      className="survey-drop-zone"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {surveys.length === 0 && (
        <div className="survey-instructions">
          📂 Drag & drop a `.txt` file formatted as a survey:
          <ul>
            <li><code>Description:</code> for explanatory text</li>
            <li><code>Q:</code> with <code>T: mcq</code> or <code>T: slider</code> for questions</li>
            <li><code>A:</code> for answer options</li>
            <li><code>Qualtrics:</code> for a survey link</li>
          </ul>
        </div>
      )}

      {surveys.length === 0 ? (
        <div className="placeholder-text">
          No survey loaded yet. Drag in a .txt file!
        </div>
      ) : (
        <div className="survey-masonry">
          {surveys.map((survey) => (
            <SurveyBlock key={survey.id} survey={survey} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SurveyDropZone;
