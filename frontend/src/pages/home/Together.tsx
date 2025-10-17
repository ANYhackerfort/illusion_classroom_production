import React, { useState, useEffect } from "react";
import TopTaskBar from "./TopTaskBar";
import type { TabKey } from "./TopTaskBar";
import CurrentMeetings from "./pages/CurrentMeetings";
import ArchievedMeetings from "./pages/ArchievedMeetings";
import UserStatsPage from "./pages/UserStats";
import { Button, Dialog } from "@mui/material";
import CreateOrganizationForm from "./forms/CreateOrganizationForm";
import JoinOrganizationForm from "./forms/JoinOrganization";
import type { Organization } from "./TopTaskBar";
import "./Together.css";
import "./HomePage.css";

const TAB_STORAGE_KEY = "homepage_tab";
const ORG_STORAGE_KEY = "homepage_selected_org";

const HomePage: React.FC = () => {
  const [tab, setTab] = useState<TabKey>(() => {
    const saved = localStorage.getItem(TAB_STORAGE_KEY);
    return (saved as TabKey) || "current";
  });
  const [selectedOrg, setSelectedOrg] = useState<number | null>(null);
  const [isEmpty, setIsEmpty] = useState<boolean>(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [fetchedOrganizations, setFetchedOrganizations] = useState<
    Organization[]
  >([]);

  // ✅ On first mount → restore saved tab + org from browser storage
  useEffect(() => {
    console.log("🌐 Pulling saved tab and org from browser localStorage...");

    const savedTab = localStorage.getItem(TAB_STORAGE_KEY);
    const savedOrg = localStorage.getItem(ORG_STORAGE_KEY);

    // ✅ Restore tab or default to "current"
    if (savedTab) {
      console.log(`📄 Restoring tab from browser: ${savedTab}`);
      setTab(savedTab as TabKey);
    } else {
      console.log("🟢 No saved tab found — defaulting to 'current'");
      setTab("current");
      localStorage.setItem(TAB_STORAGE_KEY, "current");
    }

    // ✅ Restore org if exists
    if (savedOrg) {
      console.log(`🏢 Restoring selected org from browser: ${savedOrg}`);
      setSelectedOrg(Number(savedOrg));
    } else {
      console.log(
        "🟢 No saved org found — will default to first org after fetch",
      );
    }
  }, []); // runs once on mount

  // ✅ Update localStorage whenever tab changes
  useEffect(() => {
    localStorage.setItem(TAB_STORAGE_KEY, tab);
    console.log(`💾 Saved tab state to browser: ${tab}`);
  }, [tab]);

  // ✅ Update localStorage whenever org changes
  useEffect(() => {
    if (selectedOrg !== null) {
      localStorage.setItem(ORG_STORAGE_KEY, selectedOrg.toString());
      console.log(`💾 Saved selected org to browser: ${selectedOrg}`);
    } else {
      localStorage.removeItem(ORG_STORAGE_KEY);
      console.log("🧹 Cleared selected org from browser (null)");
    }
  }, [selectedOrg]);

  // ✅ Track empty organization state
  useEffect(() => {
    setIsEmpty(fetchedOrganizations.length === 0);
  }, [fetchedOrganizations]);

  return (
    <div className="app-container">
      <TopTaskBar
        value={tab}
        setTab={setTab}
        onSelectOrganization={setSelectedOrg}
        setEmpty={setIsEmpty}
        setShowCreate={setShowCreate}
        setShowJoin={setShowJoin}
        fetchedOrganizations={fetchedOrganizations}
        setFetchedOrganizations={setFetchedOrganizations}
        setSelectedOrg={setSelectedOrg}
        selectedOrg={selectedOrg}
      />

      {isEmpty ? (
        <div className="org-empty-container">
          <Button className="login-btn" onClick={() => setShowCreate(true)}>
            Create Organization
          </Button>
          <Button className="join-btn" onClick={() => setShowJoin(true)}>
            Join Organization
          </Button>
        </div>
      ) : (
        <>
          {tab === "current" && <CurrentMeetings selectedOrg={selectedOrg} />}
          {tab === "archieved" && (
            <ArchievedMeetings selectedOrg={selectedOrg} />
          )}
          {tab === "stats" && <UserStatsPage />}
        </>
      )}

      {/* ✅ Dialogs */}
      <Dialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        maxWidth="sm"
        fullWidth
      >
        <CreateOrganizationForm
          onClose={() => setShowCreate(false)}
          setFetchedOrganizations={setFetchedOrganizations}
          setSelectedOrganization={setSelectedOrg}
        />
      </Dialog>

      <Dialog
        open={showJoin}
        onClose={() => setShowJoin(false)}
        maxWidth="sm"
        fullWidth
      >
        <JoinOrganizationForm
          onClose={() => setShowJoin(false)}
          previousOrgId={selectedOrg}
          setFetchedOrganizations={setFetchedOrganizations}
          setSelectedOrganization={setSelectedOrg}
        />
      </Dialog>
    </div>
  );
};

export default HomePage;
