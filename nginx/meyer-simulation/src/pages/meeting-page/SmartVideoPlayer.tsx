import React, { useEffect } from "react";
import "./SmartVideoPlayer.css";
import type { VideoSegmentData } from "../../types/QuestionCard";
import WaitingArt from "./WaitingArt";
import ProfilePhotoCapture from "./components/ProfilePhotoCapture";

interface SmartVideoPlayerProps {
  segments: VideoSegmentData[];
  meetingName: string | undefined;
  videoRef: React.RefObject<HTMLVideoElement>;
  videoUrl: string | null;
  hasAccess: boolean;

}

const SmartVideoPlayer: React.FC<SmartVideoPlayerProps> = ({
  segments,
  // meetingName,
  videoRef,
  videoUrl,
  hasAccess,
}) => {
  useEffect(() => {
    if (!videoRef.current || !videoUrl) return;

    console.log("🔄 Resetting video src:", videoUrl);

    try {
      videoRef.current.pause();
      videoRef.current.removeAttribute("src");
      videoRef.current.load();
      videoRef.current.src = videoUrl;
    } catch (err) {
      console.warn("⚠️ Error updating video src:", err);
    }
  }, [videoUrl, videoRef]);

  if (segments.length === 0) return <WaitingArt hasAccess={hasAccess}/>;

  if (videoUrl) {
    return (
      <video
        ref={videoRef}
        className="video-fullscreen"
        src={videoUrl}
        playsInline
      />
    );
  }

  // ⬇️ Show camera modal when no video available
  return (
    <>
      <WaitingArt hasAccess={hasAccess}/>
    </>
  );
};

export default SmartVideoPlayer;
