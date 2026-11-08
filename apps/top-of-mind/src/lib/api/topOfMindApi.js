const API_BASE = import.meta.env.VITE_TOP_OF_MIND_API || "/api";

async function request(path, options = {}, body = null) {
  if (window.__TAURI_INTERNALS__) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke("tom_request", {
      method: options.method || "GET",
      path,
      body: body ?? (options.body ? JSON.parse(options.body) : null),
    });
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || data.detail || `${response.status} ${response.statusText}`);
  }
  return response.status === 204 ? null : response.json();
}
const post = (path, data) => request(path, { method: "POST", body: JSON.stringify(data) });
export const topOfMindApi = {
  baseUrl: API_BASE,
  getKnowledge: () => request("/knowledge"),
  indexDocument: (data) => post("/knowledge/index", data),
  searchKnowledge: (data) => post("/knowledge/search", data),
  getLibrary: () => request("/library"),
  saveLibrary: (key, value) => post("/library", { key, value }),
  importWorkspace: (data) => post("/import", data),
  exportWorkspace: () => request("/export"),
  getProviders: () => request("/providers"),
  saveProvider: (data) => post("/providers", data),
  getSources: () => request("/top-of-mind/sources"),
  getWorkspace: () => request("/workspace"),
  updateFolder: (data) => post("/folders/update", data),
  updateThread: (data) => post("/threads/update", data),
  createFolder: (name, parent) => post("/folders", { name, parent }),
  createThread: (folder, title) => post("/threads", { folder, title }),
  getMessages: (thread) =>
    request(`/top-of-mind/messages?thread=${encodeURIComponent(thread)}`, {}, { thread }),
  createMessage: (message) => post("/top-of-mind/messages", message),
  combine: (payload) => post("/top-of-mind/combine", payload),
  endAll: () => post("/top-of-mind/controls/end-all", {}),
  createSource: (source) => post("/top-of-mind/sources", source),
  fileActions: (payload) => post("/operator/file-actions", payload),
};
