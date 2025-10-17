import React, { useState, useEffect, useCallback } from "react";
import type { MediaInfoCardProps } from "../cards/OngoingMeeting";
import {
  deleteMeeting,
  unarchiveMeeting,
  fetchOrgMeetings,
} from "../../api/meetingApi";
import MediaInfoCardArchieved from "../cards/ArchievedMeetings";
import "./CurrentMeetings.css";

interface ArchievedMeetingsProps {
  selectedOrg: number | null;
}

const ArchievedMeetings: React.FC<ArchievedMeetingsProps> = ({
  selectedOrg,
}) => {
  const [meetings, setMeetings] = useState<MediaInfoCardProps[]>([]);

  const loadMeetings = useCallback(async () => {
    try {
      if (!selectedOrg) {
        setMeetings([]);
        return;
      }

      const { meetings: orgMeetings } = await fetchOrgMeetings(selectedOrg);
      console.log(orgMeetings);
      // ✅ only include archived ones
      const archived = orgMeetings.filter((m) => !m.currentPlaying);

      const withDefaults = archived.map((m) => ({
        name: m.name ?? "untitled",
        imageUrl: m.imageUrl ?? "/default.jpg",
        description: m.description ?? "",
        questionsCount: m.questionsCount ?? 0,
        videoLengthSec: m.videoLengthSec ?? 0,
        tags: m.tags ?? [],
        createdAt: m.createdAt ?? new Date().toISOString(),
        ownerEmail: m.ownerEmail ?? "",
        sharedWith: m.sharedWith ?? [],
        VideoSegments: [],
        className: "",
        onClick: () => console.log(`Open meeting: ${m.description}`),
        selectedOrgId: selectedOrg,
      }));

      setMeetings(withDefaults);
    } catch (err) {
      console.error("❌ Failed to load archived meetings:", err);
    }
  }, [selectedOrg]);

  const handleDelete = (name: string) => {
    deleteMeeting(selectedOrg!, name);
    setMeetings((prev) => prev.filter((m) => m.name !== name));
  };

  const handleUnarchive = (name: string) => {
    unarchiveMeeting(selectedOrg!, name);
    setMeetings((prev) => prev.filter((m) => m.name !== name));
  };

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  return (
    <main className="cm">
      <h1 className="cm__title">Archived Meetings</h1>
      <section className="cm__grid">
        {meetings.map((m, idx) => (
          <MediaInfoCardArchieved
            key={idx}
            {...m}
            handleDelete={handleDelete}
            handleUnarchive={handleUnarchive}
          />
        ))}
      </section>
    </main>
  );
};

export default ArchievedMeetings;
