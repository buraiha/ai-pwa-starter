import type { StarterDatabase } from "../db/database";
import { db } from "../db/database";
import type { Note, ServerNote } from "../models";

const pendingStatuses = new Set<Note["syncStatus"]>(["pending", "failed", "conflict"]);

export class NoteRepository {
  constructor(private readonly database: StarterDatabase = db) {}

  async list(): Promise<Note[]> {
    const notes = await this.database.notes.toArray();
    return notes.filter((note) => !note.deletedAt).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  get(id: string): Promise<Note | undefined> {
    return this.database.notes.get(id);
  }

  async save(input: { id?: string; title: string; body: string }, now = new Date().toISOString()): Promise<Note> {
    const title = input.title.trim();
    if (!title) throw new Error("タイトルを入力してください");

    const id = input.id ?? crypto.randomUUID();
    const existing = await this.database.notes.get(id);
    const note: Note = {
      id,
      title,
      body: input.body,
      updatedAt: now,
      syncStatus: "pending",
      serverVersion: existing?.serverVersion
    };
    await this.database.notes.put(note);
    return note;
  }

  async remove(id: string, now = new Date().toISOString()): Promise<boolean> {
    const existing = await this.database.notes.get(id);
    if (!existing) return false;
    if (existing.serverVersion === undefined) {
      await this.database.notes.delete(id);
      return true;
    }
    await this.database.notes.put({
      ...existing,
      deletedAt: now,
      updatedAt: now,
      syncStatus: "pending",
      lastSyncError: undefined,
      conflict: undefined
    });
    return true;
  }

  async syncCandidates(): Promise<Note[]> {
    const notes = await this.database.notes.toArray();
    return notes.filter((note) => pendingStatuses.has(note.syncStatus) && note.syncStatus !== "conflict");
  }

  async markSynced(id: string, expectedUpdatedAt: string, server: ServerNote): Promise<void> {
    await this.database.transaction("rw", this.database.notes, async () => {
      const current = await this.database.notes.get(id);
      if (!current || current.updatedAt !== expectedUpdatedAt) return;
      await this.database.notes.put({
        id: server.id,
        title: server.title,
        body: server.body,
        updatedAt: server.updatedAt,
        deletedAt: server.deletedAt,
        syncStatus: "synced",
        serverVersion: server.version
      });
    });
  }

  async markFailed(id: string, expectedUpdatedAt: string, message: string): Promise<void> {
    await this.database.transaction("rw", this.database.notes, async () => {
      const current = await this.database.notes.get(id);
      if (!current || current.updatedAt !== expectedUpdatedAt) return;
      await this.database.notes.put({ ...current, syncStatus: "failed", lastSyncError: message });
    });
  }

  async markConflict(id: string, expectedUpdatedAt: string, server: ServerNote): Promise<void> {
    await this.database.transaction("rw", this.database.notes, async () => {
      const current = await this.database.notes.get(id);
      if (!current || current.updatedAt !== expectedUpdatedAt) return;
      await this.database.notes.put({
        ...current,
        syncStatus: "conflict",
        lastSyncError: "サーバーにも別の変更があります",
        conflict: server
      });
    });
  }

  async mergeFromServer(server: ServerNote): Promise<void> {
    await this.database.transaction("rw", this.database.notes, async () => {
      const local = await this.database.notes.get(server.id);
      if (local && local.syncStatus !== "synced") {
        if (local.serverVersion !== server.version) {
          await this.database.notes.put({ ...local, syncStatus: "conflict", conflict: server, lastSyncError: "サーバーにも別の変更があります" });
        }
        return;
      }
      await this.database.notes.put({
        id: server.id,
        title: server.title,
        body: server.body,
        updatedAt: server.updatedAt,
        deletedAt: server.deletedAt,
        syncStatus: "synced",
        serverVersion: server.version
      });
    });
  }

  async useServerVersion(id: string): Promise<void> {
    const local = await this.database.notes.get(id);
    if (!local?.conflict) throw new Error("採用できるサーバー版がありません");
    await this.mergeResolvedServer(local.conflict);
  }

  async retryLocalVersion(id: string): Promise<void> {
    const local = await this.database.notes.get(id);
    if (!local?.conflict) throw new Error("再送できる競合データがありません");
    await this.database.notes.put({
      ...local,
      serverVersion: local.conflict.version,
      syncStatus: "pending",
      conflict: undefined,
      lastSyncError: undefined
    });
  }

  private async mergeResolvedServer(server: ServerNote): Promise<void> {
    await this.database.notes.put({
      id: server.id,
      title: server.title,
      body: server.body,
      updatedAt: server.updatedAt,
      deletedAt: server.deletedAt,
      syncStatus: "synced",
      serverVersion: server.version
    });
  }
}
