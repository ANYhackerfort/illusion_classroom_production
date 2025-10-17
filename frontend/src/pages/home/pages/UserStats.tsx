// src/components/UserStats.tsx
import React, { useEffect, useState } from "react";
import { getUserStats } from "../../api/meetingApi";
import type { UserStats } from "../../api/meetingApi";
import "./UserStats.css";

const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const UserStatsPage: React.FC = () => {
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getUserStats();
        setStats(data);
      } catch (err) {
        console.error("Failed to load user stats", err);
      }
    })();
  }, []);

  if (!stats) {
    return <div className="userstats__loading">Loading user stats...</div>;
  }

  return (
    <div className="userstats__container">
      <h2 className="userstats__title">Individual</h2>
      <div className="userstats__card">
        <p>
          <strong>Email:</strong> {stats.userEmail}
        </p>
        <p>
          <strong>Total Meetings:</strong> {stats.totalMeetings}
        </p>
        <p>
          <strong>Total Video Length:</strong>{" "}
          {formatDuration(stats.totalVideoLengthSec)}
        </p>
        <p>
          <strong>Average Video Length:</strong>{" "}
          {formatDuration(stats.averageVideoLengthSec)}
        </p>
        <p>
          <strong>Total Collaborators:</strong> {stats.totalCollaborators}
        </p>
        <p>
          <strong>Member Since:</strong>{" "}
          {stats.membershipStart
            ? new Date(stats.membershipStart).toLocaleDateString()
            : "N/A"}
        </p>
        <p>
          <strong>Membership Duration:</strong> {stats.membershipDurationDays}{" "}
          days
        </p>
      </div>

      {stats.meetingDates.length > 0 && (
        <div className="userstats__meetings">
          <h3>Meeting History</h3>
          <ul>
            {stats.meetingDates.map((d, i) => (
              <li key={i}>{new Date(d).toLocaleDateString()}</li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="userstats__title">Organization</h2>
    </div>
  );
};

export default UserStatsPage;
