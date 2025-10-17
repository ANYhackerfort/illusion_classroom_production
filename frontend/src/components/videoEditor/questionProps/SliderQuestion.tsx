import React, { useMemo, useState } from "react";
import { Slider, Box, Typography, Avatar } from "@mui/material";
import "./SliderQuestion.css";

type DisplayType = "face" | "initial" | "anonymous";

interface SliderQuestionProps {
  answers: string[]; // [lowerBound, upperBound, ...]
  displayState: DisplayType;
  showWinner: boolean;
  live: boolean;
}

const getAvatarForUser = () =>
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

  const handleChange = (_: Event, newValue: number | number[]) => {
    if (typeof newValue === "number") setValue(newValue);
  };

  const handleRelease = () => {
    if (picked === value && avatarUrl) return;
    setPicked(value);
    setAvatarUrl(getAvatarForUser());
  };

  return (
    <Box className="sliderq-wrap">
      <Box sx={{ position: "relative", mb: 3, width: "90%"}}>
        <Box className="sliderq-track-wrap">
          <Slider
            value={value}
            min={min}
            max={max}
            onChange={handleChange}
            onChangeCommitted={handleRelease}
            step={1}
            valueLabelDisplay="auto"
          />
        </Box>

        {/* Tick labels */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mt: 1,
            px: 0.5,
          }}
        >
          <Typography variant="body2">{min}</Typography>
          <Typography variant="body2">{max}</Typography>
        </Box>

        {/* Avatar below selected position */}
        {avatarUrl && picked !== null && (
          <Avatar
            src={avatarUrl}
            alt="selected user"
            sx={{
              position: "absolute",
              left: `calc(${((picked - min) / (max - min)) * 100}% - 16px)`,
              width: 48,
              height: 48,
              border: "2px solid white",
              boxShadow: "0 0 4px rgba(0,0,0,0.2)",
            }}
          />
        )}
      </Box>

      <Typography variant="body1" align="center">
        Selected: <strong>{value}</strong>
      </Typography>
    </Box>
  );
};

export default SliderQuestion;
