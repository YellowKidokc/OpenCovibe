# Top of Mind (ToM) — UI Architecture Blueprint & Reference Guide

This document captures the design principles, visual tokens, layout structures, and component specifications derived from the 12 reference screenshots located in [`docs/ui-references/`](./ui-references/).

---

## 1. Reference Screenshots Inventory

| File | Primary View | Key Features & Design Patterns |
|---|---|---|
| `chrome_DvNwzbYgtJ.png` | **Top of Mind Deployed UI** | Dark `#0a0a0a` theme, left icon rail (`w-12`), middle folder sidebar (`w-64`), central chat stream, bottom composer with Funnel/Combine/Split/End All bar. |
| `chrome_SbnaDdqSYp.png` | **TypingMind Core Layout** | Clean square icon buttons (`w-9 h-9`), primary pill `+ New Chat`, search bar with filter & sort icons, user avatar pinned to bottom-left, model selector pill (`GPT-5.4`) above input bar. |
| `chrome_O3vUt9025B.png` | **Model Management** | 3-column dense model switcher: Category list (OpenAI, Anthropic, Google, DeepSeek, Local Ollama), center searchable toggle list with context windows (1M, 400K), right detail pane (ID, Pricing, Features: Plugins, Vision, Thinking mode, Background mode). |
| `chrome_gk2sKSJQdr.png` | **New AI Agent (Left Pane)** | Agent avatar + name + draft status, System Instructions with Auto-fill, Override toggle, and right-side training files / KB access settings. |
| `chrome_tBvIL6u2Cp.png` | **Agent Details & Collapsible Sections** | General info, Base model & parameters, Tools & skills, Knowledge base access, Chat experience (Welcome message, Conversation starters). |
| `chrome_TGLX86Clz2.png` | **Agent Tool Assignment** | Toggles for assigning specific models, assigning tools & skills (MCP connectors, plugins), TTS voice assignment. |
| `chrome_jpihRZ4s1y.png` | **Prompt Library (Empty State)** | Clean dark empty state with action cards: Reusable Prompts, Variables Support, Organize with Tags, Quick Favorites. |
| `chrome_TYA8WtSRlx.png` | **Prompt Editor (Template Form)** | Title, Description, Prompt template body with `{{field 1}}` variable notation, Tag input, and right-hand Tips sidebar. |
| `chrome_Mp0pCEEefJ.png` | **Prompt Chaining & Syntax Guide** | Accordion tips: Queue chaining syntax (`----`), `@Agent` mentioning (`@[Marketing Expert]`), and Template variables (`{{variable}}`, `{local_date}`). |
| `chrome_XGkaaFHucv.png` | **Plugin & Tool Store** | Store vs Installed tabs, Model tools (Web Browser, Code Sandbox), Plugins (Calculator, Web App Builder, Chart, Image Editor, Deep Research, Perplexity Search) with Install toggles. |
| `chrome_I0qjrgYPuz.png` | **Triadic Studio Workspace** | NotebookLM 3-column triadic layout: Left Source list (`1 source`), Center Synthesis Chat, Right Studio panel (Audio Overview, Slide Deck, Mind Map, Reports, Flashcards, Infographics). |
| `chrome_StlATqaR0S.png` | **App Data & Storage** | Local Storage meter (5.00 MB limit) vs IndexedDB meter (10.74 GB limit), Export/Import, Delete Local Data, Archived Chats viewer. |

---

## 2. Core Layout & Geometry Standards

### Far-Left Icon Rail
- **Width**: `w-12` (48px) fixed, `bg-[#0a0a0a]`, `border-r border-[hsl(var(--tom-border))]`.
- **Buttons**:
  - Exact square bounding boxes: `w-9 h-9` (36px × 36px), centered via `flex items-center justify-center`.
  - Radius: `rounded-md` (6px–8px).
  - Hover: `text-[hsl(var(--tom-text))] bg-[hsl(var(--tom-bg-surface))]`.
  - Active: `text-[hsl(var(--tom-gold))] bg-[hsl(var(--tom-bg-surface))]`.
  - Icon size: `size-4` to `size-[18px]`.
- **Top / Bottom Anchors**:
  - Top: Sidebar toggle, divider line (`w-6 h-px`).
  - Middle: Navigation icons (`Chats`, `Agents`, `Prompts`, `Plugins`, `Models`, `KB`, `Settings`).
  - Bottom: User profile button pinned with `mt-auto`.

### Workspace Sidebar (Middle Column)
- **Width**: `w-64` (256px), collapsible to 0px.
- **Header**:
  - Primary button: Rounded pill `+ New Chat` (`bg-[hsl(var(--tom-gold))] text-[#0a0a0a] font-semibold`), height `h-9` or `h-10`.
- **Search Bar**:
  - Full width input with magnifying glass prefix, filter/sort icon actions on right.
- **Tree View**:
  - Section headers (`FOLDERS`, `PINNED`, `RECENTS`) in uppercase tracking-widest text (`text-[10px] text-[hsl(var(--tom-text-dim))]`).
  - Folders with chevron toggles, folder icons, name labels, and badge counts on right.

### Multi-Model Split Screen Modes
1. **Single Stream (Default)**: Standard chat stream with selected model.
2. **Multi-Column Vertical Split (3-way or 4-way)**:
   - Full height columns spanning across the chat viewport (`flex flex-row h-full divide-x divide-[hsl(var(--tom-border))]`).
   - Each column has its own model header dropdown (e.g., Column 1: `Claude 3.7 Sonnet`, Column 2: `DeepSeek R1 / V3`, Column 3: `Kimi 2.5`, Column 4: `Local Ollama`).
   - Shared bottom composer broadcasts to all active columns simultaneously or individually.
3. **Top-Grid / Pinned Box Layout**:
   - 2-to-4 compact response preview cards pinned at the top grid.
   - Main synthesis conversation stream active below.

---

## 3. Visual Tokens (Dark & Gold System)

```css
:root {
  --tom-bg: 0 0% 4%;           /* #0a0a0a deepest void */
  --tom-bg-elevated: 0 0% 7%;  /* #121212 card & bar background */
  --tom-bg-surface: 0 0% 10%;  /* #1a1a1a hover & active states */
  --tom-border: 0 0% 16%;      /* #282828 subtle borders */
  --tom-text: 0 0% 92%;        /* #ebebeb high contrast text */
  --tom-text-muted: 0 0% 55%;  /* #8c8c8c secondary metadata */
  --tom-text-dim: 0 0% 40%;    /* #666666 subtle labels & counts */
  --tom-gold: 43 55% 58%;      /* #d4af37 warm gold accent */
  --tom-gold-dim: 43 40% 40%;  /* #91752b muted gold */
  --tom-green: 142 50% 45%;    /* status online */
  --tom-red: 0 62% 50%;        /* error / end all */
  --tom-blue: 210 60% 55%;     /* links & info */
}
```

---

## 4. Implementation Priorities

1. **Geometry Sizing Harmonization**: Ensure the icon rail, New Chat button, and folder rows have identical geometric alignment.
2. **Split-Screen Multi-Model Controller**: Build the 3-column / 4-column parallel stream layout with broadcast composer support.
3. **Prompt Library Integration**: Support `{{variable}}` prompt templates and prompt chaining syntax.
4. **Knowledge Bank & Storage Diagnostics**: LocalStorage + IndexedDB meters and clean export/import routines.
