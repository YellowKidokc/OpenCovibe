import React, { useState } from "react";
import {
  Database,
  Plus,
  Search,
  Folder,
  FileText,
  Check,
  Upload,
  Trash2,
  HardDrive,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Shield,
  Globe,
} from "lucide-react";
import { fileTypeIcons } from "../icons/AppIcons";

const INITIAL_KB_DOCS = [
  {
    id: "kb-1",
    name: "Z:\\Theophysics_Vault",
    type: "vault",
    chunks: "4,821 chunks",
    vectorStatus: "Indexed",
    dim: "1536 dim",
    desc: "Primary single-source vault: axioms, claims, triadic evidence structures.",
    assignedAgents: ["Master Orchestrator", "Theophysics Scholar"],
    files: [
      { name: "00_REFINED_PAPERS_MASTER", size: "18 MB" },
      { name: "01_Axioms_Invariance.md", size: "24 KB" },
      { name: "02_Evidence_Matrix.md", size: "142 KB" },
      { name: "07_System_and_Operations", size: "4.2 MB" },
    ],
  },
  {
    id: "kb-2",
    name: "Desktop Clipboard Stream",
    type: "clipboard",
    chunks: "312 chunks",
    vectorStatus: "Live Sync",
    dim: "1024 dim",
    desc: "AutoHotkey & system clipboard lane history captured in real-time.",
    assignedAgents: ["Desktop Commander"],
    files: [
      { name: "Active_Clipboard_Buffer.txt", size: "84 KB" },
      { name: "AHK_Window_Titles_Log.json", size: "12 KB" },
    ],
  },
  {
    id: "kb-3",
    name: "Top of Mind UI Architecture Specs",
    type: "codebase",
    chunks: "860 chunks",
    vectorStatus: "Indexed",
    dim: "1536 dim",
    desc: "Blueprint contracts, TypingMind screenshots layout, and API route definitions.",
    assignedAgents: ["Master Orchestrator"],
    files: [
      { name: "UI_ARCHITECTURE_BLUEPRINT.md", size: "6.4 KB" },
      { name: "ahk-react-api-contract.md", size: "6.8 KB" },
      { name: "hub_bridge.py", size: "4.5 KB" },
    ],
  },
];

export function KnowledgePanel() {
  const [kbList, setKbList] = useState(INITIAL_KB_DOCS);
  const [selectedKb, setSelectedKb] = useState(INITIAL_KB_DOCS[0]);
  const [search, setSearch] = useState("");
  const [isVectorizing, setIsVectorizing] = useState(false);

  const filtered = kbList.filter(
    (k) =>
      k.name.toLowerCase().includes(search.toLowerCase()) ||
      k.desc.toLowerCase().includes(search.toLowerCase()),
  );

  function handleReindex() {
    setIsVectorizing(true);
    setTimeout(() => {
      setIsVectorizing(false);
    }, 800);
  }

  return (
    <div className="models-view-container">
      {/* 1. Left Sidebar: Knowledge Bases */}
      <div className="models-cat-col">
        <div className="models-pane-title">Vector Knowledge Bases</div>
        <button
          className="new-chat"
          style={{ marginBottom: 12 }}
          onClick={() => {
            const newKb = {
              id: "kb-" + Date.now(),
              name: "New Custom Knowledge Base",
              type: "markdown",
              chunks: "0 chunks",
              vectorStatus: "Unindexed",
              dim: "1536 dim",
              desc: "Custom vectorized store for agent retrieval.",
              assignedAgents: [],
              files: [],
            };
            setKbList([newKb, ...kbList]);
            setSelectedKb(newKb);
          }}
        >
          <Plus size={14} />
          <span>Add Knowledge Base</span>
        </button>

        <div className="models-items-scroll">
          {filtered.map((kb) => (
            <div
              key={kb.id}
              className={`model-list-card ${selectedKb && selectedKb.id === kb.id ? "selected" : ""}`}
              onClick={() => setSelectedKb(kb)}
            >
              <div className="model-card-info">
                <div className="model-card-name">{kb.name}</div>
                <div className="model-card-meta">
                  {kb.chunks} · {kb.vectorStatus}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Main Content & File Inspector */}
      <div className="models-detail-col" style={{ maxWidth: 840 }}>
        {selectedKb ? (
          <div className="model-detail-body">
            <div className="model-detail-header">
              <div>
                <h2>{selectedKb.name}</h2>
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <span className="badge-provider">{selectedKb.vectorStatus}</span>
                  <span
                    className="badge-provider"
                    style={{
                      color: "var(--tom-text-dim)",
                      background: "#141414",
                      borderColor: "var(--tom-border)",
                    }}
                  >
                    {selectedKb.dim}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="action-pill-btn"
                  onClick={handleReindex}
                  disabled={isVectorizing}
                  title="Recompute vector embeddings across files"
                >
                  <RefreshCw
                    size={12}
                    className={isVectorizing ? "spinning" : ""}
                    style={{ color: "var(--tom-gold)" }}
                  />
                  <span>{isVectorizing ? "Vectorizing..." : "Re-Vectorize"}</span>
                </button>
                <button className="send-btn">
                  <Upload size={12} style={{ display: "inline", marginRight: 4 }} />
                  Attach Files
                </button>
              </div>
            </div>

            <p className="detail-hint">{selectedKb.desc}</p>

            {/* Assigned Agents / Access Controls */}
            <div className="detail-section" style={{ marginTop: 20 }}>
              <div className="detail-subtitle">Agents With Access Permission</div>
              <div className="features-tags">
                {selectedKb.assignedAgents.length === 0 ? (
                  <span style={{ fontSize: 12, color: "var(--tom-text-dim)" }}>
                    No agents assigned. Click below to grant access.
                  </span>
                ) : (
                  selectedKb.assignedAgents.map((ag) => (
                    <span key={ag} className="feature-tag">
                      <Check size={11} style={{ marginRight: 4, color: "var(--tom-green)" }} />
                      {ag}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Files & Source Chunks */}
            <div className="detail-section">
              <div className="detail-subtitle">Vectorized Documents & Chunks</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                {selectedKb.files.map((f) => (
                  <div key={f.name} className="model-list-card" style={{ cursor: "default" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <FileText size={14} style={{ color: "var(--tom-gold)" }} />
                      <span style={{ fontSize: 13, color: "var(--tom-text)" }}>{f.name}</span>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--tom-text-dim)" }}>{f.size}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-canvas">Select a Knowledge Base</div>
        )}
      </div>
    </div>
  );
}
