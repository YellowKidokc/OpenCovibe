import { useState } from "react";
import { topOfMindApi as api } from "../../lib/api/topOfMindApi";
export function SettingsPanel() {
  const [status, setStatus] = useState("");
  async function exportData() {
    try {
      const workspace = await api.exportWorkspace();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(workspace, null, 2)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "top-of-mind-workspace.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("Exported workspace.");
    } catch (e) {
      setStatus(e.message);
    }
  }
  return (
    <div className="settings-content-col">
      <h2>Workspace storage</h2>
      <p>
        Folders, conversations, notes, provider definitions, and document indexes are stored by the
        Rust backend. Desktop data lives under ~/.opencovibe/top-of-mind/workspace.json. API keys
        stay in backend environment variables.
      </p>
      <button className="action-pill-btn" onClick={exportData}>
        Export workspace
      </button>
      <label style={{ display: "block", marginTop: 16 }}>
        Import workspace archive
        <input
          type="file"
          accept=".json,application/json"
          onChange={async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
              if (file.size > 10000000) throw new Error("Choose an archive smaller than 10 MB.");
              await api.importWorkspace(JSON.parse(await file.text()));
              setStatus(
                "Imported without replacing existing conversations. Reload the app to see imported folders.",
              );
            } catch (e) {
              setStatus(e.message);
            }
            e.target.value = "";
          }}
        />
      </label>
      <p role="status">{status}</p>
      <h3>Desktop and web</h3>
      <p>
        The React interface runs in Tauri or a browser. A Cloudflare deployment also needs an
        authenticated backend; publishing static files alone does not provide AI access or
        synchronization.
      </p>
    </div>
  );
}
