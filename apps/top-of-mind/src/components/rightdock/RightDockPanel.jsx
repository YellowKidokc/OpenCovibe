import { Bot, Layers, ArrowRightLeft } from "lucide-react";

const TAB_LABELS = {
  convergence: "Convergence",
  lanes: "Lane Controls",
  settings: "Quick Settings",
};

const SPLIT_LABELS = {
  single: "Single",
  "split-3": "Split 3",
  "split-4": "Split 4",
  "top-grid": "Top Grid",
};

function laneCountFor(splitMode) {
  if (splitMode === "split-3") return 3;
  if (splitMode === "split-4" || splitMode === "top-grid") return 4;
  return 1;
}

export function RightDockPanel({
  participants = [],
  setParticipants,
  mode,
  setMode,
  rounds,
  setRounds,
  busy,
  tab,
  setTab,
  state,
  setState,
  sources = [],
  columnModels,
  setColumnModels,
  splitMode,
  setSplitMode,
  selectedFolder,
  activeChat,
  onCombine,
  onJoin,
  quickSettings,
  setQuickSettings,
  onOpenFullSettings,
}) {
  const laneCount = laneCountFor(splitMode);

  const toggleQuick = (key) => setQuickSettings((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <aside className={`right-dock-panel ${state === "wide" ? "wide" : ""}`}>
      <div className="dock-panel-header">
        <span className="dock-panel-title">{TAB_LABELS[tab] || "Dock"}</span>
        <div className="dock-header-btns">
          <button
            className="sidebar-toggle-btn"
            title={
              state === "wide" ? "Shrink dock back to normal width" : "Open dock further (wide)"
            }
            onClick={() => setState(state === "wide" ? "open" : "wide")}
          >
            <span>⇹</span>
          </button>
          <button
            className="sidebar-toggle-btn"
            title="Shut dock all the way to the slim bar"
            onClick={() => setState("collapsed")}
          >
            <span>⇥</span>
          </button>
        </div>
      </div>

      <div className="dock-tabs">
        {Object.entries(TAB_LABELS).map(([key, label]) => (
          <button
            key={key}
            className={`dock-tab ${tab === key ? "active" : ""}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="dock-panel-body">
        <section aria-label="Conversation routing" style={{ marginBottom: 20 }}>
          <div className="dock-section-label">Who should reply?</div>
          {sources.map((source) => (
            <label key={source.id} style={{ display: "block", padding: "6px 0", fontSize: 12 }}>
              <input
                type="checkbox"
                checked={participants.includes(source.id)}
                disabled={
                  busy ||
                  source.status !== "online" ||
                  (!participants.includes(source.id) && participants.length >= 6)
                }
                onChange={(e) =>
                  setParticipants((previous) =>
                    e.target.checked
                      ? [...previous, source.id]
                      : previous.filter((id) => id !== source.id),
                  )
                }
              />{" "}
              {source.name} {source.status !== "online" ? "(offline)" : ""}
            </label>
          ))}
          <p className="detail-hint">
            Selected order: {participants.join(" → ") || "Choose an AI"}. All participants receive
            the shared conversation.
          </p>
          <label style={{ display: "block", marginTop: 12 }}>
            Reply mode
            <select
              className="column-model-select"
              style={{ width: "100%" }}
              value={mode}
              disabled={busy}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="once">Ask once — each AI replies once</option>
              <option value="turns">Take turns — in selected order</option>
              <option value="discuss">Discuss — a limited number of rounds</option>
            </select>
          </label>
          {mode === "discuss" && (
            <label style={{ display: "block", marginTop: 8 }}>
              Rounds (1–5)
              <input
                type="number"
                className="column-model-select"
                min="1"
                max="5"
                step="1"
                value={rounds}
                disabled={busy}
                onChange={(e) => setRounds(Number(e.target.value))}
              />
            </label>
          )}
          <p className="detail-hint">
            At most {participants.length * (mode === "discuss" ? rounds : 1)} AI replies per send.
            Provider API charges still apply.
          </p>
        </section>

        {tab === "convergence" && (
          <>
            <div className="dock-section-label">Chat Convergence & Routing</div>
            <div className="dock-convergence-actions">
              <button className="dock-action-btn" onClick={onCombine}>
                <span>Prepare summary</span>
                <Layers size={13} style={{ color: "var(--tom-gold)" }} />
              </button>
              <button className="dock-action-btn" onClick={onJoin}>
                <span>Show shared thread</span>
                <ArrowRightLeft size={13} style={{ color: "var(--tom-green)" }} />
              </button>
            </div>

            <div
              className="sidebar-section-title"
              style={{ padding: "4px 6px", margin: "8px 0 4px" }}
            >
              <span>Model display filters</span>
              <span>{sources.length}</span>
            </div>
            {sources.map((src) => {
              const isActiveInLane = Object.values(columnModels).includes(src.id);
              return (
                <button
                  key={src.id}
                  className={`dock-folder-item ${isActiveInLane ? "active" : ""}`}
                  onClick={() => setColumnModels((prev) => ({ ...prev, col0: src.id }))}
                >
                  <Bot
                    size={13}
                    style={{ color: isActiveInLane ? "var(--tom-gold)" : "inherit" }}
                  />
                  <span
                    style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {src.name}
                  </span>
                  <span className="dock-badge">{isActiveInLane ? "Shown" : "Hidden"}</span>
                </button>
              );
            })}
          </>
        )}

        {tab === "lanes" && (
          <>
            <div className="dock-section-label">Split Layout</div>
            <div className="split-controls" style={{ alignSelf: "flex-start" }}>
              {Object.entries(SPLIT_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  className={`split-btn ${splitMode === key ? "active" : ""}`}
                  onClick={() => setSplitMode(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="dock-section-label">Lane Assignments</div>
            {Array.from({ length: laneCount }, (_, i) => {
              const colKey = `col${i}`;
              return (
                <div className="qs-row" key={colKey}>
                  <span>Lane {i + 1}</span>
                  <select
                    className="column-model-select"
                    value={columnModels[colKey]}
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
                </div>
              );
            })}

            <p className="dock-hint">
              Folder: <b>{selectedFolder}</b> · Chat: <b>{activeChat}</b>
            </p>
          </>
        )}

        {tab === "settings" && (
          <>
            <div className="dock-section-label">Quick Settings</div>

            <div className="qs-row">
              <span>Compact message cards</span>
              <button
                className={`model-toggle-pill ${quickSettings.compactCards ? "enabled" : ""}`}
                title="Tighter padding on message cards"
                onClick={() => toggleQuick("compactCards")}
              >
                <span className="toggle-handle" />
              </button>
            </div>

            <button className="new-chat" style={{ marginTop: "8px" }} onClick={onOpenFullSettings}>
              <span>Open Full Settings</span>
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
