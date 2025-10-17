import React, { useMemo, useState } from "react";
import "./SliderQuestion.css";

type DisplayType = "face" | "initial" | "anonymous";

interface SliderQuestionProps {
  answers: string[]; // [lowerBound, upperBound, ...]
  displayState: DisplayType;
  showWinner: boolean;
  live: boolean;
}

const getAvatarForUser = () =>
  // Stubbed: pretend backend returns a user image URL
  "https://i.pravatar.cc/64?img=" + (Math.floor(Math.random() * 70) + 1);

const SliderQuestion: React.FC<SliderQuestionProps> = ({
  answers,
  // displayState,
  // showWinner,
  // live,
}) => {
  const [picked, setPicked] = useState<number | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [min, max] = useMemo(() => {
    const lo = Number(answers?.[0] ?? 0);
    const hi = Number(answers?.[1] ?? 100);
    return Number.isFinite(lo) && Number.isFinite(hi) && lo < hi
      ? [lo, hi]
      : [0, 100];
  }, [answers]);

  const [value, setValue] = useState<number>(Math.round((min + max) / 2));

  // const percent = ((value - min) / (max - min)) * 100;

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setValue(Number(e.target.value));
  };

  const handleRelease = () => {
    // Stub “backend” call – just attach a random avatar
    if (picked === value && avatarUrl) return;
    setPicked(value);
    setAvatarUrl(getAvatarForUser());
  };

  return (
    <div className="sliderq-wrap">
      <div className="sliderq-track-wrap">
        <input
          className="sliderq-input"
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={handleChange}
          onMouseUp={handleRelease}
          onTouchEnd={handleRelease}
        />
        {/* Tick labels */}
        <div className="sliderq-labels">
          <span>{min}</span>
          <span>{max}</span>
        </div>

        {/* Avatar under selected position (stubbed) */}
        {avatarUrl && picked !== null && (
          <div
            className="sliderq-avatar"
            style={{
              left: `calc(${((picked - min) / (max - min)) * 100}% - 16px)`,
            }}
          >
            <img src={avatarUrl} alt="selected user" />
          </div>
        )}
      </div>

      <div className="sliderq-readout">
        Selected: <strong>{value}</strong>
      </div>
    </div>
  );
};

export default SliderQuestion;
