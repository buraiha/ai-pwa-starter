import Dexie, { type Table } from "dexie";
import type { Note } from "../models";

export class StarterDatabase extends Dexie {
  notes!: Table<Note, string>;

  constructor(name = "ai-pwa-starter") {
    super(name);
    this.version(1).stores({
      notes: "id, syncStatus, updatedAt, deletedAt"
    });
  }
}

export const db = new StarterDatabase();
