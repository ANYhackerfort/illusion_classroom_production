import React from "react";
import "./SegmentMenu.css";

interface SegmentMenuProps {
  x: number;
  y: number;
  onDelete: () => void;
  onClose: () => void; // ✅ new prop
}

const SegmentMenu: React.FC<SegmentMenuProps> = ({
  x,
  y,
  onDelete,
  onClose,
}) => {
  return (
    <div
      className="segment-menu"
      style={{ top: y - 5, left: x - 10 }}
      onMouseLeave={onClose} // ✅ close when mouse leaves menu
      onContextMenu={(e) => e.preventDefault()}
    >
      <button className="delete-button" onClick={onDelete}>
        Delete
      </button>
    </div>
  );
};

export default SegmentMenu;
