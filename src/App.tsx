import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { Note } from "./models";
import { NoteRepository } from "./repositories/noteRepository";
import { SyncService } from "./services/syncService";

const repository = new NoteRepository();
const syncService = new SyncService(repository);

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [editingId, setEditingId] = useState<string>();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [message, setMessage] = useState("端末へ保存できます");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => setNotes(await repository.list()), []);

  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    const changed = () => setOnline(navigator.onLine);
    window.addEventListener("online", changed);
    window.addEventListener("offline", changed);
    return () => { window.removeEventListener("online", changed); window.removeEventListener("offline", changed); };
  }, []);

  const resetForm = () => { setEditingId(undefined); setTitle(""); setBody(""); };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await repository.save({ id: editingId, title, body });
      resetForm();
      await reload();
      setMessage("端末へ保存しました。同期はまだです");
    } catch (error) { setMessage(error instanceof Error ? error.message : "保存できませんでした"); }
  };

  const synchronize = async () => {
    setBusy(true);
    try {
      const result = await syncService.synchronize();
      setMessage(`同期完了: 送信${result.uploaded}、受信${result.downloaded}、競合${result.conflicts}、失敗${result.failed}`);
      await reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "同期できませんでした"); }
    finally { setBusy(false); }
  };

  return <main>
    <header>
      <div><p className="eyebrow">AI PWA STARTER</p><h1>オフラインNote</h1></div>
      <span className={online ? "status online" : "status offline"}>{online ? "オンライン" : "オフライン"}</span>
    </header>

    <section className="notice" aria-live="polite">{message}</section>

    <section className="panel">
      <h2>{editingId ? "Noteを編集" : "新しいNote"}</h2>
      <form onSubmit={save}>
        <label>タイトル<input value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
        <label>本文<textarea value={body} onChange={(event) => setBody(event.target.value)} rows={5} /></label>
        <div className="actions"><button type="submit">端末へ保存</button>{editingId && <button type="button" className="secondary" onClick={resetForm}>キャンセル</button>}</div>
      </form>
    </section>

    <section className="list-heading"><h2>端末内のNote</h2><button onClick={() => void synchronize()} disabled={busy || !online}>{busy ? "同期中…" : "同期"}</button></section>
    <section className="cards">
      {notes.length === 0 && <p className="empty">まだNoteはありません。</p>}
      {notes.map((note) => <article className="card" key={note.id}>
        <div className="card-title"><h3>{note.title}</h3><span className={`sync ${note.syncStatus}`}>{note.syncStatus}</span></div>
        <p>{note.body || "本文なし"}</p>
        <small>{new Date(note.updatedAt).toLocaleString()}</small>
        {note.conflict && <div className="conflict">
          <strong>サーバーにも変更があります</strong>
          <p>サーバー版: {note.conflict.title}</p>
          <button className="secondary" onClick={async () => { await repository.useServerVersion(note.id); await reload(); }}>サーバー版を採用</button>
          <button className="secondary" onClick={async () => { await repository.retryLocalVersion(note.id); await reload(); }}>端末版を再送可能にする</button>
        </div>}
        <div className="actions">
          <button className="secondary" onClick={() => { setEditingId(note.id); setTitle(note.title); setBody(note.body); }}>編集</button>
          <button className="danger" onClick={async () => { await repository.remove(note.id); await reload(); }}>削除</button>
        </div>
      </article>)}
    </section>
  </main>;
}
