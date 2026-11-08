const paths = {
  Bot: [
    'rect x="7" y="8" width="10" height="8" rx="3"',
    'path d="M12 4v4M8 12h.01M16 12h.01M9 20h6M12 16v4"',
  ],
  BrainCircuit: [
    'path d="M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0 0 6v1a3 3 0 0 0 5 2.2M15 4a3 3 0 0 1 3 3v1a3 3 0 0 1 0 6v1a3 3 0 0 1-5 2.2M12 8h3v3M12 16h-2v-3"',
  ],
  CheckCircle2: ['path d="M9 12l2 2 4-5"', 'circle cx="12" cy="12" r="9"'],
  Clipboard: [
    'rect x="8" y="4" width="8" height="4" rx="1"',
    'path d="M9 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"',
  ],
  FileAudio: [
    'path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M10 16a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM12 14v-4l4-1v5"',
  ],
  FileImage: [
    'path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 15l2-2 2 2 2-3 3 4"',
  ],
  FileText: [
    'path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h6"',
  ],
  FileType: [
    'path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M10 17h4"',
  ],
  FileVideo: [
    'path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 14h5v4H8zM13 15l3-2v6l-3-2"',
  ],
  Folder: ['path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"'],
  Image: [
    'rect x="3" y="5" width="18" height="14" rx="2"',
    'circle cx="8" cy="10" r="1.5"',
    'path d="M21 16l-5-5L5 19"',
  ],
  Keyboard: [
    'rect x="3" y="6" width="18" height="12" rx="2"',
    'path d="M7 10h.01M11 10h.01M15 10h.01M19 10h.01M8 14h8"',
  ],
  MessageSquare: ['path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"'],
  Mic: ['rect x="9" y="2" width="6" height="12" rx="3"', 'path d="M5 10a7 7 0 0 0 14 0M12 17v5"'],
  PauseCircle: ['circle cx="12" cy="12" r="9"', 'path d="M10 9v6M14 9v6"'],
  Plug: ['path d="M9 7V2M15 7V2M7 7h10v4a5 5 0 0 1-10 0zM12 16v6"'],
  Plus: ['path d="M12 5v14M5 12h14"'],
  Search: ['circle cx="11" cy="11" r="7"', 'path d="M21 21l-4.3-4.3"'],
  Settings: [
    'circle cx="12" cy="12" r="3"',
    'path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 2.1-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V20h-3v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.1-2.1.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.5-1H3v-3h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.1-2.1.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V4h3v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.1 2.1-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1v3h-.1a1.7 1.7 0 0 0-1.5 1z"',
  ],
  Sparkles: [
    'path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5zM5 16l.8 2.2L8 19l-2.2.8L5 22l-.8-2.2L2 19l2.2-.8zM19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z"',
  ],
  Wrench: ['path d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-6 6 3 3 6-6a4 4 0 0 0 5.4-5.4l-3 3-3-3z"'],
  XCircle: ['circle cx="12" cy="12" r="9"', 'path d="M15 9l-6 6M9 9l6 6"'],
  AlertTriangle: [
    'path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"',
  ],
  VolumeX: ['path d="M11 5L6 9H3v6h3l5 4zM18 9l-6 6M12 9l6 6"'],
  CircleDot: ['circle cx="12" cy="12" r="9"', 'circle cx="12" cy="12" r="2"'],
  ChevronDown: ['path d="M6 9l6 6 6-6"'],
  ChevronRight: ['path d="M9 6l6 6-6 6"'],
};

function createIcon(name) {
  return function Icon({ size = 24, strokeWidth = 2, className = "", ...props }) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
      >
        {paths[name].map((d, i) =>
          d.startsWith("path") || d.startsWith("rect") || d.startsWith("circle") ? (
            <g key={i} dangerouslySetInnerHTML={{ __html: `<${d}/>` }} />
          ) : null,
        )}
      </svg>
    );
  };
}
export const Bot = createIcon("Bot");
export const BrainCircuit = createIcon("BrainCircuit");
export const CheckCircle2 = createIcon("CheckCircle2");
export const Clipboard = createIcon("Clipboard");
export const FileAudio = createIcon("FileAudio");
export const FileImage = createIcon("FileImage");
export const FileText = createIcon("FileText");
export const FileType = createIcon("FileType");
export const FileVideo = createIcon("FileVideo");
export const Folder = createIcon("Folder");
export const Image = createIcon("Image");
export const Keyboard = createIcon("Keyboard");
export const MessageSquare = createIcon("MessageSquare");
export const Mic = createIcon("Mic");
export const PauseCircle = createIcon("PauseCircle");
export const Plug = createIcon("Plug");
export const Plus = createIcon("Plus");
export const Search = createIcon("Search");
export const Settings = createIcon("Settings");
export const Sparkles = createIcon("Sparkles");
export const Wrench = createIcon("Wrench");
export const XCircle = createIcon("XCircle");
export const AlertTriangle = createIcon("AlertTriangle");
export const VolumeX = createIcon("VolumeX");
export const CircleDot = createIcon("CircleDot");
export const ChevronDown = createIcon("ChevronDown");
export const ChevronRight = createIcon("ChevronRight");
