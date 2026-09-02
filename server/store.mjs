import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

const asServerNote = (row) => ({
  id: row.id,
  title: row.title,
  body: row.body,
  updatedAt: row.updated_at,
  ...(row.deleted_at ? { deletedAt: row.deleted_at } : {}),
  version: row.version
});

export function openDatabase(path) {
  mkdirSync(dirname(path), { recursive: true });
  const database = new DatabaseSync(path);
  database.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      version INTEGER NOT NULL CHECK (version > 0)
    );
  `);
  return database;
}

export function listNotes(database) {
  return database.prepare("SELECT * FROM notes ORDER BY updated_at DESC").all().map(asServerNote);
}

export function saveNote(database, input) {
  validateInput(input);
  database.exec("BEGIN IMMEDIATE");
  try {
    const existing = database.prepare("SELECT * FROM notes WHERE id = ?").get(input.id);
    const baseVersion = input.baseVersion ?? null;
    if ((existing && existing.version !== baseVersion) || (!existing && baseVersion !== null)) {
      database.exec("ROLLBACK");
      return { status: "conflict", current: existing ? asServerNote(existing) : null };
    }

    const version = existing ? existing.version + 1 : 1;
    database.prepare(`
      INSERT INTO notes (id, title, body, updated_at, deleted_at, version)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        body = excluded.body,
        updated_at = excluded.updated_at,
        deleted_at = excluded.deleted_at,
        version = excluded.version
    `).run(input.id, input.title.trim(), input.body, input.updatedAt, input.deletedAt ?? null, version);
    const saved = database.prepare("SELECT * FROM notes WHERE id = ?").get(input.id);
    database.exec("COMMIT");
    return { status: "saved", note: asServerNote(saved) };
  } catch (error) {
    if (database.isTransaction) database.exec("ROLLBACK");
    throw error;
  }
}

function validateInput(input) {
  if (!input || typeof input !== "object") throw new TypeError("JSONオブジェクトが必要です");
  if (typeof input.id !== "string" || !input.id || input.id.length > 200) throw new TypeError("idが正しくありません");
  if (typeof input.title !== "string" || !input.title.trim() || input.title.length > 200) throw new TypeError("titleが正しくありません");
  if (typeof input.body !== "string" || input.body.length > 100_000) throw new TypeError("bodyが正しくありません");
  if (typeof input.updatedAt !== "string" || !Number.isFinite(Date.parse(input.updatedAt))) throw new TypeError("updatedAtが正しくありません");
  if (input.deletedAt !== undefined && (typeof input.deletedAt !== "string" || !Number.isFinite(Date.parse(input.deletedAt)))) throw new TypeError("deletedAtが正しくありません");
  if (input.baseVersion !== null && input.baseVersion !== undefined && (!Number.isInteger(input.baseVersion) || input.baseVersion < 1)) throw new TypeError("baseVersionが正しくありません");
}
