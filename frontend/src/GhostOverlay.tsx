import { useEffect, useRef } from "react";
import GhostCard from "./components/quesitons/QuestionCardGhost";
import GhostEditedVideoCard from "./finder/editedVideoStorage/GhostEditedVideoCard";
import SurveyBlock from "./finder/editedVideoStorage/SurveyBlock";
import { useMouse } from "./hooks/drag/MouseContext";
import GhostBotCard from "./components/botEditor/cards/GhostBotCard";

const GhostOverlay = () => {
  const { draggedItem, draggedItemSizePercent } = useMouse();
  const ghostRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef({ x: 0, y: 0 });

  // Track mouse position
  useEffect(() => {
    const updateGhostPosition = (e: MouseEvent) => {
      positionRef.current = { x: e.clientX, y: e.clientY };
      const ghost = ghostRef.current;
      if (ghost && draggedItem) {
        const scale = 1;

        let x = e.clientX;
        let y = e.clientY;

        if (draggedItem.type === "question-card") {
          y -= 65;
        } else {
          y -= 65;
          x -= 95;
        }

        ghost.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
      }
    };

    window.addEventListener("mousedown", updateGhostPosition);
    window.addEventListener("mousemove", updateGhostPosition);

    return () => {
      window.removeEventListener("mousedown", updateGhostPosition);
      window.removeEventListener("mousemove", updateGhostPosition);
    };
  }, [draggedItem, draggedItemSizePercent]);

  if (!draggedItem) return null;

  let ghostContent = null;

  if (draggedItem.type === "question-card") {
    ghostContent = <GhostCard item={draggedItem} />;
  } else if (draggedItem.type === "edited-video") {
    const { id, videoName, videoTags, thumbnailUrl } = draggedItem.data;
    ghostContent = (
      <GhostEditedVideoCard
        id={id}
        videoName={videoName}
        videoTags={videoTags}
        thumbnailUrl={thumbnailUrl}
      />
    );
  } else if (draggedItem.type === "survey") {
    ghostContent = <SurveyBlock survey={draggedItem.data} />;
  } else if (draggedItem.type === "bot-card") {
    const { id, name, memory, image_url } = draggedItem.data;
    ghostContent = (
      <GhostBotCard id={id} name={name} memory={memory} image_url={image_url} />
    );
  }

  return (
    <div className="ghost-overlay">
      <div
        ref={ghostRef}
        style={{
          position: "fixed",
          transformOrigin: "top left",
          pointerEvents: "none",
          zIndex: 9999,
        }}
      >
        {ghostContent}
      </div>
    </div>
  );
};

export default GhostOverlay;
