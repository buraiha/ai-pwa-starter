export type SyncStatus = "pending" | "synced" | "failed" | "conflict";

export type ServerNote = {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
  deletedAt?: string;
  version: number;
};

export type Note = Omit<ServerNote, "version"> & {
  syncStatus: SyncStatus;
  serverVersion?: number;
  lastSyncError?: string;
  conflict?: ServerNote;
};
