import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { listNotes, openDatabase, saveNote } from "./store.mjs";

let directory;
let database;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "ai-pwa-starter-"));
  database = openDatabase(join(directory, "test.sqlite"));
});

afterEach(() => {
  database.close();
  rmSync(directory, { recursive: true, force: true });
});

test("新規Noteを保存しバージョンを付ける", () => {
  const result = saveNote(database, { id: "note-1", title: "最初", body: "本文", updatedAt: "2026-09-02T00:00:00.000Z", baseVersion: null });
  assert.equal(result.status, "saved");
  assert.equal(result.note.version, 1);
  assert.deepEqual(listNotes(database), [result.note]);
});

test("同じserverVersionの更新だけを受け入れる", () => {
  saveNote(database, { id: "note-1", title: "最初", body: "", updatedAt: "2026-09-02T00:00:00.000Z", baseVersion: null });
  const updated = saveNote(database, { id: "note-1", title: "更新", body: "", updatedAt: "2026-09-02T00:01:00.000Z", baseVersion: 1 });
  assert.equal(updated.status, "saved");
  assert.equal(updated.note.version, 2);

  const conflict = saveNote(database, { id: "note-1", title: "古い端末", body: "", updatedAt: "2026-09-02T00:02:00.000Z", baseVersion: 1 });
  assert.equal(conflict.status, "conflict");
  assert.equal(conflict.current.title, "更新");
  assert.equal(listNotes(database)[0].version, 2);
});

test("削除を物理削除せず同期用マーカーとして保持する", () => {
  saveNote(database, { id: "note-1", title: "削除対象", body: "", updatedAt: "2026-09-02T00:00:00.000Z", baseVersion: null });
  const result = saveNote(database, { id: "note-1", title: "削除対象", body: "", updatedAt: "2026-09-02T00:03:00.000Z", deletedAt: "2026-09-02T00:03:00.000Z", baseVersion: 1 });
  assert.equal(result.note.deletedAt, "2026-09-02T00:03:00.000Z");
  assert.equal(result.note.version, 2);
});
