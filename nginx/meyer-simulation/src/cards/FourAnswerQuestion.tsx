import React from "react";
import { Card, CardContent, Button } from "@mui/material";
import "./FourAnswerQuestion.css";

interface AnswerCardProps {
  question: string;
  options: string[];
  onSelect: (option: string) => void;
}

const AnswerCard: React.FC<AnswerCardProps> = ({
  question,
  options,
  onSelect,
}) => {
  return (
    <Card className="card">
      <CardContent>
        <h2 className="heading">{question}</h2>
        <div className="options-wrapper">
          {options.map((option, index) => (
            <Button
              key={index}
              variant="outlined"
              className="option-button"
              fullWidth
              onClick={() => onSelect(option)}
            >
              <div className="button-content">
                <span className="option-text">{option}</span>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AnswerCard;
