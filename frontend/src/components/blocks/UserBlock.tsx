import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getMeetingOwner } from "../../api/userApi";
import type { MeetingOwner } from "../../api/userApi";
import "./UserBlock.css";

const DEFAULT_AVATAR =
  "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

const UserBlock: React.FC = () => {
  const { org_id, roomName } = useParams<{
    org_id: string;
    roomName: string;
  }>();
  const [owner, setOwner] = useState<MeetingOwner | null>(null);

  useEffect(() => {
    if (org_id && roomName) {
      getMeetingOwner(parseInt(org_id, 10), roomName)
        .then(setOwner)
        .catch(console.error);
    }
  }, [org_id, roomName]);

  // 🔍 Debug: log owner picture once fetched
  useEffect(() => {
    if (owner) {
      console.log("🔍 Owner picture from backend:", owner.owner_picture);
    }
  }, [owner]);

  if (!owner) return null;

  return (
    <div className="user-block-wrapper">
      <div className="user-block owner-block">
        <img
          src={owner.owner_picture || DEFAULT_AVATAR}
          alt="owner"
          className="user-avatar"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
          }}
        />
        <div className="user-info">
          <div className="user-name">{owner.owner_name}</div>
          <div className="user-email">{owner.owner_email}</div>
        </div>
      </div>
    </div>
  );
};

export default UserBlock;
