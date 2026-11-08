import {
  Bot,
  BrainCircuit,
  CheckCircle2,
  Clipboard,
  FileAudio,
  FileImage,
  FileText,
  FileType,
  FileVideo,
  Folder,
  Image,
  Keyboard,
  MessageSquare,
  Mic,
  PauseCircle,
  Plug,
  Plus,
  Search,
  Settings,
  Sparkles,
  Wrench,
  XCircle,
  AlertTriangle,
  VolumeX,
  CircleDot,
  ChevronDown,
  ChevronRight,
  Database,
} from "lucide-react";

export const navIcons = {
  chats: MessageSquare,
  notepad: FileText,
  rag: Database,
  agents: Bot,
  prompts: Sparkles,
  models: BrainCircuit,
  tools: Plug,
  plugins: Plug,
  knowledge: Folder,
  settings: Settings,
  search: Search,
  newChat: Plus,
  folders: Folder,
};
export const sourceMeta = {
  kimi: { label: "Kimi", initials: "Ki", icon: Bot, tone: "cyan" },
  codex: { label: "Codex", initials: "Cx", icon: Wrench, tone: "blue" },
  claude: { label: "Claude", initials: "Cl", icon: Sparkles, tone: "orange" },
  gpt: { label: "GPT", initials: "GPT", icon: BrainCircuit, tone: "green" },
  clipboard: { label: "Clipboard", initials: "Cb", icon: Clipboard, tone: "slate" },
  autohotkey: { label: "AutoHotkey bridge", initials: "AHK", icon: Keyboard, tone: "purple" },
  ocr: { label: "OCR bridge", initials: "OCR", icon: Image, tone: "pink" },
};
export const statusMeta = {
  online: { label: "online", icon: CheckCircle2, tone: "online" },
  ready: { label: "online", icon: CheckCircle2, tone: "online" },
  paused: { label: "paused", icon: PauseCircle, tone: "paused" },
  idle: { label: "paused", icon: PauseCircle, tone: "paused" },
  muted: { label: "muted", icon: VolumeX, tone: "muted" },
  "needs review": { label: "needs review", icon: AlertTriangle, tone: "review" },
  needs_review: { label: "needs review", icon: AlertTriangle, tone: "review" },
  error: { label: "error", icon: XCircle, tone: "error" },
};
export const fileTypeIcons = {
  markdown: FileText,
  text: FileText,
  pdf: FileType,
  image: FileImage,
  audio: FileAudio,
  video: FileVideo,
  transcript: Mic,
  folder: Folder,
};
export function getSourceMeta(source = "") {
  const key = String(source)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (key.includes("auto")) return sourceMeta.autohotkey;
  if (key.includes("ocr")) return sourceMeta.ocr;
  if (key.includes("clip")) return sourceMeta.clipboard;
  if (key.includes("kimi")) return sourceMeta.kimi;
  if (key.includes("codex")) return sourceMeta.codex;
  if (key.includes("claude")) return sourceMeta.claude;
  if (key.includes("gpt")) return sourceMeta.gpt;
  return {
    label: source || "Source",
    initials: (source || "?").slice(0, 2).toUpperCase(),
    icon: CircleDot,
    tone: "slate",
  };
}
export function SourceAvatar({ source, status, compact = false }) {
  const meta = getSourceMeta(source);
  const Icon = meta.icon;
  const statusInfo = statusMeta[status] || statusMeta.online;
  return (
    <span
      className={`source-avatar ${meta.tone} ${compact ? "compact" : ""}`}
      title={`${meta.label} · ${statusInfo.label}`}
    >
      <Icon size={compact ? 13 : 15} />
      <span>{meta.initials}</span>
    </span>
  );
}
export function StatusBadge({ status = "online" }) {
  const meta = statusMeta[status] || statusMeta[String(status).toLowerCase()] || statusMeta.online;
  const Icon = meta.icon;
  return (
    <span className={`status-badge ${meta.tone}`}>
      <Icon size={12} />
      {meta.label}
    </span>
  );
}
export { ChevronDown, ChevronRight };
