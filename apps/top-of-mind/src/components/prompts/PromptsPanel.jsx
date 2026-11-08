import React, { useEffect, useState } from "react";
import { useLibrary } from "../../lib/useLibrary";
import {
  Plus,
  Search,
  Copy,
  Check,
  Sparkles,
  ChevronDown,
  Tag,
  BookOpen,
  Layers,
  AtSign,
} from "lucide-react";

const INITIAL_PROMPTS = [
  {
    id: "p1",
    title: "Multi-Perspective Synthesis",
    desc: "Take responses from 3 distinct models and synthesize consensus vs divergence points.",
    tags: ["Synthesis", "Multi-Model"],
    template:
      "Review the following analyses from Claude, DeepSeek, and Local Ollama:\n\n{{responses}}\n\nIdentify:\n1. Core points of universal agreement\n2. Key divergences in perspective or methodology\n3. Final synthesized consensus recommendation",
  },
  {
    id: "p2",
    title: "Axiom & Evidence Verification",
    desc: "Verify a claim against core principles and structure evidence tags for Theophysics.",
    tags: ["Theophysics", "Axiom", "Evidence"],
    template:
      'Analyze the claim: "{{claim}}"\n\nEvaluate its consistency with first principles. Return formatted with:\n- Axiom Reference\n- Supporting Evidence\n- Potential Counter-Arguments',
  },
  {
    id: "p3",
    title: "Desktop AutoHotkey Action Generator",
    desc: "Generate clean AHK v2 scripts to automate window focus and text box submission.",
    tags: ["AHK", "Automation"],
    template:
      'Write an AutoHotkey v2 script to attach to the window titled "{{window_title}}", focus the primary input control, paste "{{clipboard_content}}", and submit with Enter.',
  },
];

export function PromptsPanel({ onCopyToComposer }) {
  const [prompts, setPrompts, ready, error] = useLibrary("prompts", INITIAL_PROMPTS);
  const [selectedPrompt, setSelectedPrompt] = useState(INITIAL_PROMPTS[0]);
  const [copiedId, setCopiedId] = useState(null);
  useEffect(() => {
    if (ready) setSelectedPrompt(prompts[0] || null);
  }, [ready]);
  const [search, setSearch] = useState("");

  const filtered = prompts.filter(
    (p) =>
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())),
  );

  function handleCopy(p) {
    if (onCopyToComposer) {
      onCopyToComposer(p.template);
    } else {
      navigator.clipboard?.writeText(p.template);
    }
    setCopiedId(p.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <fieldset disabled={!ready} className="prompts-view-container" style={{ border: 0 }}>
      <legend role="status">{error || (ready ? "Prompt library" : "Loading prompts…")}</legend>
      {/* Sidebar List */}
      <div className="prompts-sidebar-col">
        <div className="models-pane-title">Prompt Templates</div>
        <button
          className="new-chat"
          style={{ marginBottom: 12 }}
          onClick={() => {
            const newP = {
              id: "p-" + Date.now(),
              title: "New Prompt Template",
              desc: "Custom reusable prompt with {{variables}}",
              tags: ["Custom"],
              template: "Write your prompt here using {{variable}} for fill-in fields.",
            };
            setPrompts([...prompts, newP]);
            setSelectedPrompt(newP);
          }}
        >
          <Plus size={14} />
          New Prompt
        </button>

        <div className="search-box" style={{ marginBottom: 10 }}>
          <Search size={14} />
          <input
            type="text"
            placeholder="Search templates & tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="models-items-scroll">
          {filtered.map((p) => (
            <div key={p.id} className="model-list-card" onClick={() => setSelectedPrompt(p)}>
              <div className="model-card-info">
                <div className="model-card-name">{p.title}</div>
                <div className="model-card-meta">{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Editor & Chaining Tips */}
      <div className="prompts-editor-col">
        {selectedPrompt ? (
          <div className="prompt-editor-grid">
            <div className="prompt-editor-main">
              <div className="agent-editor-header">
                <div>
                  <input
                    type="text"
                    value={selectedPrompt.title}
                    onChange={(e) => {
                      const upd = { ...selectedPrompt, title: e.target.value };
                      setSelectedPrompt(upd);
                      setPrompts(prompts.map((p) => (p.id === upd.id ? upd : p)));
                    }}
                    className="agent-title-input"
                  />
                  <div style={{ fontSize: 12, color: "var(--tom-text-dim)" }}>
                    Tags: {selectedPrompt.tags.join(", ")}
                  </div>
                </div>
                <button className="send-btn" onClick={() => handleCopy(selectedPrompt)}>
                  {copiedId === selectedPrompt.id ? (
                    <>
                      <Check size={13} style={{ marginRight: 4 }} /> Copied to Composer
                    </>
                  ) : (
                    <>
                      <Copy size={13} style={{ marginRight: 4 }} /> Use in Composer
                    </>
                  )}
                </button>
              </div>

              <div
                className="editor-group"
                style={{ flex: 1, display: "flex", flexDirection: "column" }}
              >
                <label>
                  Prompt Template (supports <code>&#123;&#123;variables&#125;&#125;</code> notation)
                </label>
                <textarea
                  className="agent-textarea"
                  style={{ flex: 1, minHeight: 220 }}
                  value={selectedPrompt.template}
                  onChange={(e) => {
                    const upd = { ...selectedPrompt, template: e.target.value };
                    setSelectedPrompt(upd);
                    setPrompts(prompts.map((p) => (p.id === upd.id ? upd : p)));
                  }}
                />
              </div>
            </div>

            {/* Right Tips & Chaining Sidebar */}
            <div className="prompt-tips-pane">
              <div className="models-pane-title">Syntax & Tips</div>
              <div className="tip-card">
                <div className="tip-title">
                  <Layers size={14} style={{ color: "var(--tom-gold)" }} />
                  <span>Prompt Chaining</span>
                </div>
                <p>
                  Use <code>----</code> on a new line to chain multi-step prompts. Each section
                  executes sequentially.
                </p>
              </div>

              <div className="tip-card">
                <div className="tip-title">
                  <AtSign size={14} style={{ color: "var(--tom-gold)" }} />
                  <span>@Agent Mentions</span>
                </div>
                <p>
                  Mention <code>@[Master Orchestrator]</code> or <code>@[Claude]</code> directly in
                  your prompt to route that lane.
                </p>
              </div>

              <div className="tip-card">
                <div className="tip-title">
                  <Sparkles size={14} style={{ color: "var(--tom-gold)" }} />
                  <span>Template Variables</span>
                </div>
                <p>
                  Wrap any field name in double braces: <code>&#123;&#123;topic&#125;&#125;</code>{" "}
                  or <code>&#123;&#123;text&#125;&#125;</code> for instant replacement.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-canvas">Select a prompt template</div>
        )}
      </div>
    </fieldset>
  );
}
