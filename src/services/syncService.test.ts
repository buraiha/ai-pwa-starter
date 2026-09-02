import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StarterDatabase } from "../db/database";
import { NoteRepository } from "../repositories/noteRepository";
import { SyncService } from "./syncService";

const jsonResponse = (value: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => value
}) as Response;

let database: StarterDatabase;
let repository: NoteRepository;

beforeEach(() => {
  database = new StarterDatabase(`sync-test-${crypto.randomUUID()}`);
  repository = new NoteRepository(database);
});

afterEach(async () => {
  const name = database.name;
  database.close();
  await Dexie.delete(name);
  vi.unstubAllGlobals();
});

describe("SyncService", () => {
  it("標準fetchをWindowのメソッドとして呼び出す", async () => {
    await repository.save({ id: "note-1", title: "端末", body: "本文" }, "2026-09-02T00:00:00.000Z");
    const server = { id: "note-1", title: "端末", body: "本文", updatedAt: "2026-09-02T00:00:00.000Z", version: 1 };
    const windowFetch = vi.fn(function (this: typeof globalThis, _input: RequestInfo | URL, init?: RequestInit) {
      if (this !== globalThis) throw new TypeError("Can only call Window.fetch on instances of Window");
      return Promise.resolve(init?.method === "POST" ? jsonResponse(server) : jsonResponse([server]));
    });
    vi.stubGlobal("fetch", windowFetch);

    const result = await new SyncService(repository).synchronize();

    expect(result).toEqual({ uploaded: 1, downloaded: 1, conflicts: 0, failed: 0 });
    expect(windowFetch).toHaveBeenCalledTimes(2);
  });

  it("pendingを送信してサーバー版を同期済みにする", async () => {
    await repository.save({ id: "note-1", title: "端末", body: "本文" }, "2026-09-02T00:00:00.000Z");
    const server = { id: "note-1", title: "端末", body: "本文", updatedAt: "2026-09-02T00:00:00.000Z", version: 1 };
    const request = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => init?.method === "POST" ? jsonResponse(server) : jsonResponse([server]));

    const result = await new SyncService(repository, request as typeof fetch).synchronize();

    expect(result).toEqual({ uploaded: 1, downloaded: 1, conflicts: 0, failed: 0 });
    expect(await repository.get("note-1")).toMatchObject({ syncStatus: "synced", serverVersion: 1 });
    expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toMatchObject({ id: "note-1", baseVersion: null });
  });

  it("409では端末版とサーバー版を競合として保持する", async () => {
    await repository.mergeFromServer({ id: "note-1", title: "旧版", body: "", updatedAt: "2026-09-02T00:00:00.000Z", version: 1 });
    await repository.save({ id: "note-1", title: "端末版", body: "" }, "2026-09-02T00:01:00.000Z");
    const server = { id: "note-1", title: "サーバー版", body: "", updatedAt: "2026-09-02T00:02:00.000Z", version: 2 };
    const request = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => init?.method === "POST"
      ? jsonResponse({ error: "version_conflict", current: server }, 409)
      : jsonResponse([server]));

    const result = await new SyncService(repository, request as typeof fetch).synchronize();

    expect(result.conflicts).toBe(1);
    expect(await repository.get("note-1")).toMatchObject({ title: "端末版", syncStatus: "conflict", conflict: { title: "サーバー版", version: 2 } });
  });
});
