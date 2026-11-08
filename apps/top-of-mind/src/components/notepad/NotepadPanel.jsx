import { useEffect, useRef, useState } from "react";
import { topOfMindApi as api } from "../../lib/api/topOfMindApi";
export function NotepadPanel({ onSendToComposer }) {
  const [notes, setNotes] = useState([]);
  const [active, setActive] = useState(null);
  const [status, setStatus] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  useEffect(() => {
    let live = true;
    api
      .getLibrary()
      .then((data) => {
        if (live) {
          setNotes(data.notes || []);
          setActive(data.notes?.[0]?.id);
          setReady(true);
        }
      })
      .catch((e) => {
        if (live) setStatus(e.message);
      });
    return () => {
      live = false;
    };
  }, []);
  const note = notes.find((n) => n.id === active);
  async function save(next, nextActive = active) {
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setStatus("Saving…");
    try {
      await api.saveLibrary("notes", next);
      setNotes(next);
      setActive(next.some((n) => n.id === nextActive) ? nextActive : next[0]?.id);
      setStatus("Saved.");
    } catch (e) {
      setStatus(e.message);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }
  return (
    <fieldset
      disabled={!ready || saving}
      className="notepad-view-container"
      style={{ border: 0, margin: 0, padding: 0 }}
    >
      <legend className="sr-only">Notes</legend>
      <aside className="notepad-sidebar-col">
        <h2>Notes</h2>
        <button
          className="new-chat"
          onClick={() => {
            const n = { id: crypto.randomUUID(), title: "Untitled note", content: "" };
            save([...notes, n], n.id);
          }}
        >
          New note
        </button>
        {notes.map((n) => (
          <button className="panel-row" key={n.id} onClick={() => setActive(n.id)}>
            {n.title}
          </button>
        ))}
      </aside>
      <div className="settings-content-col">
        {note ? (
          <form
            key={note.id}
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              save(
                notes.map((n) =>
                  n.id === active
                    ? { ...n, title: data.get("title"), content: data.get("content") }
                    : n,
                ),
              );
            }}
            style={{ display: "grid", gap: 12 }}
          >
            <label htmlFor="note-title">Title</label>
            <input
              id="note-title"
              className="column-model-select"
              name="title"
              defaultValue={note.title}
              required
            />
            <label htmlFor="note-content">Note</label>
            <textarea
              id="note-content"
              className="agent-textarea"
              style={{ width: "100%", minHeight: 300 }}
              name="content"
              defaultValue={note.content}
            />
            <button className="action-pill-btn">Save note</button>
            <button
              type="button"
              className="action-pill-btn"
              onClick={() => onSendToComposer(note.content)}
            >
              Use saved note in message
            </button>
            <button
              type="button"
              className="action-pill-btn danger"
              onClick={() => {
                if (confirm("Delete this note?")) save(notes.filter((n) => n.id !== active));
              }}
            >
              Delete note
            </button>
          </form>
        ) : (
          <p>Create a note to get started.</p>
        )}
        <p role="status">{status}</p>
      </div>
    </fieldset>
  );
}
