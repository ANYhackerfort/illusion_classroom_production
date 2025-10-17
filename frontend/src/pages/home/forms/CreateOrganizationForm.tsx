import React, { useState } from "react";
import {
  Button,
  TextField,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { createOrganization } from "../../api/meetingApi";
import type { Organization } from "../TopTaskBar";

interface Props {
  onClose: () => void;
  setFetchedOrganizations: React.Dispatch<React.SetStateAction<Organization[]>>;
  setSelectedOrganization: React.Dispatch<React.SetStateAction<number | null>>; // ✅ new prop
}

const CreateOrganizationForm: React.FC<Props> = ({
  onClose,
  setFetchedOrganizations,
  setSelectedOrganization,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newOrg = await createOrganization({ name, description, image });

      // ✅ Update organizations state immediately
      setFetchedOrganizations((prev) => [...prev, newOrg.organization]);

      // ✅ Select the newly created org
      setSelectedOrganization(newOrg.organization.id);

      onClose();
    } catch (err) {
      console.error("Failed to create organization:", err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogTitle>Create Organization</DialogTitle>
      <DialogContent dividers>
        <TextField
          label="Organization Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          fullWidth
          margin="normal"
        />
        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          multiline
          rows={3}
          margin="normal"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" className="login-btn">
          Create
        </Button>
      </DialogActions>
    </form>
  );
};

export default CreateOrganizationForm;
