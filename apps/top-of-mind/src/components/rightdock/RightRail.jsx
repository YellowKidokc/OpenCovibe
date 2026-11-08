import { Layers, SlidersHorizontal, Settings } from "lucide-react";

const tabs = [
  ["convergence", "Chat Convergence & Model Folders", Layers],
  ["lanes", "Lane Controls & Split Layout", SlidersHorizontal],
  ["settings", "Quick Settings", Settings],
];

export function RightRail({ activeTab, panelOpen, onSelect }) {
  return (
    <aside className="icon-rail-right" aria-label="Right Dock Navigation">
      <nav className="rail-nav">
        {tabs.map(([key, label, Icon]) => {
          const isActive = panelOpen && activeTab === key;
          return (
            <button
              key={key}
              title={label}
              className={`rail-btn ${isActive ? "active" : ""}`}
              onClick={() => onSelect(key)}
            >
              <Icon size={18} />
            </button>
          );
        })}
      </nav>

      <div className="rail-bottom">
        <div className="rail-divider" />
        <span className="rail-dock-dot" title="Right Dock — click an icon to open or shut" />
      </div>
    </aside>
  );
}
