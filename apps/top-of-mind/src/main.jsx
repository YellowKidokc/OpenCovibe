import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Columns3, Send, Paperclip, Sparkles, XCircle } from "lucide-react";
import { IconRail } from "./components/sidebar/IconRail";
import { WorkspaceSidebar } from "./components/sidebar/WorkspaceSidebar";
import { RightRail } from "./components/rightdock/RightRail";
import { RightDockPanel } from "./components/rightdock/RightDockPanel";
import { PromptsPanel } from "./components/prompts/PromptsPanel";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { ModelsPanel } from "./components/models/ModelsPanel";
import { PluginsPanel } from "./components/plugins/PluginsPanel";
import { AgentsPanel } from "./components/agents/AgentsPanel";
import { NotepadPanel } from "./components/notepad/NotepadPanel";
import { RagVectorPanel } from "./components/rag/RagVectorPanel";
import { MessageCard } from "./components/chat/MessageCard";
import { topOfMindApi } from "./lib/api/topOfMindApi";
import { validateRouting } from "./lib/conversation";
import "./styles.css";

function App() {
  const [sources, setSources] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [activePanel, setActivePanel] = useState("chats");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWide, setSidebarWide] = useState(false);

  // Symmetric right dock: slim rail always visible, panel 3-state
  // 'open' | 'wide' | 'collapsed'
  const [rightPanelState, setRightPanelState] = useState("open");
  const [rightTab, setRightTab] = useState("convergence");
  const [quickSettings, setQuickSettings] = useState(() => {
    const defaults = { compactCards: false };
    try {
      const saved = JSON.parse(localStorage.getItem("tom.quickSettings") || "{}");
      return { ...defaults, ...saved };
    } catch {
      return defaults;
    }
  });
  // Persist quick settings across reloads
  useEffect(() => {
    try {
      localStorage.setItem("tom.quickSettings", JSON.stringify(quickSettings));
    } catch {
      /* storage unavailable */
    }
  }, [quickSettings]);
  const [selectedFolder, setSelectedFolder] = useState("inbox");
  const [activeChat, setActiveChat] = useState("New conversation");
  const [online, setOnline] = useState(false);
  const [status, setStatus] = useState("");

  // Multi-Model Split Layout State
  // 'single' | 'split-3' | 'split-4' | 'top-grid'
  const [splitMode, setSplitMode] = useState("single");

  // Active models per split column
  const [columnModels, setColumnModels] = useState({
    col0: "claude",
    col1: "deepseek",
    col2: "kimi",
    col3: "gpt",
  });

  const [folders, setFolders] = useState([]);
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const activeThreadRef = useRef(null);
  const [participants, setParticipants] = useState(["echo"]);
  const [mode, setMode] = useState("once");
  const [rounds, setRounds] = useState(2);
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const sendingRef = useRef(false);

  async function refreshWorkspace() {
    const data = await topOfMindApi.getWorkspace();
    setFolders(data.folders);
    setThreads(data.threads);
    const current = data.threads.find((t) => t.id === activeThreadRef.current);
    if (current) setActiveChat(current.title);
    return data;
  }
  useEffect(() => {
    let cancelled = false;
    Promise.all([topOfMindApi.getSources(), topOfMindApi.getWorkspace()])
      .then(([data, workspace]) => {
        if (cancelled) return;
        setSources(data.sources);
        setFolders(workspace.folders);
        setThreads(workspace.threads);
        setOnline(true);
        setColumnModels({ col0: "echo", col1: "echo", col2: "echo", col3: "echo" });
        let remembered;
        try {
          remembered = localStorage.getItem("tom.activeThread");
        } catch {
          /* optional UI preference */
        }
        const thread =
          workspace.threads.find((t) => t.id === remembered) || workspace.threads.at(-1);
        if (thread) selectThread(thread);
      })
      .catch((e) => {
        if (!cancelled) {
          setOnline(false);
          setStatus(`Backend unavailable: ${e.message}`);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    activeThreadRef.current = activeThread;
    if (!activeThread) {
      setMessages([]);
      setBusy(false);
      return;
    }
    let cancelled = false;
    async function poll() {
      try {
        const data = await topOfMindApi.getMessages(activeThread);
        if (cancelled) return;
        setMessages(data.messages);
        setBusy(data.job?.status === "running");
        if (data.job?.status === "storage-error")
          setStatus("Replies could not be saved. Check disk access.");
      } catch (e) {
        if (!cancelled) setStatus(e.message);
      }
    }
    poll();
    const timer = setInterval(poll, 1200);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeThread]);

  function selectFolder(folderId) {
    activeThreadRef.current = null;
    setActiveThread(null);
    setSelectedFolder(folderId);
    setActiveChat("New conversation");
    setMessages([]);
    setBusy(false);
  }
  function selectThread(thread) {
    try {
      localStorage.setItem("tom.activeThread", thread.id);
    } catch {
      /* optional UI preference */
    }
    activeThreadRef.current = thread.id;
    setActiveThread(thread.id);
    setActiveChat(thread.title);
    setSelectedFolder(thread.folder);
    setActivePanel("chats");
    setMessages([]);
    setStatus("");
  }
  const filteredMessages = useMemo(
    () => messages.filter((m) => (m.content || "").toLowerCase().includes(query.toLowerCase())),
    [messages, query],
  );

  async function handleNewChat() {
    try {
      const thread = await topOfMindApi.createThread(selectedFolder);
      await refreshWorkspace();
      selectThread(thread);
    } catch (e) {
      setStatus(e.message);
    }
  }
  async function handleCreateFolder(name, parent) {
    try {
      const folder = await topOfMindApi.createFolder(name, parent);
      await refreshWorkspace();
      selectFolder(folder.id);
      return true;
    } catch (e) {
      setStatus(e.message);
      return false;
    }
  }
  async function handleSend(override) {
    if (sendingRef.current || busy) return;
    const text = typeof override === "string" ? override : input.trim();
    if (!text) return;
    sendingRef.current = true;
    setSubmitting(true);
    try {
      const routing = validateRouting(participants, mode, Number(rounds));
      let threadId = activeThread;
      if (!threadId) {
        const thread = await topOfMindApi.createThread(selectedFolder);
        selectThread(thread);
        threadId = thread.id;
      }
      await topOfMindApi.createMessage({
        body: text,
        thread: threadId,
        client_id: crypto.randomUUID(),
        ...routing,
      });
      if (activeThreadRef.current === threadId) {
        setInput("");
        setBusy(true);
        setStatus("Replies requested.");
      }
      await refreshWorkspace();
    } catch (e) {
      setStatus(`Could not send: ${e.message}`);
    } finally {
      sendingRef.current = false;
      setSubmitting(false);
    }
  }

  // Left rail: clicking an icon opens its panel; clicking the active
  // icon again shuts the panel all the way back to the slim bar.
  function handleRailSelect(key) {
    if (key === activePanel) {
      setSidebarCollapsed((c) => !c);
    } else {
      setActivePanel(key);
      setSidebarCollapsed(false);
    }
  }

  // Right rail mirrors the left: icon opens the dock, active icon shuts it.
  function handleRightRailSelect(tab) {
    if (tab === rightTab && rightPanelState !== "collapsed") {
      setRightPanelState("collapsed");
    } else {
      setRightTab(tab);
      if (rightPanelState === "collapsed") setRightPanelState("open");
    }
  }

  function handleCombine() {
    setInput(
      "Summarize this shared conversation. Identify agreements, disagreements, supporting evidence, and unresolved questions.",
    );
    setMode("once");
    setParticipants(participants.slice(0, 1));
    setStatus("Choose the AI to write the summary, then press Send.");
  }
  function handleJoin() {
    setSplitMode("single");
    setStatus("This thread already shares every AI reply with the selected participants.");
  }
  async function handleStop() {
    try {
      await topOfMindApi.endAll();
      setBusy(false);
      setStatus("Stopped. Conversation history is preserved.");
    } catch (e) {
      setStatus(e.message);
    }
  }

  return (
    <div className="app">
      {/* 1. Left Icon Rail */}
      <IconRail activePanel={activePanel} setActivePanel={handleRailSelect} sources={sources} />

      {/* 2. Middle Workspace Sidebar */}
      <WorkspaceSidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        wide={sidebarWide}
        setWide={setSidebarWide}
        activePanel={activePanel}
        query={query}
        setQuery={setQuery}
        selectedFolder={selectedFolder}
        setSelectedFolder={selectFolder}
        onNewChat={handleNewChat}
        activeChat={activeChat}
        folders={folders}
        threads={threads}
        activeThread={activeThread}
        onCreateFolder={handleCreateFolder}
        onUpdateFolder={async (data) => {
          try {
            await topOfMindApi.updateFolder(data);
            await refreshWorkspace();
            setStatus("Folder saved.");
          } catch (e) {
            setStatus(e.message);
          }
        }}
        onUpdateThread={async (data) => {
          try {
            await topOfMindApi.updateThread(data);
            const workspace = await refreshWorkspace();
            selectThread(workspace.threads.find((t) => t.id === data.id));
            setStatus("Conversation saved.");
          } catch (e) {
            setStatus(e.message);
          }
        }}
        onSelectChat={selectThread}
      />

      {/* 3. Main Workspace Area */}
      <main className="main">
        {/* Top bar with Split Mode Controls */}
        <header className="topbar">
          <div className="topbar-left">
            <h1>Top of Mind</h1>
            <span className={`topbar-status ${online ? "online" : ""}`}>
              {online ? "● Connected" : "○ Backend unavailable"}
            </span>
          </div>

          {/* TypingMind Style Split View Controls */}
          {activePanel === "chats" && (
            <div className="split-controls">
              <button
                className={`split-btn ${splitMode === "single" ? "active" : ""}`}
                onClick={() => setSplitMode("single")}
                title="Single Stream"
              >
                Single
              </button>
              <button
                className={`split-btn ${splitMode === "split-3" ? "active" : ""}`}
                onClick={() => setSplitMode("split-3")}
                title="3-Way Vertical Split"
              >
                Split 3
              </button>
              <button
                className={`split-btn ${splitMode === "split-4" ? "active" : ""}`}
                onClick={() => setSplitMode("split-4")}
                title="4-Way Vertical Split"
              >
                Split 4
              </button>
              <button
                className={`split-btn ${splitMode === "top-grid" ? "active" : ""}`}
                onClick={() => setSplitMode("top-grid")}
                title="Top-Grid Preview Box"
              >
                Top Grid
              </button>
            </div>
          )}
        </header>

        {/* Panel Switcher */}
        {activePanel === "knowledge" && (
          <RagVectorPanel
            folder={selectedFolder}
            onSendToComposer={(text) => {
              setInput(text);
              setActivePanel("chats");
            }}
          />
        )}
        {activePanel === "notepad" && (
          <NotepadPanel
            onSendToComposer={(text) => {
              setInput(text);
              setActivePanel("chats");
            }}
          />
        )}
        {activePanel === "rag" && (
          <RagVectorPanel
            folder={selectedFolder}
            onSendToComposer={(text) => {
              setInput(text);
              setActivePanel("chats");
            }}
          />
        )}
        {activePanel === "prompts" && (
          <PromptsPanel
            onCopyToComposer={(p) => {
              setInput(p);
              setActivePanel("chats");
            }}
          />
        )}
        {activePanel === "settings" && <SettingsPanel />}
        {activePanel === "models" && (
          <ModelsPanel
            onChanged={async () => setSources((await topOfMindApi.getSources()).sources)}
          />
        )}
        {activePanel === "plugins" && (
          <fieldset disabled style={{ border: 0, overflow: "auto" }}>
            <legend>Preserved plugin preview — installation is not connected yet.</legend>
            <PluginsPanel />
          </fieldset>
        )}
        {activePanel === "agents" && (
          <fieldset disabled style={{ border: 0, overflow: "auto" }}>
            <legend>Preserved agent preview — agent execution is not connected yet.</legend>
            <AgentsPanel />
          </fieldset>
        )}

        {activePanel === "chats" && (
          <div className={`stream-container ${quickSettings.compactCards ? "compact-cards" : ""}`}>
            {/* Split Screen 3-way or 4-way vertical layout */}
            {(splitMode === "split-3" || splitMode === "split-4") && (
              <div className="split-columns">
                {[0, 1, 2, ...(splitMode === "split-4" ? [3] : [])].map((colIndex) => {
                  const colKey = `col${colIndex}`;
                  const currentModel = columnModels[colKey];
                  const colMessages = filteredMessages.filter(
                    (m) => m.role === "user" || m.source === currentModel || !m.source,
                  );

                  return (
                    <div className="split-column" key={colKey}>
                      <div className="split-column-header">
                        <select
                          className="column-model-select"
                          value={currentModel}
                          onChange={(e) =>
                            setColumnModels((prev) => ({ ...prev, [colKey]: e.target.value }))
                          }
                        >
                          {sources.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: "11px", color: "var(--tom-text-dim)" }}>
                            Lane {colIndex + 1}
                          </span>
                          <button
                            className="sidebar-toggle-btn"
                            title={`Change display filter for ${currentModel}`}
                            style={{
                              padding: "2px 5px",
                              fontSize: "11px",
                              color: "var(--tom-text-dim)",
                            }}
                            onClick={() => {
                              // Switch lane or drop to fewer columns
                              if (splitMode === "split-4" && colIndex === 3) {
                                setSplitMode("split-3");
                              } else if (splitMode === "split-3" && colIndex === 2) {
                                setSplitMode("single");
                              } else {
                                setColumnModels((prev) => ({ ...prev, [colKey]: "ollama" }));
                              }
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      <div className="column-stream">
                        {colMessages.length === 0 ? (
                          <div className="empty-canvas" style={{ padding: "20px" }}>
                            <p>Ready for prompt.</p>
                          </div>
                        ) : (
                          colMessages.map((m, i) => <MessageCard key={m.id || i} message={m} />)
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Top-Grid pinned view */}
            {splitMode === "top-grid" && (
              <div className="top-grid-container">
                <div className="top-grid-boxes">
                  {participants.map((mKey) => (
                    <div className="pinned-box" key={mKey}>
                      <div className="pinned-box-header">
                        <span>{mKey.toUpperCase()}</span>
                        <span>{busy ? "Replying" : "Participant"}</span>
                      </div>
                      <p>
                        {[...filteredMessages].reverse().find((m) => m.source === mKey)?.content ||
                          "No reply yet."}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="column-stream" style={{ flex: 1 }}>
                  {filteredMessages.map((m, i) => (
                    <MessageCard key={m.id || i} message={m} />
                  ))}
                </div>
              </div>
            )}

            {/* Single Stream View */}
            {splitMode === "single" && (
              <div className="column-stream" style={{ flex: 1, padding: "20px" }}>
                {filteredMessages.length === 0 ? (
                  <div className="empty-canvas">
                    <h2>Welcome to Top of Mind</h2>
                    <p>
                      Choose up to six AIs in the side panel. They share this conversation, and you
                      control who replies next.
                    </p>
                  </div>
                ) : (
                  filteredMessages.map((m, i) => <MessageCard key={m.id || i} message={m} />)
                )}
              </div>
            )}
          </div>
        )}

        <div
          role="status"
          style={{ padding: "6px 16px", fontSize: 12, color: "var(--tom-text-dim)" }}
        >
          {status}
        </div>
        {/* 4. Bottom Composer */}
        <footer className="composer-area">
          <div className="composer-toolbar">
            <div className="composer-left-actions">
              <button
                className="action-pill-btn"
                onClick={handleCombine}
                title="Combine active streams into synthesis"
              >
                <Sparkles size={12} />
                <span>Combine</span>
              </button>
              <button
                className="action-pill-btn"
                onClick={() => setSplitMode(splitMode === "split-3" ? "split-4" : "split-3")}
                title="Change the display layout; choose replying AIs in the side panel"
              >
                <Columns3 size={12} />
                <span>Split view</span>
              </button>
              <button
                className="action-pill-btn danger"
                onClick={handleStop}
                title="Stop further replies without deleting messages"
              >
                <XCircle size={12} />
                <span>Stop all</span>
              </button>
            </div>

            <div style={{ fontSize: "11px", color: "var(--tom-text-dim)" }}>
              Folder: <b>{folders.find((f) => f.id === selectedFolder)?.name}</b> · Replies:{" "}
              <b>{busy ? "Running" : mode}</b>
            </div>
          </div>

          <div className="composer-input-row">
            <button
              className="sidebar-toggle-btn"
              title="Attach File"
              style={{ padding: "6px", color: "var(--tom-text-dim)" }}
            >
              <Paperclip size={16} />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Message selected AIs… (Enter to send, Shift+Enter for a new line)"
            />
            <button
              className="send-btn"
              onClick={() => handleSend()}
              disabled={!input.trim() || busy || submitting || !online}
              title="Send to the selected participants"
            >
              <Send size={14} style={{ display: "inline", marginRight: "4px" }} />
              Send
            </button>
          </div>
        </footer>
      </main>

      {/* 5. Right Dock Panel (mirrors left sidebar: open / wide / shut to rail) */}
      {rightPanelState !== "collapsed" && (
        <RightDockPanel
          participants={participants}
          setParticipants={setParticipants}
          mode={mode}
          setMode={setMode}
          rounds={rounds}
          setRounds={setRounds}
          busy={busy || submitting}
          tab={rightTab}
          setTab={setRightTab}
          state={rightPanelState}
          setState={setRightPanelState}
          sources={sources}
          columnModels={columnModels}
          setColumnModels={setColumnModels}
          splitMode={splitMode}
          setSplitMode={setSplitMode}
          selectedFolder={selectedFolder}
          activeChat={activeChat}
          onCombine={handleCombine}
          onJoin={handleJoin}
          quickSettings={quickSettings}
          setQuickSettings={setQuickSettings}
          onOpenFullSettings={() => {
            setActivePanel("settings");
            setSidebarCollapsed(false);
          }}
        />
      )}

      {/* 6. Right Icon Rail (slim bar, always visible) */}
      <RightRail
        activeTab={rightTab}
        panelOpen={rightPanelState !== "collapsed"}
        onSelect={handleRightRailSelect}
      />
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
