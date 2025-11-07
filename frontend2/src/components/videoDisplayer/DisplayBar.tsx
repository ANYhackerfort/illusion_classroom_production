import React, { useRef, useEffect } from "react";
import "./DisplayBar.css";
import { FaVideo } from "react-icons/fa";
import { useMemo } from "react";
import QuestionDud from "./Question";
import VideoDud from "./Video";
import type { VideoSegmentData } from "../../types/QuestionCard";
import { getVideoTimeBeforeSegment } from "../../pages/meeting-page/VideoSegmentRenderer";
import { updateVideoState } from "./api/save";
import { useParams } from "react-router-dom";

interface DisplayBarProps {
  setVideoTime: (time: number) => void;
  videoLength: React.RefObject<number>;
  baseWidth: number;
  videoSegments: VideoSegmentData[];
  currentTimeRef: React.RefObject<number>;
  setInnerBarWidthPx: (px: number) => void;
  innerBarWidthPx: number;
  setWidthPercent: (width: number) => void;
  widthPercent: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoStoppedRef: React.RefObject<boolean>;
}

const DisplayBar: React.FC<DisplayBarProps> = ({
  baseWidth,
  setVideoTime,
  videoSegments,
  currentTimeRef,
  videoLength,
  setInnerBarWidthPx,
  innerBarWidthPx,
  setWidthPercent,
  widthPercent,
  videoRef,
  videoStoppedRef,
}) => {
  // const [widthPercent, setWidthPercent] = useState(50);
  const needleRef = useRef<HTMLDivElement>(null);
  const innerBarRef = useRef<HTMLDivElement>(null);
  const PIXELS_PER_SECOND = 100;
  const PADDING = 10;
  const prevWidthPercentRef = useRef(widthPercent);
  const { org_id, roomName } = useParams<{
    org_id: string;
    roomName: string;
  }>();

  useEffect(() => {
    const newWidth =
      (widthPercent / 100) * videoLength.current * PIXELS_PER_SECOND;
    setInnerBarWidthPx(newWidth);
  }, [widthPercent]);

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
  }, [innerBarWidthPx]);

  // ⏱️ Needle tracking using currentTimeRef
  const innerBarWidthPxRef = useRef(innerBarWidthPx);

  useEffect(() => {
    innerBarWidthPxRef.current = innerBarWidthPx;
  }, [innerBarWidthPx]);

  useEffect(() => {
    let lastUpdate = performance.now();
    let localTime = 0;
    let rafId: number;

    const tick = () => {
      const needle = needleRef.current;
      const duration = videoLength.current;
      const width = innerBarWidthPxRef.current;
      const trueTime = currentTimeRef.current ?? 0;

      if (needle && width && duration) {
        const now = performance.now();
        const delta = (now - lastUpdate) / 1000;
        lastUpdate = now;

        if (!videoStoppedRef.current) {
          localTime += delta;
        } else {
          lastUpdate = performance.now();
          localTime = trueTime;
        }

        // ❌ removed lerping
        // Hard correction if drift > 160ms
        if (Math.abs(localTime - trueTime) > 0.16) {
          localTime = trueTime;
        }

        const targetX = Math.min(localTime / duration, 1) * width;
        needle.style.left = `calc(${targetX}px - 2px)`;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleSetVideoTime = async (time: number) => {
    setVideoTime(time);

    await updateVideoState(Number(org_id), String(roomName), {
      current_time: time,
      stopped: videoStoppedRef.current,
    });

    const x = (time / 100) * innerBarWidthPx;
    if (needleRef.current) {
      needleRef.current.style.left = `calc(${x}px - 2px)`;
    }

    const activeSegment = videoSegments.find((seg) => {
      const [start, end] = seg.source;
      return time >= start && time < end;
    });

    if (videoRef.current) {
      videoRef.current.currentTime = getVideoTimeBeforeSegment(
        videoSegments,
        activeSegment!,
        currentTimeRef.current,
      );
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

  if (!innerBarWidthPx) return null;

  return (
    <div className="video-bar-container">
      <div className="video-slider-container">
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
          onMouseUp={() => console.log("hi")}
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
              <QuestionDud
                key={index}
                index={index}
                source={segment.source}
                multiplier={widthPercent / 100}
                videoDurationRef={videoLength}
                questionCardData={segment.questionCardData}
                setVideoPercent={handleSetVideoTime}
              />
            ) : (
              <VideoDud
                key={index}
                index={index}
                source={segment.source}
                multiplier={widthPercent / 100}
                videoDurationRef={videoLength}
                innerBarWidthPx={innerBarWidthPx}
                setVideoPercent={handleSetVideoTime}
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

export default DisplayBar;
