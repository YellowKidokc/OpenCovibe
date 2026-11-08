import React, { useState } from "react";
import {
  Bot,
  Plus,
  Check,
  Sliders,
  Sparkles,
  Database,
  FileText,
  ChevronRight,
  MessageSquare,
  Terminal,
} from "lucide-react";

const INITIAL_AGENTS = [
  {
    id: "master-orchestrator",
    name: "Master Orchestrator",
    role: "Coordinates between Claude, DeepSeek, and Local Ollama",
    model: "claude",
    status: "Active",
    system:
      "You are the central synthesis commander. When the user sends a task, formulate sub-tasks and review lane responses.",
  },
  {
    id: "physics-analyst",
    name: "Theophysics Scholar",
    role: "Axiom, Claim, and Evidence classifier for the vault",
    model: "deepseek",
    status: "Active",
    system:
      "Analyze statements against core FIS first principles and classify note items systematically.",
  },
  {
    id: "ahk-automator",
    name: "Desktop Commander",
    role: "Controls local apps via AutoHotkey API",
    model: "ahk",
    status: "Active",
    system: "Translate user intentions into desktop hotkeys and window automation commands.",
  },
];

export function AgentsPanel() {
  const [agents, setAgents] = useState(INITIAL_AGENTS);
  const [selectedAgent, setSelectedAgent] = useState(INITIAL_AGENTS[0]);
  const [overrideSystem, setOverrideSystem] = useState(false);
  const [kbAccess, setKbAccess] = useState("vault");

  return (
    <div className="agents-view-container">
      {/* Agents Sidebar */}
      <div className="agents-sidebar-col">
        <div className="models-pane-title">AI Agents</div>
        <button
          className="new-chat"
          style={{ marginBottom: 12 }}
          onClick={() => {
            const newAg = {
              id: "agent-" + Date.now(),
              name: "New Custom Agent",
              role: "Specialized desktop assistant",
              model: "claude",
              status: "Draft",
              system: "You are a helpful assistant.",
            };
            setAgents([...agents, newAg]);
            setSelectedAgent(newAg);
          }}
        >
          <Plus size={14} />
          New AI Agent
        </button>

        <div className="models-items-scroll">
          {agents.map((ag) => (
            <div key={ag.id} className="model-list-card" onClick={() => setSelectedAgent(ag)}>
              <div className="model-card-info">
                <div className="model-card-name">{ag.name}</div>
                <div className="model-card-meta">{ag.role}</div>
              </div>
              <span className="badge-provider">{ag.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Editor Pane */}
      <div className="agents-editor-col">
        {selectedAgent ? (
          <div className="agents-editor-scroll">
            <div className="agent-editor-header">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="source-avatar" style={{ width: 42, height: 42, fontSize: 16 }}>
                  🤖
                </div>
                <div>
                  <input
                    type="text"
                    value={selectedAgent.name}
                    onChange={(e) => {
                      const updated = { ...selectedAgent, name: e.target.value };
                      setSelectedAgent(updated);
                      setAgents(agents.map((a) => (a.id === updated.id ? updated : a)));
                    }}
                    className="agent-title-input"
                  />
                  <div style={{ fontSize: 12, color: "var(--tom-text-dim)" }}>
                    Assigned Engine: <b>{selectedAgent.model.toUpperCase()}</b>
                  </div>
                </div>
              </div>
              <button className="send-btn">Save Agent</button>
            </div>

            {/* System Instruction */}
            <div className="editor-group">
              <div className="editor-label-row">
                <label>System Instructions *</label>
                <button className="action-pill-btn">
                  <Sparkles size={11} style={{ marginRight: 4, color: "var(--tom-gold)" }} />
                  Auto-fill Prompt
                </button>
              </div>
              <textarea
                rows={5}
                className="agent-textarea"
                value={selectedAgent.system}
                onChange={(e) => {
                  const updated = { ...selectedAgent, system: e.target.value };
                  setSelectedAgent(updated);
                  setAgents(agents.map((a) => (a.id === updated.id ? updated : a)));
                }}
                placeholder="Describe how this agent should think, reason, and respond..."
              />
            </div>

            {/* Knowledge Base Access */}
            <div className="editor-group">
              <label>Knowledge Base & Vault Access</label>
              <select
                className="column-model-select"
                style={{ width: "100%", marginTop: 6, height: 36 }}
                value={kbAccess}
                onChange={(e) => setKbAccess(e.target.value)}
              >
                <option value="vault">Full Access: Z:\Theophysics_Vault</option>
                <option value="notes">Notes Only (Indexed)</option>
                <option value="none">No Knowledge Base Access (Pure Engine)</option>
              </select>
            </div>

            {/* Welcome message */}
            <div className="editor-group">
              <label>Welcome Message / Conversation Starter</label>
              <input
                type="text"
                className="search-box"
                style={{ width: "100%", marginTop: 6, background: "#121212" }}
                defaultValue="Ready. How can I assist you with your tasks today?"
              />
            </div>
          </div>
        ) : (
          <div className="empty-canvas">Select or create an agent</div>
        )}
      </div>
    </div>
  );
}
