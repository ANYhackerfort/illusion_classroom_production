import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import { useState } from "react";

const SaveButton = ({ onSave }: { onSave: (n: string, t: string) => void }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");

  const handleSave = () => {
    onSave(name, tag);
    setOpen(false);
    setName("");
    setTag("");
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
          "&:hover": {
            backgroundColor: "#222",
          },
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
              backgroundColor: "#fff", // back to white
              color: "#000", // black text
              borderRadius: "16px",
              width: "100%",
              maxWidth: "320px", // slightly narrower
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
            label="Tag"
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
          <Button onClick={handleSave}>Confirm</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SaveButton;
