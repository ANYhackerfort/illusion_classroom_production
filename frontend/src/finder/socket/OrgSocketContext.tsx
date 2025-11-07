// src/hooks/OrgSocketContext.tsx
import React, { createContext, useContext } from "react";
import { useOrgSocket } from "./useorgSocket";

interface OrgSocketProviderProps {
  orgId: string;
  children: React.ReactNode;
}

interface OrgSocketContextValue {
  socket: WebSocket | null;
  connected: boolean;
}

const OrgSocketContext = createContext<OrgSocketContextValue | undefined>(
  undefined,
);

export const OrgSocketProvider: React.FC<OrgSocketProviderProps> = ({
  orgId,
  children,
}) => {
  const { socket, connected } = useOrgSocket(orgId);
  return (
    <OrgSocketContext.Provider value={{ socket, connected }}>
      {children}
    </OrgSocketContext.Provider>
  );
};

export const useOrgSocketContext = () => {
  const context = useContext(OrgSocketContext);
  if (!context) {
    throw new Error(
      "useOrgSocketContext must be used within OrgSocketProvider",
    );
  }
  return context;
};
