import React, { useEffect, useState } from "react";
import { getUserInfo } from "../../api/userApi";
import type { UserInfo } from "../../api/userApi";
import "./UserBlock.css";

const DEFAULT_AVATAR =
  "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

const LoggedInUserBlock: React.FC = () => {
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    getUserInfo().then(setUser).catch(console.error);
  }, []);

  if (!user) return null;

  return (
    <div className="user-block-wrapper">
      <div className="user-block">
        <img
          src={user.picture || DEFAULT_AVATAR}
          alt="user"
          className="user-avatar"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
          }}
        />
        <div className="user-info">
          <div className="user-name">{user.name}</div>
          <div className="user-email">{user.email}</div>
        </div>
      </div>
    </div>
  );
};

export default LoggedInUserBlock;
