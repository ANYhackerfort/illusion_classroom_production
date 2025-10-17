import React, { useState, useEffect } from "react";
import MediaInfoCard from "../cards/OngoingMeeting";
import type { MediaInfoCardProps } from "../cards/OngoingMeeting";
import AddMeetingCard from "../cards/AddCard";
import MeetingDialog from "../dialogs/NewMeetingDialog";
import { createMeeting, fetchUserMeetings } from "../../api/meetingApi";
import { deleteMeeting, archiveMeeting } from "../../api/meetingApi";
import { useCallback } from "react";
import { useParams } from "react-router-dom";
import { safeRoomName } from "../../../types/videoSync/VideoSocketContext";
import "./CurrentMeetings.css";

const CurrentMeetings: React.FC = () => {
  const [meetings, setMeetings] = useState<MediaInfoCardProps[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

    const loadMeetings = useCallback(async () => {
    try {
      const result = await fetchUserMeetings(); // { meetings: [...] }
      const withDefaults = result.meetings.map((m) => ({
        name: m.name ?? "untitled",
        imageUrl: m.imageUrl ?? "/default.jpg",
        description: m.description ?? "",
        questionsCount: m.questionsCount ?? 0,
        videoLengthSec: m.videoLengthSec ?? 0,
        tags: m.tags ?? [],
        createdAt: m.createdAt ?? new Date().toISOString(),
        ownerEmail: m.ownerEmail ?? "",
        sharedWith: m.sharedWith ?? [],

        // Frontend-only props
        VideoSegments: [],
        className: "",
        onClick: () => console.log(`Open meeting: ${m.description}`),
      }));
      setMeetings(withDefaults);
    } catch (err) {
      console.error("❌ Failed to load meetings:", err);
    }
  }, []);

  const handleDelete = (name : string) => {
      if (name !== undefined) {
        deleteMeeting(name);
        setMeetings((prev) => prev.filter((m) => m.name !== name));
      }
    };
  
  const handleArchive = (name: string) => {
    if (name !== undefined) {
      archiveMeeting(name);
      setMeetings((prev) => prev.filter((m) => m.name !== name));
    }
  };

  useEffect(() => {
    loadMeetings();
  }, []);

  const handleSave = async (data: {
    description: string;
    tags: string[];
    name: string;
    sharedWith: string[];
  }) => {
    try {
      const payload = {
        name: safeRoomName(data.name),
        imageUrl: "/default.jpg",
        description: data.description,
        questionsCount: 0,
        videoLengthSec: 0,
        tags: data.tags,
        sharedWith: data.sharedWith,
        VideoSegments: [],
      };

      const result = await createMeeting(payload);
      console.log("✅ Meeting created:", result);
      await loadMeetings();
    } catch (err) {
      console.error("⚠️ Error while creating meeting:", err);
    }
  };

  return (
    <main className="cm">
      <h1 className="cm__title">Current Meetings</h1>
      <section className="cm__grid">
        {meetings.map((m, idx) => (
          <MediaInfoCard key={idx} {...m} handleDelete={handleDelete} handleArchieve={handleArchive}/>
        ))}
        <AddMeetingCard onClick={() => setDialogOpen(true)} />
      </section>

      <MeetingDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />
    </main>
  );
};

export default CurrentMeetings;
