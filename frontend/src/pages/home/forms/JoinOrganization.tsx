import React, { useState, useEffect } from "react";
import {
  Button,
  TextField,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from "@mui/material";
import { joinOrganization } from "../../api/meetingApi";
import type { Organization } from "../TopTaskBar";

interface Props {
  onClose: () => void;
  previousOrgId: number | null;
  setFetchedOrganizations: React.Dispatch<React.SetStateAction<Organization[]>>;
  setSelectedOrganization: React.Dispatch<React.SetStateAction<number | null>>;
}

const JoinOrganizationForm: React.FC<Props> = ({
  onClose,
  previousOrgId,
  setFetchedOrganizations,
  setSelectedOrganization,
}) => {
  const [orgId, setOrgId] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState(""); // ✅ error state

  useEffect(() => {
    if (previousOrgId) {
      setOrgId(previousOrgId.toString());
    }
  }, [previousOrgId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMsg("");
      const response = await joinOrganization({
        orgId: parseInt(orgId),
        ownerEmail,
      });

      // ✅ update parent state
      if (response.organization) {
        setFetchedOrganizations((prev) => [...prev, response.organization]);
        setSelectedOrganization(response.organization.id);
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.error?.includes("Owner email")) {
        setErrorMsg(
          "The entered email does not match the organization's owner.",
        );
      } else {
        setErrorMsg("Failed to join organization.");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogTitle>Join Organization</DialogTitle>
      <DialogContent dividers>
        {previousOrgId ? (
          <TextField
            label="Organization ID"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            required
            fullWidth
            margin="normal"
          />
        ) : (
          <>
            <Typography color="textSecondary">
              You haven't joined any organization yet.
            </Typography>
            <TextField
              label="Organization ID"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              required
              fullWidth
              margin="normal"
            />
          </>
        )}
        <TextField
          label="Owner Email"
          value={ownerEmail}
          onChange={(e) => {
            setOwnerEmail(e.target.value);
            setErrorMsg(""); // clear error while typing
          }}
          required
          fullWidth
          margin="normal"
          error={!!errorMsg} // ✅ highlights field red
        />

        {errorMsg && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            {errorMsg}
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" className="join-btn">
          Join
        </Button>
      </DialogActions>
    </form>
  );
};

export default JoinOrganizationForm;
