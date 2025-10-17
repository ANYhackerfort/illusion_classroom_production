//Deprecated

import { createContext, useState, useContext, useEffect } from "react";
import type { ReactNode } from "react";

interface DragContextType {
  draggedItem: any;
  setDraggedItem: (item: any) => void;
  draggedItemSizePercent: number;
  setDraggedItemSizePercent: (percent: number) => void;
}

const DragContext = createContext<DragContextType | null>(null);

// Export the hook at top level, outside component
export const useDrag = (): DragContextType => {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error("useDrag must be used within a DragProvider");
  }
  return context;
};

export const DragProvider = ({ children }: { children: ReactNode }) => {
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [draggedItemSizePercent, setDraggedItemSizePercent] = useState(100);

  useEffect(() => {
    const handleMouseUp = () => {
      setDraggedItem(null);
      setDraggedItemSizePercent(100);
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  return (
    <DragContext.Provider
      value={{
        draggedItem,
        setDraggedItem,
        draggedItemSizePercent,
        setDraggedItemSizePercent,
      }}
    >
      {children}
    </DragContext.Provider>
  );
};
