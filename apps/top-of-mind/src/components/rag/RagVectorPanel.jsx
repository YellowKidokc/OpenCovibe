import { useEffect, useState } from "react";
import { topOfMindApi as api } from "../../lib/api/topOfMindApi";
export function RagVectorPanel({ folder = "inbox", onSendToComposer }) {
  const [documents, setDocuments] = useState([]);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [semantic, setSemantic] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh() {
    const data = await api.getKnowledge();
    setDocuments(data.documents);
    setConfigured(data.embeddings_configured);
  }
  useEffect(() => {
    setResults([]);
    refresh().catch((e) => setStatus(e.message));
  }, [folder]);
  async function importDocument(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await api.indexDocument({ name, content, folder, vectorize: semantic });
      await refresh();
      setContent("");
      setName("");
      setStatus(
        `Saved ${result.chunks} passages (${result.indexed ? "vector indexed" : "keyword search"}).`,
      );
    } catch (e) {
      setStatus(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function search(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await api.searchKnowledge({ query, folder, semantic });
      setResults(data.results);
      setStatus(`${data.results.length} results · ${data.mode} search`);
    } catch (e) {
      setStatus(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="rag-view-container">
      <aside className="rag-sidebar-col">
        <h2 className="models-pane-title">Folder knowledge</h2>
        {documents
          .filter((d) => d.folder === folder)
          .map((d) => (
            <div className="model-list-card" key={d.id}>
              <div>
                <b>{d.name}</b>
                <p>
                  {d.chunks} passages · {d.indexed ? "Vector indexed" : "Keyword search"}
                </p>
              </div>
            </div>
          ))}
        {!documents.some((d) => d.folder === folder) && <p>No documents in this folder yet.</p>}
      </aside>
      <div className="rag-content-col" style={{ overflow: "auto", padding: 20 }}>
        <h2>Search your documents</h2>
        <p className="detail-hint">
          Import text or Markdown. Search stays within the selected folder. Passages include their
          source when added to your message.
        </p>
        <label>
          <input
            type="checkbox"
            checked={semantic}
            disabled={!configured || busy}
            onChange={(e) => setSemantic(e.target.checked)}
          />{" "}
          Use vector embeddings for import and search
        </label>
        {!configured && (
          <p className="detail-hint">
            Keyword search is available now. Vector search needs an embedding service key configured
            on the backend.
          </p>
        )}
        <form onSubmit={importDocument} style={{ display: "grid", gap: 10, margin: "18px 0" }}>
          <label>
            Document name
            <input
              className="column-model-select"
              style={{ width: "100%" }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label>
            Text or Markdown file
            <input
              type="file"
              accept=".txt,.md,.markdown,text/plain,text/markdown"
              disabled={busy}
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                if (file.size > 200000) {
                  setStatus("Choose a text document smaller than 200 KB.");
                  return;
                }
                setName(file.name);
                setContent(await file.text());
              }}
            />
          </label>
          <label>
            Document text
            <textarea
              className="agent-textarea"
              style={{ width: "100%", minHeight: 130 }}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </label>
          <button className="action-pill-btn" disabled={busy || !content.trim() || !name.trim()}>
            Import document
          </button>
        </form>
        <form onSubmit={search} style={{ display: "flex", gap: 10 }}>
          <input
            className="column-model-select"
            aria-label="Search document passages"
            placeholder="What do you want to find?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            required
          />
          <button className="action-pill-btn" disabled={busy || !query.trim()}>
            Search
          </button>
        </form>
        <p role="status">{status}</p>
        {results.map((r) => (
          <article className="settings-section-card" key={`${r.document}:${r.chunk}`}>
            <b>
              {r.source} · passage {r.chunk}
            </b>
            <p style={{ whiteSpace: "pre-wrap" }}>{r.text}</p>
            <button
              className="action-pill-btn"
              onClick={() =>
                onSendToComposer?.(`[Source: ${r.source}, passage ${r.chunk}]\n${r.text}`)
              }
            >
              Add passage to message
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
