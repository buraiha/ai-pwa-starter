import type { Note, ServerNote } from "../models";
import { NoteRepository } from "../repositories/noteRepository";

type SyncSummary = { uploaded: number; downloaded: number; conflicts: number; failed: number };

const isServerNote = (value: unknown): value is ServerNote => {
  if (!value || typeof value !== "object") return false;
  const note = value as Partial<ServerNote>;
  return typeof note.id === "string" && typeof note.title === "string" && typeof note.body === "string"
    && typeof note.updatedAt === "string" && typeof note.version === "number"
    && (note.deletedAt === undefined || typeof note.deletedAt === "string");
};

const readJson = async (response: Response): Promise<unknown> => {
  try { return await response.json(); } catch { throw new Error(`サーバー応答を解釈できません (${response.status})`); }
};

export class SyncService {
  constructor(private readonly repository = new NoteRepository(), private readonly request: typeof fetch = globalThis.fetch) {}

  async synchronize(): Promise<SyncSummary> {
    const summary: SyncSummary = { uploaded: 0, downloaded: 0, conflicts: 0, failed: 0 };
    for (const note of await this.repository.syncCandidates()) await this.upload(note, summary);

    const response = await this.request("/api/notes");
    if (!response.ok) throw new Error(`受信に失敗しました (${response.status})`);
    const payload = await readJson(response);
    if (!Array.isArray(payload) || !payload.every(isServerNote)) throw new Error("受信データの形式が正しくありません");
    for (const note of payload) {
      await this.repository.mergeFromServer(note);
      summary.downloaded += 1;
    }
    return summary;
  }

  private async upload(note: Note, summary: SyncSummary): Promise<void> {
    try {
      const response = await this.request("/api/notes/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: note.id,
          title: note.title,
          body: note.body,
          updatedAt: note.updatedAt,
          deletedAt: note.deletedAt,
          baseVersion: note.serverVersion ?? null
        })
      });
      const payload = await readJson(response);
      if (response.status === 409 && isServerNote((payload as { current?: unknown }).current)) {
        await this.repository.markConflict(note.id, note.updatedAt, (payload as { current: ServerNote }).current);
        summary.conflicts += 1;
        return;
      }
      if (!response.ok || !isServerNote(payload)) throw new Error(`送信に失敗しました (${response.status})`);
      await this.repository.markSynced(note.id, note.updatedAt, payload);
      summary.uploaded += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "送信に失敗しました";
      await this.repository.markFailed(note.id, note.updatedAt, message);
      summary.failed += 1;
    }
  }
}
