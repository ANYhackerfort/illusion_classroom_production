import React, { useState, useRef, useEffect, useCallback } from "react";
import "./VideoBar.css";
import { FaVideo } from "react-icons/fa";
import { useMemo } from "react";
import VideoSegment from "./VideoSegment";
import QuestionSegment from "./QuestionSegment";
import DefaultLengthControl from "./DefaultLengthControl";

import type { QuestionCardData } from "../../types/QuestionCard";
import { v4 as uuidv4 } from "uuid";
import type { VideoSegmentData } from "../../types/QuestionCard";

interface VideoBarProps {
  setVideoTime: (time: number) => void;
  videoLength: React.RefObject<number>;
  baseWidth: number;
  videoSegments: VideoSegmentData[];
  setVideoSegments: (
    updater: (prev: VideoSegmentData[]) => VideoSegmentData[],
  ) => void;
  currentTimeRef: React.RefObject<number>;
  setInnerBarWidthPx: (px: number) => void;
  innerBarWidthPx: number;
  setBaseWidth: (width: number) => void;
  widthPercent: number;
  setWidthPercent: (width: number) => void;
  updateBar: boolean;
}

const VideoBar: React.FC<VideoBarProps> = ({
  baseWidth,
  setVideoTime,
  videoSegments,
  setVideoSegments,
  currentTimeRef,
  videoLength,
  setInnerBarWidthPx,
  innerBarWidthPx,
  setBaseWidth,
  widthPercent,
  setWidthPercent,
  updateBar,
}) => {
  // const [widthPercent, setWidthPercent] = useState(50);
  const [defaultLength, setDefaultLength] = useState(10);
  const needleRef = useRef<HTMLDivElement>(null);
  const innerBarRef = useRef<HTMLDivElement>(null);
  const PIXELS_PER_SECOND = 100;
  const PADDING = 10;
  const prevWidthPercentRef = useRef(widthPercent);

  useEffect(() => {
    const newWidth =
      (widthPercent / 100) * videoLength.current * PIXELS_PER_SECOND;
    setInnerBarWidthPx(newWidth);
    setBaseWidth(widthPercent);
    console.log("Setting inneSDSSSSSSSSSr bar width to", videoLength.current);
  }, [widthPercent, updateBar]);

  const markers = useMemo(() => {
    const pixelSpacing = 100;
    const approxTickCount = Math.floor(innerBarWidthPx / pixelSpacing);
    const tickInterval = Math.max(
      1,
      Math.round(videoLength.current / approxTickCount),
    );
    const result: number[] = [];

    for (let i = 0; i <= videoLength.current + PADDING; i += tickInterval) {
      result.push(i);
    }

    return result;
  }, [innerBarWidthPx, updateBar]);

  // const roundTo = (num: number, decimals = 12) => Number(num.toFixed(decimals));

  const handleSplitAndAdd = (
    source: [number, number],
    time: number,
    questionCardData: QuestionCardData,
    id: string, // segment id to split
  ) => {
    const [start, end] = source;
    const questionEnd = time + defaultLength;
    const adjustedEnd = end + defaultLength;

    const preSegment: VideoSegmentData = {
      id: uuidv4(),
      source: [start, time],
      isQuestionCard: false,
    };

    const questionSegment: VideoSegmentData = {
      id: uuidv4(),
      source: [time, questionEnd],
      isQuestionCard: true,
      questionCardData,
    };

    const postSegment: VideoSegmentData = {
      id: uuidv4(),
      source: [questionEnd, adjustedEnd],
      isQuestionCard: false,
    };

    // grow total duration + widths
    videoLength.current += defaultLength;
    const fullPx = videoLength.current * PIXELS_PER_SECOND;
    setBaseWidth(fullPx);
    setInnerBarWidthPx((widthPercent / 100) * fullPx);

    setVideoSegments((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;

      const updated: VideoSegmentData[] = [];

      // segments before target
      for (let i = 0; i < idx; i++) updated.push(prev[i]);

      // replace target with 3 pieces
      updated.push(preSegment, questionSegment, postSegment);

      // shift all segments after target to the right by defaultLength
      for (let i = idx + 1; i < prev.length; i++) {
        const [s, e] = prev[i].source;
        updated.push({
          ...prev[i],
          source: [s + defaultLength, e + defaultLength],
        });
      }

      return updated;
    });
  };

  const updateSegmentResize = useCallback(
    (id: string, newEnd: number) => {
      setVideoSegments((prevSegments) => {
        console.log("PREV ------------------- SEGMENTS", prevSegments);

        const segIndex = prevSegments.findIndex((s) => s.id === id);
        console.log(
          "Updating --------------- segment resize for id",
          id,
          "at index",
          segIndex,
        );
        if (segIndex === -1) return prevSegments;

        console.log(
          "Updating segment resize for id",
          id,
          "at index",
          segIndex,
          "to new end",
          newEnd,
        );

        const seg = prevSegments[segIndex];
        const [start, end] = seg.source;
        const delta = newEnd - end;
        if (delta === 0) return prevSegments;

        // 1) Build the updated segments array
        const updated = prevSegments.map((s, i) => {
          if (i === segIndex) {
            return { ...s, source: [start, newEnd] as [number, number] };
          }
          if (i > segIndex) {
            const [s0, s1] = s.source;
            return {
              ...s,
              source: [s0 + delta, s1 + delta] as [number, number],
            };
          }
          return s;
        });

        // 2) Derive the new total duration from the last segment
        const lastEnd = updated[updated.length - 1]?.source[1] ?? 0;
        videoLength.current = lastEnd;
        console.log("New video length after resize:", videoLength.current);

        // 3) Recompute the bar widths
        const fullPx = lastEnd * PIXELS_PER_SECOND;
        setBaseWidth(fullPx);
        setInnerBarWidthPx((widthPercent / 100) * fullPx);

        return updated;
      });
    },
    [
      setVideoSegments,
      setBaseWidth,
      setInnerBarWidthPx,
      widthPercent,
      videoLength,
    ],
  );

  // const handleUpdatePositioning = useCallback(
  //   (index: number, newstart: number) => {

  //   }

  // ⏱️ Needle tracking using currentTimeRef
  const innerBarWidthPxRef = useRef(innerBarWidthPx);

  useEffect(() => {
    innerBarWidthPxRef.current = innerBarWidthPx;
  }, [innerBarWidthPx]);

  // Main animation effect (never restarts due to videoDuration changes)
  const displayedX = useRef(0); // add this at top level of component
  const animationFrame = useRef<number | null>(null);

  useEffect(() => {
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const animate = () => {
      const needle = needleRef.current;
      const duration = videoLength.current;
      const width = innerBarWidthPxRef.current;
      const current = currentTimeRef.current ?? 0;

      if (!needle || !width || !duration) {
        animationFrame.current = requestAnimationFrame(animate);
        return;
      }

      const targetX = Math.min(current / duration, 1) * width;
      displayedX.current = lerp(displayedX.current, targetX, 0.3);

      needle.style.left = `calc(${displayedX.current}px - 2px)`;

      animationFrame.current = requestAnimationFrame(animate);
    };

    animationFrame.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrame.current !== null) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, []);

  const handleSetVideoTime = (time: number) => {
    setVideoTime(time);
    console.log("SETTING AT ", time);
    const x = (time / 100) * innerBarWidthPx;
    console.log("THE X BEING", x);
    if (needleRef.current) {
      needleRef.current.style.left = `calc(${x}px - 2px)`;
    }
  };

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWidth = Number(e.target.value);
    if (prevWidthPercentRef.current !== newWidth) {
      prevWidthPercentRef.current = newWidth;
    }
    setWidthPercent(newWidth);
    const width = (newWidth / 100) * baseWidth;
    setInnerBarWidthPx(width);
  };

  const handleDelete = (id: string) => {
    setVideoSegments((prevSegments) => {
      const index = prevSegments.findIndex((seg) => seg.id === id);
      if (index === -1) return prevSegments;

      const curr = prevSegments[index];
      const [start, end] = curr.source;
      const delta = end - start;

      const prev = prevSegments[index - 1];
      const next = prevSegments[index + 1];

      if (prev && next) {
        const shouldMerge = !prev.isQuestionCard && !next.isQuestionCard;

        console.log("Should merge:", shouldMerge);

        if (shouldMerge) {
          // ✅ Case 1: Merge prev + curr + next
          const minStart = prev.source[0];
          const maxEnd = next.source[1] - delta;

          const mergedSegment: VideoSegmentData = {
            id: uuidv4(),
            source: [minStart, maxEnd],
            isQuestionCard: false,
          };

          const updated = [...prevSegments];
          updated.splice(index - 1, 3, mergedSegment);

          for (let i = index; i < updated.length; i++) {
            const [s, e] = updated[i].source;
            updated[i] = {
              ...updated[i],
              source: [s - delta, e - delta] as [number, number],
            };
          }

          recomputeFromSegments(updated);
          return updated;
        } else {
          // ❌ Either prev, curr, or next is a question card — fallback to Case 2
          console.log("❌ One is a question card — using Case 2 logic");

          const updated = prevSegments
            .filter((seg) => seg.id !== id)
            .map((seg, i) => {
              if (i < index) return seg;
              const [s, e] = seg.source;
              return {
                ...seg,
                source: [s - delta, e - delta] as [number, number],
              };
            });

          recomputeFromSegments(updated);
          return updated;
        }
      } else {
        // ✅ Case 2: No merge possible
        console.log("⚠️ No prev/next — using Case 2 logic");

        const updated = prevSegments
          .filter((seg) => seg.id !== id)
          .map((seg, i) => {
            if (i < index) return seg;
            const [s, e] = seg.source;
            return {
              ...seg,
              source: [s - delta, e - delta] as [number, number],
            };
          });

        recomputeFromSegments(updated);
        return updated;
      }
    });
  };

  // Helper to recalc video length + widths
  const recomputeFromSegments = (segments: VideoSegmentData[]) => {
    const lastEnd = segments.length
      ? segments[segments.length - 1].source[1]
      : 0;
    videoLength.current = lastEnd;
    const fullPx = lastEnd * PIXELS_PER_SECOND;
    setBaseWidth(fullPx);
    setInnerBarWidthPx((widthPercent / 100) * fullPx);
  };

  useEffect(() => {
    console.log("🔄 videoSegments updated:", videoSegments);
  }, [videoSegments]);

  const updateSegmentPositioning = useCallback(
    (id: string, shift: number) => {
      setVideoSegments((prevSegments) => {
        const segIndex = prevSegments.findIndex((s) => s.id === id);
        console.log(
          "Updating segment positioning for id",
          id,
          "at index",
          segIndex,
          "with shift",
          shift,
        );
        if (segIndex === -1) return prevSegments;

        if (shift >= 0) {
          console.log("SHIFT AMOUNT", shift);
          console.log("videoSegments:", prevSegments);

          const seg = prevSegments[segIndex];
          if (!seg) return prevSegments;

          const [start, end] = seg.source;
          const length = end - start;
          const newStart = Math.max(start + shift, 0);
          const newEnd = newStart + length;

          const updated: VideoSegmentData[] = [];

          // 1. Update the dragged segment
          updated.push({ ...seg, source: [newStart, newEnd] });

          // 2. Adjust later segments
          for (let i = segIndex + 1; i < prevSegments.length; i++) {
            const segi = prevSegments[i];
            const [s, e] = segi.source;

            if (newEnd > s) {
              if (e <= newEnd) {
                // Fully overlaps → shift
                updated.push({
                  ...segi,
                  source: [s - length, e - length],
                });
              } else {
                // Partial overlap → split
                // keep id on the left piece, give a new id to the right piece
                updated.push({
                  ...segi,
                  id: uuidv4(),
                  source: [s - length, newEnd - length] as [number, number],
                });
                updated.push({
                  ...segi,
                  id: uuidv4(), // NEW: ensure unique id for the new split piece
                  source: [newEnd, e] as [number, number],
                });
              }
            } else {
              // No conflict, just copy it
              updated.push(segi);
            }
          }

          // 3. Sort everything based on start
          updated.sort((a, b) => a.source[0] - b.source[0]);

          // 4. Append untouched segments from before segIndex
          for (let i = segIndex - 1; i >= 0; i--) {
            updated.unshift(prevSegments[i]);
          }

          // 5. Merge adjacent segments if possible
          for (let i = 0; i < updated.length - 1; i++) {
            const current = updated[i];
            const next = updated[i + 1];

            if (
              current.source[1] === next.source[0] &&
              !current.isQuestionCard &&
              !next.isQuestionCard
            ) {
              updated[i] = {
                ...current,
                source: [current.source[0], next.source[1]],
              };
              updated.splice(i + 1, 1);
              i--;
            }
          }

          // 6. Update derived values
          const lastEnd = updated[updated.length - 1]?.source[1] ?? 0;
          videoLength.current = lastEnd;
          const fullPx = lastEnd * PIXELS_PER_SECOND;
          setBaseWidth(fullPx);
          setInnerBarWidthPx((widthPercent / 100) * fullPx);

          return updated;
        } else {
          const seg = prevSegments[segIndex];
          if (!seg) return prevSegments;

          const [start, end] = seg.source;
          const length = end - start;
          const newStart = Math.max(start + shift, 0);
          const newEnd = newStart + length;

          const updated: VideoSegmentData[] = [];

          // 1. Update the dragged segment
          updated.push({ ...seg, source: [newStart, newEnd] });

          // 2. Adjust previous segments
          for (let i = segIndex - 1; i >= 0; i--) {
            const segi = prevSegments[i];
            const [s, e] = segi.source;

            if (e > newStart) {
              if (s >= newStart) {
                // Fully overlaps → shift
                updated.push({
                  ...segi,
                  source: [s + length, e + length],
                });
              } else {
                // Partial overlap → split
                // left piece keeps its id, right piece gets a new id
                updated.push({
                  ...segi,
                  id: uuidv4(),
                  source: [s, newStart] as [number, number],
                });
                updated.push({
                  ...segi,
                  id: uuidv4(), // NEW: ensure unique id for the new split piece
                  source: [newStart + length, e + length] as [number, number],
                });
              }
            } else {
              // No conflict, just copy it
              updated.push(segi);
            }
          }

          // 3. Sort everything based on start
          updated.sort((a, b) => a.source[0] - b.source[0]);

          // 4. Append untouched segments from segIndex + 1 forward
          for (let i = segIndex + 1; i < prevSegments.length; i++) {
            updated.push(prevSegments[i]);
          }

          // 5. Merge adjacent segments if possible
          for (let i = 0; i < updated.length - 1; i++) {
            const current = updated[i];
            const next = updated[i + 1];

            if (
              current.source[1] === next.source[0] &&
              !current.isQuestionCard &&
              !next.isQuestionCard
            ) {
              updated[i] = {
                ...current,
                source: [current.source[0], next.source[1]],
              };
              updated.splice(i + 1, 1);
              i--;
            }
          }

          console.log("Updated segments after positioning:", updated);

          // 6. Update derived values
          const lastEnd = updated[updated.length - 1]?.source[1] ?? 0;
          videoLength.current = lastEnd;
          const fullPx = lastEnd * PIXELS_PER_SECOND;
          setBaseWidth(fullPx);
          setInnerBarWidthPx((widthPercent / 100) * fullPx);

          return updated;
        }
      });
    },
    [
      setVideoSegments,
      setBaseWidth,
      setInnerBarWidthPx,
      widthPercent,
      videoLength,
      videoSegments, // left as-is per your request (no logic removed)
    ],
  );

  if (!innerBarWidthPx) return null;

  return (
    <div className="video-bar-container">
      <div className="video-slider-container">
        <DefaultLengthControl
          value={defaultLength}
          setValue={setDefaultLength}
        />
        <label className="zoom-label">Zoom</label>
        <input
          type="range"
          min="1"
          max="100"
          value={widthPercent}
          onChange={handleZoomChange}
        />
      </div>
      <div className="video-outer-bar">
        <div className="video-icon-box">
          <FaVideo size={20} />
        </div>

        <div
          className="video-inner-bar-wrapper"
          ref={innerBarRef}
        >
          {markers.map((second) => (
            <div
              key={second}
              style={{
                position: "absolute",
                left: `${(second / videoLength.current) * innerBarWidthPx}px`,
                textAlign: "center",
                pointerEvents: "none",
              }}
            >
              <div className="video-tick" />
              <div className="video-tick-label">{second}s</div>
            </div>
          ))}

          {videoSegments.map((segment, index) =>
            segment.isQuestionCard && segment.questionCardData ? (
              <QuestionSegment
                id={segment.id}
                key={segment.id}
                index={index}
                source={segment.source}
                multiplier={widthPercent}
                videoDurationRef={videoLength}
                updateSegment={updateSegmentResize}
                updateSegmentPositioning={updateSegmentPositioning}
                questionCardData={segment.questionCardData}
                setVideoPercent={handleSetVideoTime}
                onDelete={handleDelete}
              />
            ) : (
              <VideoSegment
                key={segment.id}
                id={segment.id}
                source={segment.source}
                multiplier={widthPercent / 100}
                videoDurationRef={videoLength}
                innerBarWidthPx={innerBarWidthPx}
                setVideoPercent={handleSetVideoTime}
                splitAndAdd={handleSplitAndAdd}
              />
            ),
          )}

          <div
            className="needle"
            ref={needleRef}
            style={{
              position: "absolute",
              left: 0,
              transition: "none",
              zIndex: 100,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default VideoBar;
