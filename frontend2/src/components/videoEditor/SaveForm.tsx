import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import { useState, useEffect } from "react";

interface SaveButtonProps {
  onSave: (name: string, tag: string) => void;
  initialName?: string;
  initialTags?: string[];
}

const SaveButton: React.FC<SaveButtonProps> = ({
  onSave,
  initialName = "",
  initialTags = [],
}) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [tag, setTag] = useState(initialTags.join(", "));

  // 🔄 keep name/tag synced when props change
  useEffect(() => {
    setName(initialName);
    setTag(initialTags.join(", "));
  }, [initialName, initialTags]);

  const handleSave = () => {
    onSave(name, tag);
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="contained"
        onClick={() => setOpen(true)}
        sx={{
          backgroundColor: "#000",
          color: "#fff",
          borderRadius: "999px",
          paddingX: 3,
          paddingY: 1.2,
          "&:hover": { backgroundColor: "#222" },
        }}
      >
        Save
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
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
        <DialogTitle>Save Entry</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            margin="dense"
            onKeyDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />

          <TextField
            label="Tags (comma separated)"
            fullWidth
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            margin="dense"
            onKeyDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SaveButton;
