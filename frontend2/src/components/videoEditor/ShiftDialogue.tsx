import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from "@mui/material";

interface ShiftDialogProps {
  open: boolean;
  onClose: () => void;
  onApply: (left: number, right: number) => void;
  originalLeft: number;
  originalRight: number;
}

const ShiftDialog: React.FC<ShiftDialogProps> = ({
  open,
  onClose,
  onApply,
  originalLeft,
  originalRight,
}) => {
  const [leftInput, setLeftInput] = useState("");
  const [rightInput, setRightInput] = useState("");

  // Reset input fields when dialog opens
  useEffect(() => {
    if (open) {
      setLeftInput(originalLeft.toString());
      setRightInput(originalRight.toString());
    }
  }, [open, originalLeft, originalRight]);

  const handleApply = () => {
    if (
      leftInput.trim() === originalLeft.toString() &&
      rightInput.trim() === originalRight.toString()
    ) {
      //nothing happened, skipped
    } else {
      const left = parseFloat(leftInput);
      const right = parseFloat(rightInput);
      onApply(left, right);
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            backgroundColor: "#fff",
            color: "#000",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "320px",
          },
        },
      }}
    >
      <DialogTitle>Shift Segment</DialogTitle>
      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <TextField
          label={`Left (original: ${originalLeft})`}
          onChange={(e) => setLeftInput(e.target.value)}
          type="number"
          fullWidth
          margin="dense"
          onKeyDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        />
        <TextField
          label={`Right (original: ${originalRight})`}
          onChange={(e) => setRightInput(e.target.value)}
          type="number"
          fullWidth
          margin="dense"
          onKeyDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleApply} variant="contained">
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShiftDialog;
