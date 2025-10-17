import React from "react";
import "./SegmentMenu.css";

interface SegmentMenuProps {
  x: number;
  y: number;
  onDelete: () => void;
  onClose: () => void;
  setDialogOpen: (open: boolean) => void;
}

const SegmentMenu: React.FC<SegmentMenuProps> = ({
  x,
  y,
  onDelete,
  onClose,
  setDialogOpen,
}) => {
  return (
    <>
      <div
        className="segment-menu"
        style={{ top: y - 5, left: x - 10 }}
        onContextMenu={(e) => e.preventDefault()}
        onMouseLeave={onClose}
      >
        <button
          className="delete-button"
          onClick={() => {
            onDelete();
            onClose(); // ✅ close menu
          }}
        >
          Delete
        </button>

        <button
          className="shift-button"
          onClick={() => {
            onClose(); // ✅ close menu
            setDialogOpen(true); // ✅ open shift dialog
          }}
        >
          Shift
        </button>
      </div>
    </>
  );
};

export default SegmentMenu;
