import { navIcons, SourceAvatar } from "../icons/AppIcons";
import { User } from "lucide-react";

const nav = [
  ["chats", "Chats & Split Lanes"],
  ["notepad", "Markdown Notepad"],
  ["rag", "Vectorization & RAG Engine"],
  ["agents", "Agents"],
  ["prompts", "Prompts"],
  ["plugins", "Plugins"],
  ["models", "Models"],
  ["knowledge", "Knowledge Base (KB)"],
  ["settings", "Settings"],
];

export function IconRail({ activePanel, setActivePanel, sources = [] }) {
  return (
    <aside className="icon-rail" aria-label="Global Navigation">
      <div className="brand" title="Top of Mind">
        ToM
      </div>
      <div className="rail-divider" />

      <nav className="rail-nav">
        {nav.map(([key, label]) => {
          const Icon = navIcons[key] || navIcons.chats;
          const isActive = activePanel === key;
          return (
            <button
              key={key}
              title={label}
              className={`rail-btn ${isActive ? "active" : ""}`}
              onClick={() => setActivePanel(key)}
            >
              <Icon size={18} />
            </button>
          );
        })}
      </nav>

      {sources.length > 0 && (
        <div className="rail-sources">
          <div className="rail-divider" />
          {sources.slice(0, 5).map((s) => (
            <SourceAvatar key={s.id || s.name} source={s.name || s.id} status={s.status} compact />
          ))}
        </div>
      )}

      <div className="rail-bottom">
        <button
          className="rail-btn profile-btn"
          title="Profile & Workspace"
          onClick={() => setActivePanel("settings")}
        >
          <User size={18} />
        </button>
      </div>
    </aside>
  );
}
