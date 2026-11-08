import React, { useState } from "react";
import {
  Search,
  Plus,
  Check,
  Globe,
  Code,
  Calculator,
  BarChart3,
  Image,
  SearchCode,
  Database,
  Terminal,
  Zap,
} from "lucide-react";

const INITIAL_PLUGINS = [
  {
    id: "calc",
    name: "Simple Calculator",
    desc: "Help the AI assistant do accurate math calculations.",
    icon: Calculator,
    installed: true,
    author: "Top of Mind",
  },
  {
    id: "web-builder",
    name: "Web App Builder",
    desc: "Build simple web apps with HTML/CSS/JS with preview.",
    icon: Code,
    installed: true,
    author: "Top of Mind",
  },
  {
    id: "charts",
    name: "Render Chart",
    desc: "Visualize data by drawing dynamic charts and graphs.",
    icon: BarChart3,
    installed: true,
    author: "Top of Mind",
  },
  {
    id: "gpt-image",
    name: "GPT Image Editor",
    desc: "Generate or edit images with state-of-the-art vision models.",
    icon: Image,
    installed: true,
    author: "OpenAI",
  },
  {
    id: "deep-research",
    name: "Deep Research",
    desc: "Perform in-depth multi-turn search and compile final briefs.",
    icon: SearchCode,
    installed: true,
    author: "Top of Mind",
  },
  {
    id: "web-browser",
    name: "Web Browser & Scraper",
    desc: "Real-time live URL fetch and markdown extraction.",
    icon: Globe,
    installed: false,
    author: "System",
  },
  {
    id: "mcp-bridge",
    name: "Model Context Protocol (MCP)",
    desc: "Connect to local SQLite, filesystem, and tool servers.",
    icon: Terminal,
    installed: false,
    author: "Anthropic / MCP",
  },
  {
    id: "vault-connector",
    name: "Theophysics Vault Connector",
    desc: "Direct indexing and semantic query to Z:\Theophysics_Vault.",
    icon: Database,
    installed: true,
    author: "David OS",
  },
];

export function PluginsPanel() {
  const [plugins, setPlugins] = useState(INITIAL_PLUGINS);
  const [tab, setTab] = useState("all"); // 'all' | 'installed'
  const [search, setSearch] = useState("");

  const filtered = plugins.filter((p) => {
    const matchesTab = tab === "all" || (tab === "installed" && p.installed);
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.desc.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  function toggleInstall(id) {
    setPlugins((prev) => prev.map((p) => (p.id === id ? { ...p, installed: !p.installed } : p)));
  }

  return (
    <div className="plugins-view-container">
      {/* Sidebar navigation */}
      <div className="plugins-sidebar-col">
        <div className="models-pane-title">Plugin Store</div>
        <div className="models-cat-list">
          <button className="models-cat-item" onClick={() => setTab("all")}>
            <div className="cat-label">Store & Discovery</div>
            <div className="cat-count">{plugins.length} available</div>
          </button>
          <button className="models-cat-item" onClick={() => setTab("installed")}>
            <div className="cat-label">Installed Tools</div>
            <div className="cat-count">{plugins.filter((p) => p.installed).length} active</div>
          </button>
        </div>
      </div>

      {/* Main List */}
      <div className="plugins-content-col">
        <div className="plugins-header-row">
          <div>
            <h2>Plugins & MCP Connectors</h2>
            <p className="detail-hint">
              Equip your multi-agent dispatch lanes with tools and local filesystem capabilities.
            </p>
          </div>
          <div className="search-box" style={{ margin: 0, width: 260 }}>
            <Search size={14} />
            <input
              type="text"
              placeholder="Search plugins..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="plugins-grid">
          {filtered.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.id} className="plugin-card">
                <div className="plugin-card-top">
                  <div className="plugin-icon-wrap">
                    <Icon size={20} />
                  </div>
                  <div className="plugin-info">
                    <div className="plugin-name">{p.name}</div>
                    <div className="plugin-author">By {p.author}</div>
                  </div>
                  <button className="plugin-btn" onClick={() => toggleInstall(p.id)}>
                    {p.installed ? (
                      <>
                        <Check size={12} style={{ marginRight: 4 }} />
                        Installed
                      </>
                    ) : (
                      "Install"
                    )}
                  </button>
                </div>
                <div className="plugin-desc">{p.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
