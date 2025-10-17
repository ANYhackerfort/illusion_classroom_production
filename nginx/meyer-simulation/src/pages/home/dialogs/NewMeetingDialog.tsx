import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Chip,
  Stack,
} from "@mui/material";

interface MeetingDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    description: string;
    tags: string[];
    name: string;
    sharedWith: string[];
  }) => void;
}

const MeetingDialog: React.FC<MeetingDialogProps> = ({
  open,
  onClose,
  onSave,
}) => {
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [name, setName] = useState("");
  const [sharedWith, setSharedWith] = useState<string[]>([]);
  const [shareInput, setShareInput] = useState("");

  const handleAddTag = () => {
    if (tagInput.trim()) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleAddShare = () => {
    if (shareInput.trim()) {
      setSharedWith([...sharedWith, shareInput.trim()]);
      setShareInput("");
    }
  };

  const handleSave = () => {
    onSave({ description, tags, name, sharedWith });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Create New Meeting</DialogTitle>
      <DialogContent dividers>
        <TextField
          fullWidth
          label="Meeting Name"
          margin="normal"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          fullWidth
          label="Description"
          margin="normal"
          multiline
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <TextField
          fullWidth
          label="Add Tag"
          margin="normal"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
        />
        <Stack direction="row" spacing={1} mb={2}>
          {tags.map((tag, i) => (
            <Chip
              key={i}
              label={tag}
              onDelete={() => {
                setTags(tags.filter((_, index) => index !== i));
              }}
            />
          ))}
        </Stack>

        <TextField
          fullWidth
          label="Share With (email)"
          margin="normal"
          value={shareInput}
          onChange={(e) => setShareInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddShare()}
        />
        <Stack direction="row" spacing={1}>
          {sharedWith.map((email, i) => (
            <Chip
              key={i}
              label={email}
              onDelete={() => {
                setSharedWith(sharedWith.filter((_, index) => index !== i));
              }}
            />
          ))}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MeetingDialog;
