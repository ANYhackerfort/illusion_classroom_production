import React, { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { createContext, useContext } from "react";

interface DraggedItem {
  type: string;
  data: any;
}

interface MouseContextType {
  isMouseDown: boolean;
  registerMouseDownHandler: (
    componentName: string,
    handler: () => void,
  ) => void;
  draggedItem: DraggedItem | null;
  setDraggedItem: (el: DraggedItem | null) => void;
  draggedItemSizePercent: number;
}

const MouseContext = createContext<MouseContextType | undefined>(undefined);

export const MouseProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // const positionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  const [draggedItemSizePercent] = useState(100);

  const handlerMap = useRef<Map<string, () => void>>(new Map());

  useEffect(() => {
    // const handleMouseMove = (e: MouseEvent) => {
    //   positionRef.current = { x: e.clientX, y: e.clientY };
    // };
    const handleMouseDown = () => setIsMouseDown(true);
    const handleMouseUp = () => {
      setIsMouseDown(false);
      setDraggedItem(null);
    };

    // window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      // window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggedItem]);

  // Apply scaling when hovering over targets
  // useEffect(() => {
  //   if (draggedItem) {
  //     const el = document.elementFromPoint(positionRef.current.x, positionRef.current.y);
  //     if (el) {
  //       const classList = el.className.toString().split(" ");
  //       for (const cls of classList) {
  //         const handler = handlerMap.current.get(cls);
  //         if (cls === "video-inner-bar-wrapper" || cls === "segment") {
  //           if (cls === "segment" && draggedItem.type === "question-card") {
  //             if (handler) {
  //               console.log("✅ Found matching handler for class:", cls);
  //               handler();
  //               break;
  //             }
  //           }
  //           setDraggedItemSizePercent(50);
  //         } else {
  //           setDraggedItemSizePercent(100);
  //         }
  //       }
  //     }
  //   }
  // }, [draggedItem, positionRef.current.x, positionRef.current.y]);

  const registerMouseDownHandler = (
    componentName: string,
    handler: () => void,
  ) => {
    console.log(
      `Registering mouse down handler for component: ${componentName}`,
    );
    handlerMap.current.set(componentName, handler);
  };

  return (
    <MouseContext.Provider
      value={{
        isMouseDown,
        registerMouseDownHandler,
        draggedItem,
        setDraggedItem,
        draggedItemSizePercent,
      }}
    >
      {children}
    </MouseContext.Provider>
  );
};

export const useMouse = (): MouseContextType => {
  const context = useContext(MouseContext);
  if (!context) throw new Error("useMouse must be used within a MouseProvider");
  return context;
};

export { MouseContext };
