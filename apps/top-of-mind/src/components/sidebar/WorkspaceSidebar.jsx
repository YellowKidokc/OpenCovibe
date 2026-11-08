import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Search, Folder, MessageSquare } from "lucide-react";

function FolderNode({
  folder,
  folders,
  threads,
  depth = 0,
  selectedFolder,
  activeThread,
  query,
  onFolder,
  onThread,
}) {
  const [open, setOpen] = useState(true);
  const chats = threads.filter(
    (t) => t.folder === folder.id && t.title.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="folder-node">
      <button
        className={`folder-row ${selectedFolder === folder.id ? "selected" : ""}`}
        style={{ paddingLeft: 8 + depth * 12 }}
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          onFolder(folder.id);
        }}
      >
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <Folder size={14} />
        <span style={{ flex: 1, textAlign: "left" }}>{folder.name}</span>
        <span>{chats.length}</span>
      </button>
      {(open || query) && (
        <div>
          {chats.map((chat) => (
            <button
              className={`chat-row ${activeThread === chat.id ? "selected" : ""}`}
              style={{ paddingLeft: 22 + depth * 12 }}
              key={chat.id}
              onClick={() => onThread(chat)}
            >
              <MessageSquare size={12} />
              <span>{chat.title}</span>
            </button>
          ))}
          {folders
            .filter((f) => f.parent === folder.id)
            .map((child) => (
              <FolderNode
                key={child.id}
                {...{ folders, threads, selectedFolder, activeThread, query, onFolder, onThread }}
                folder={child}
                depth={depth + 1}
              />
            ))}
        </div>
      )}
    </div>
  );
}
export function WorkspaceSidebar({
  collapsed,
  setCollapsed,
  wide,
  setWide,
  activePanel,
  query,
  setQuery,
  selectedFolder,
  setSelectedFolder,
  onNewChat,
  folders = [],
  threads = [],
  activeThread,
  onSelectChat,
  onCreateFolder,
  onUpdateFolder,
  onUpdateThread,
}) {
  const [name, setName] = useState("");
  const [nested, setNested] = useState(true);
  const [folderName, setFolderName] = useState("");
  const [parent, setParent] = useState("");
  const [threadName, setThreadName] = useState("");
  const [threadFolder, setThreadFolder] = useState("");
  useEffect(() => {
    const folder = folders.find((f) => f.id === selectedFolder);
    setFolderName(folder?.name || "");
    setParent(folder?.parent || "");
  }, [folders, selectedFolder]);
  useEffect(() => {
    const thread = threads.find((t) => t.id === activeThread);
    setThreadName(thread?.title || "");
    setThreadFolder(thread?.folder || selectedFolder);
  }, [threads, activeThread, selectedFolder]);
  if (collapsed)
    return (
      <button
        className="sidebar-toggle-btn floating"
        aria-label="Open sidebar"
        onClick={() => setCollapsed(false)}
      >
        ⇥
      </button>
    );
  return (
    <aside className={`workspace-sidebar ${wide ? "wide" : ""}`}>
      <div className="sidebar-header">
        <span className="sidebar-title">Conversations</span>
        <button
          className="sidebar-toggle-btn"
          aria-label="Resize sidebar"
          onClick={() => setWide(!wide)}
        >
          ⇹
        </button>
        <button
          className="sidebar-toggle-btn"
          aria-label="Collapse sidebar"
          onClick={() => setCollapsed(true)}
        >
          ⇤
        </button>
      </div>
      <button className="new-chat" onClick={onNewChat}>
        <Plus size={16} />
        New chat
      </button>
      <label className="search-box">
        <Search size={14} />
        <input
          aria-label="Search conversations"
          placeholder="Search conversations…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {activePanel === "chats" && (
        <section>
          <div className="sidebar-section-title">Folders · {folders.length}</div>
          {folders
            .filter((f) => !f.parent)
            .map((folder) => (
              <FolderNode
                key={folder.id}
                {...{ folder, folders, threads, selectedFolder, activeThread, query }}
                onFolder={setSelectedFolder}
                onThread={onSelectChat}
              />
            ))}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (await onCreateFolder(name, nested ? selectedFolder : null)) setName("");
            }}
            style={{ padding: 10 }}
          >
            <label>
              New folder
              <input
                className="column-model-select"
                style={{ width: "100%", marginTop: 6 }}
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Folder name"
              />
            </label>
            <label style={{ display: "block", fontSize: 12, margin: "8px 0" }}>
              <input
                type="checkbox"
                checked={nested}
                onChange={(e) => setNested(e.target.checked)}
              />{" "}
              Inside selected folder
            </label>
            <button className="action-pill-btn" type="submit" disabled={!name.trim()}>
              Create folder
            </button>
          </form>
          <details style={{ padding: 10, fontSize: 12 }}>
            <summary>Organize selected folder</summary>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onUpdateFolder({ id: selectedFolder, name: folderName, parent: parent || null });
              }}
              style={{ display: "grid", gap: 8, paddingTop: 8 }}
            >
              <label>
                Folder name
                <input
                  className="column-model-select"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  required
                />
              </label>
              <label>
                Parent folder
                <select
                  className="column-model-select"
                  value={parent}
                  onChange={(e) => setParent(e.target.value)}
                >
                  <option value="">Top level</option>
                  {folders
                    .filter((f) => f.id !== selectedFolder)
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                </select>
              </label>
              <button className="action-pill-btn">Save folder</button>
            </form>
            {activeThread && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onUpdateThread({ id: activeThread, title: threadName, folder: threadFolder });
                }}
                style={{ display: "grid", gap: 8, paddingTop: 14 }}
              >
                <label>
                  Chat title
                  <input
                    className="column-model-select"
                    value={threadName}
                    onChange={(e) => setThreadName(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Chat folder
                  <select
                    className="column-model-select"
                    value={threadFolder}
                    onChange={(e) => setThreadFolder(e.target.value)}
                  >
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="action-pill-btn">Save chat</button>
              </form>
            )}
          </details>
        </section>
      )}
    </aside>
  );
}
