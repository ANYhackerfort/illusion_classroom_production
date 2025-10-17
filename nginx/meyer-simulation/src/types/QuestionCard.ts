// src/types/QuestionCardData.ts

export interface QuestionCardData {
  id: string;
  question: string;
  answers: string[];
  difficulty: "easy" | "medium" | "hard";
  type: "slider" | "short" | "mc" | "match" | "rank" | "ai";
  displayType?: "face" | "initial" | "anonymous";
  showWinner?: boolean; // get question corerct; illuminate green
  live?: boolean; // cut offs at last 5
  associatedTab?: number;
}

export interface VideoSegmentData {
  id: string;
  source: [number, number];
  isQuestionCard: boolean;
  questionCardData?: QuestionCardData;
}
