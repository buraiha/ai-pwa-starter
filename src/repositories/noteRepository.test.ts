import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { StarterDatabase } from "../db/database";
import { NoteRepository } from "./noteRepository";

let database: StarterDatabase;
let repository: NoteRepository;

beforeEach(() => {
  database = new StarterDatabase(`starter-test-${crypto.randomUUID()}`);
  repository = new NoteRepository(database);
});

afterEach(async () => {
  const name = database.name;
  database.close();
  await Dexie.delete(name);
});

describe("NoteRepository", () => {
  it("端末へ保存したNoteを一覧に戻す", async () => {
    await repository.save({ id: "note-1", title: " 端末保存 ", body: "オフライン" }, "2026-09-02T00:00:00.000Z");
    expect(await repository.list()).toMatchObject([{ id: "note-1", title: "端末保存", syncStatus: "pending" }]);
  });

  it("未同期の新規Noteは削除時に物理削除する", async () => {
    await repository.save({ id: "note-1", title: "削除", body: "" });
    expect(await repository.remove("note-1")).toBe(true);
    expect(await repository.get("note-1")).toBeUndefined();
  });

  it("同期済みNoteは削除マーカーとして保持する", async () => {
    await repository.mergeFromServer({ id: "note-1", title: "削除", body: "", updatedAt: "2026-09-02T00:00:00.000Z", version: 1 });
    await repository.remove("note-1", "2026-09-02T00:01:00.000Z");
    expect(await repository.list()).toEqual([]);
    expect(await repository.get("note-1")).toMatchObject({ deletedAt: "2026-09-02T00:01:00.000Z", syncStatus: "pending", serverVersion: 1 });
  });

  it("未送信の端末版をサーバー受信で上書きしない", async () => {
    await repository.mergeFromServer({ id: "note-1", title: "旧サーバー", body: "", updatedAt: "2026-09-02T00:00:00.000Z", version: 1 });
    await repository.save({ id: "note-1", title: "端末版", body: "" }, "2026-09-02T00:01:00.000Z");
    await repository.mergeFromServer({ id: "note-1", title: "新サーバー", body: "", updatedAt: "2026-09-02T00:02:00.000Z", version: 2 });
    expect(await repository.get("note-1")).toMatchObject({ title: "端末版", syncStatus: "conflict", conflict: { title: "新サーバー", version: 2 } });
  });

  it("送信中に追加入力された場合は古い応答で同期済みにしない", async () => {
    await repository.save({ id: "note-1", title: "送信対象", body: "" }, "2026-09-02T00:00:00.000Z");
    await repository.save({ id: "note-1", title: "追加入力", body: "" }, "2026-09-02T00:01:00.000Z");
    await repository.markSynced("note-1", "2026-09-02T00:00:00.000Z", { id: "note-1", title: "送信対象", body: "", updatedAt: "2026-09-02T00:00:00.000Z", version: 1 });
    expect(await repository.get("note-1")).toMatchObject({ title: "追加入力", syncStatus: "pending" });
  });
});
