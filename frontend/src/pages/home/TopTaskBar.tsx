import React, { useState, useEffect } from "react";
import { getOrganizations, deleteOrganization } from "../api/meetingApi";
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Menu,
  MenuItem as MuiMenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from "@mui/material";
import "./TopTaskBar.css";

export type TabKey = "current" | "archieved" | "stats" | "database";

export interface Tab {
  key: TabKey;
  label: string;
}

export interface Organization {
  id: number;
  name: string;
}

const TABS: Tab[] = [
  { key: "current", label: "Current Meetings" },
  { key: "archieved", label: "Archieved Meetings" },
  { key: "stats", label: "Statistics" },
  { key: "database", label: "Shared Database" },
];

interface TopTaskBarProps {
  value: TabKey;
  setTab: (next: TabKey) => void;
  onSelectOrganization: (orgId: number | null) => void;
  setEmpty: (isEmpty: boolean) => void;
  setShowCreate: (show: boolean) => void;
  setShowJoin: (show: boolean) => void;
  fetchedOrganizations: Organization[];
  setFetchedOrganizations: React.Dispatch<React.SetStateAction<Organization[]>>;
  selectedOrg: number | null;
  setSelectedOrg: React.Dispatch<React.SetStateAction<number | null>>;
}

const TopTaskBar: React.FC<TopTaskBarProps> = ({
  value,
  setTab,
  onSelectOrganization,
  setEmpty,
  setShowCreate,
  setShowJoin,
  fetchedOrganizations,
  setFetchedOrganizations,
  selectedOrg,
  setSelectedOrg,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openManage = Boolean(anchorEl);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const orgs = await getOrganizations();
        setFetchedOrganizations(orgs);
        setEmpty(orgs.length === 0);
      } catch (err) {
        console.error("Failed to fetch organizations:", err);
      }
    };
    fetchOrgs();
  }, [setFetchedOrganizations, setEmpty]);

  const handleSelect = (orgId: number) => {
    setSelectedOrg(orgId);
    onSelectOrganization(orgId);
  };

  const handleDelete = async (orgId: number) => {
    try {
      await deleteOrganization(orgId);
      setFetchedOrganizations((prev) => {
        const updated = prev.filter((org) => org.id !== orgId);
        if (selectedOrg === orgId) {
          if (updated.length > 0) {
            setSelectedOrg(updated[0].id);
            onSelectOrganization(updated[0].id);
          } else {
            setSelectedOrg(null);
            onSelectOrganization(null);
            setEmpty(true);
          }
        }
        return updated;
      });
    } catch (err) {
      console.error("Failed to delete organization:", err);
    }
  };

  const currentOrg = fetchedOrganizations.find((o) => o.id === selectedOrg);

  return (
    <header className="ttb-header" role="banner">
      <div className="ttb-container">
        <div className="ttb-inner">
          {/* Left: Dropdown + Manage */}
          {fetchedOrganizations.length > 0 && (
            <div className="ttb-left-group">
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel id="org-select-label">Organization</InputLabel>
                <Select
                  labelId="org-select-label"
                  value={selectedOrg}
                  onChange={(e) => handleSelect(e.target.value as number)}
                  label="Organization"
                >
                  {fetchedOrganizations.map((org) => (
                    <MenuItem key={org.id} value={org.id}>
                      {org.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                className="manage-btn"
                onClick={(e) => setAnchorEl(e.currentTarget)}
              >
                Manage
              </Button>

              <Menu
                anchorEl={anchorEl}
                open={openManage}
                onClose={() => setAnchorEl(null)}
              >
                <MuiMenuItem
                  onClick={() => {
                    alert("Feature Coming Soon...");
                    setAnchorEl(null);
                  }}
                >
                  Leave Organization
                </MuiMenuItem>

                <MuiMenuItem
                  onClick={() => {
                    setShowDeleteConfirm(true);
                    setAnchorEl(null);
                  }}
                >
                  Delete Organization
                </MuiMenuItem>

                <MuiMenuItem
                  onClick={() => {
                    setShowCreate(true);
                    setAnchorEl(null);
                  }}
                >
                  Create Organization
                </MuiMenuItem>

                <MuiMenuItem
                  onClick={() => {
                    setShowJoin(true);
                    setAnchorEl(null);
                  }}
                >
                  Join Organization
                </MuiMenuItem>
              </Menu>
            </div>
          )}

          {/* Center: Tabs */}
          <nav aria-label="Primary" className="ttb-nav">
            <div className="ttb-tabs">
              {TABS.map((t) => {
                const active = t.key === value;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`ttb-tab ${active ? "is-active" : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Right: Org Badge + Brand */}
          <div className="ttb-right-group">
            {currentOrg && (
              <div className="ttb-org-badge">
                <span className="ttb-org-id">ORG_ID: {currentOrg.id}</span>
              </div>
            )}

            <div className="ttb-brand" aria-label="MeetDash">
              <div className="ttb-logo" />
              <span className="ttb-title">Illusion Classroom</span>
            </div>
          </div>
        </div>
      </div>

      {/* 🗑️ Confirmation Dialog */}
      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
      >
        <DialogTitle>Are you sure?</DialogTitle>
        <DialogContent>
          <Typography>
            This will permanently delete the selected organization.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (selectedOrg) handleDelete(selectedOrg);
              setShowDeleteConfirm(false);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </header>
  );
};

export default TopTaskBar;
