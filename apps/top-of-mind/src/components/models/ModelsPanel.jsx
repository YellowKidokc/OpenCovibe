import { useEffect, useState } from "react";
import { topOfMindApi as api } from "../../lib/api/topOfMindApi";
export function ModelsPanel({ onChanged }) {
  const [providers, setProviders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("");
  async function refresh() {
    const rows = await api.getProviders();
    setProviders(rows);
    return rows;
  }
  useEffect(() => {
    refresh()
      .then((rows) => setSelected(rows.find((p) => p.id !== "echo")))
      .catch((e) => setStatus(e.message));
  }, []);
  async function save(e) {
    e.preventDefault();
    try {
      await api.saveProvider(selected);
      await refresh();
      await onChanged?.();
      setStatus("Provider saved. API keys stay on the backend.");
    } catch (e) {
      setStatus(e.message);
    }
  }
  return (
    <div className="models-view-container">
      <aside className="models-cat-col">
        <h2 className="models-pane-title">API providers</h2>
        {providers
          .filter((p) => p.id !== "echo")
          .map((p) => (
            <button key={p.id} className="models-cat-item" onClick={() => setSelected(p)}>
              {p.name}
            </button>
          ))}
        <button
          className="new-chat"
          onClick={() =>
            setSelected({
              id: crypto.randomUUID(),
              name: "New provider",
              kind: "openai_compat",
              model: "",
              base_url: "https://api.openai.com/v1",
              api_key_env: "CUSTOM_AI_API_KEY",
            })
          }
        >
          Add provider
        </button>
      </aside>
      <div className="settings-content-col">
        <h2>Provider connection</h2>
        <p className="detail-hint">
          Model IDs and endpoints are editable. Set the named API key variable in the backend
          environment, then restart the backend. Keys never enter this form.
        </p>
        {selected && (
          <form onSubmit={save} style={{ display: "grid", gap: 16 }}>
            {["name", "model", "base_url", "api_key_env"].map((key) => (
              <label key={key}>
                {
                  {
                    name: "Name",
                    model: "Model ID",
                    base_url: "API base URL",
                    api_key_env: "API key environment variable",
                  }[key]
                }
                <input
                  className="column-model-select"
                  style={{ width: "100%" }}
                  required
                  value={selected[key]}
                  onChange={(e) => setSelected({ ...selected, [key]: e.target.value })}
                />
              </label>
            ))}
            <label>
              API format
              <select
                className="column-model-select"
                value={selected.kind}
                onChange={(e) => setSelected({ ...selected, kind: e.target.value })}
              >
                <option value="openai_compat">OpenAI compatible</option>
                <option value="anthropic">Anthropic</option>
                <option value="gemini">Gemini</option>
              </select>
            </label>
            <button className="action-pill-btn">Save provider</button>
          </form>
        )}
        <p role="status">{status}</p>
      </div>
    </div>
  );
}
