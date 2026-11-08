# Top-of-Mind inside OpenCovibe

The migrated React application lives in `apps/top-of-mind`. Its native backend is
`crates/top-of-mind-core`, integrated into the existing Tauri shell through
`tom_request`. The existing Svelte coding workspace remains available through the
original launch commands. The React entry is an alternate desktop frontend;
OpenCovibe's existing coding screens have not been rewritten into React.

## Working features

- Persistent nested folders; rename/reparent folders and rename/move chats.
  Folder cycles and orphaned records are rejected.
- Independent chat threads with all participants' replies in shared context.
  Ask once sends one consistent snapshot to each selected AI concurrently.
  Take turns sends sequentially; Discuss repeats sequentially for 1–5 rounds.
  Select 1–6 participants, with a maximum of 30 replies per send.
- Stop all cancels local outstanding tasks and prevents subsequent turns or late
  replies from entering the thread. A provider may already have processed a
  request; stopping cannot reverse its charges.
- API adapters for OpenAI-compatible services, Anthropic and Gemini, plus a
  key-free echo lane. Local Ollama does not require a fabricated API key.
- Editable provider model IDs, base URLs and API-key variable names. Credentials
  remain on the backend; there are no provider keys in browser build variables.
- Saved notes, saved prompt templates, full workspace export, additive import.
- Text/Markdown document import, overlapping passages, folder-scoped keyword
  search, optional embedding requests and cosine similarity search. Search
  results can be inserted into a message with source/passage citations. No
  simulated embeddings or hard-coded search results are used.
- Existing layouts, icon assets and source panels were carried across. Agent and
  plugin screens are explicitly read-only previews: their actions are not yet
  connected. They are not represented as working agent/plugin runtimes.

Data is stored atomically in one versioned JSON workspace, with a cross-process
writer lock. This first implementation targets a personal workspace; it is not a
multi-user database or an efficient index for millions of documents. Search
covers the selected folder, not every descendant automatically. Document import
is limited to 200 KB of UTF-8 text at a time; PDFs require a future extraction step.

## Install and run

Use the existing checkout. Tasks are already isolated; do not create a Git
worktree unless explicitly requested. Node 24 and Rust stable were used.

From the OpenCovibe root:

```sh
npm ci
npm --prefix apps/top-of-mind ci
npm run tom:build
```

Native desktop (requires the usual Tauri Linux/macOS/Windows prerequisites):

```sh
npm run tom:desktop
```

The alternate config changes only the frontend build/dev entry. The Rust
backend stores data under `~/.opencovibe/top-of-mind/workspace.json`.

Browser development without GTK: start these in separate terminals:

```sh
# Select a dedicated data location outside the checkout. Do not point two
# backends at the same workspace; the second writer is deliberately rejected.
TOM_WORKSPACE=/absolute/path/to/dev-workspace.json npm run tom:hub
```

```sh
npm run tom:dev
```

The Vite app uses its same-origin `/api` proxy to the Rust gateway on loopback
port 8787. The optional gateway binds only to 127.0.0.1. Set `TOM_HUB_TOKEN` on the
backend when accessing it through a tunnel. Provider variable names are visible
in Models. Configure only the providers you intend to use, then restart the
backend. Echo requires no keys.

On this managed machine, Rust was installed under `/workspace`:

```sh
export CARGO_HOME=/workspace/.cargo RUSTUP_HOME=/workspace/.rustup
export PATH="$CARGO_HOME/bin:$PATH"
```

## Embeddings

By default the backend uses `OPENAI_API_KEY` with the OpenAI embeddings endpoint
and `text-embedding-3-small`. To use another compatible service, set
`TOM_EMBEDDING_URL`, `TOM_EMBEDDING_MODEL`, and `TOM_EMBEDDING_KEY_ENV` (the name of
the variable holding its key). HTTPS is required except for a loopback endpoint.
This is optional; keyword search works with no embedding service or API spending.

Enable the vector checkbox when importing and searching. Existing keyword-only
imports must be reimported with vector indexing enabled to use semantic search.
Indexes record their endpoint/model and are excluded from semantic queries using
a different engine; they are never compared across incompatible models.

## Move existing data safely

The original Top-of-Mind repository is unchanged. Its SQLite database does not
contain independent chat identifiers, so the converter groups historical messages
into one imported thread per legacy folder rather than guessing chat boundaries.

```sh
python3 scripts/top-of-mind/export_legacy.py /path/to/topofmind.db /path/to/legacy-export.json
```

This opens SQLite read-only and refuses to overwrite an existing export. It
preserves messages, notes, clipboard records, and knowledge. Clipboard records
remain in the archive/library for preservation; a dedicated clipboard editor is
not yet connected in the React app. Provider secrets and `.env` files are excluded.

Import the JSON through Settings. Import merges records, rejects conflicting
folder/thread/message IDs and cycles, and keeps this installation's provider
configuration. Export before making any large migration. Browser-only preferences
in the old app's local storage are not present in a Git checkout or SQLite export;
they cannot be recovered from the repository. Sample in-memory panel edits in the
old app were never persisted.

## Cloudflare Pages

The React bundle is deployable as a Pages frontend. Set the project root to
`apps/top-of-mind`, build command `npm ci && npm run build`, output `dist`.
The `functions/api/[[path]].js` gateway must be deployed with it. Leave
`VITE_TOP_OF_MIND_API` unset so requests use this same-origin gateway.

Configure Cloudflare Access for this application and set these Pages bindings:

- `ACCESS_TEAM_DOMAIN`: your team hostname ending in `.cloudflareaccess.com`.
- `ACCESS_AUD`: the Access application's audience tag.
- `TOM_BACKEND_URL`: the HTTPS origin of your Rust gateway, e.g. a Cloudflare
  Tunnel to the loopback service (no provider credentials in this URL).
- `TOM_HUB_TOKEN`: a secret matching the Rust gateway's `TOM_HUB_TOKEN`.

The function verifies the JWT signature, issuer, audience and expiry before
proxying. It does not expose the backend token to the browser or forward it
through redirects. Missing configuration returns 503; unsigned requests return
401. The backend process and persistent storage must exist separately: Pages
cannot execute the native Tauri binary. Do not expose the unauthenticated
development gateway. Desktop and hosted workspace data do not automatically sync;
these are separate workspaces unless a later shared-storage transport is added.

Wrangler is pinned in the React app's development dependencies. Validate the
complete frontend and Pages Function bundle from `apps/top-of-mind`:

```sh
npm run cloudflare:build
```

After Cloudflare authentication, API network access, project selection, gateway
hosting and the bindings above are configured, deploy from that same directory:

```sh
npm run cloudflare:deploy -- --project-name YOUR_EXISTING_PAGES_PROJECT
```

The deployment command publishes to the selected project; inspect its existing
production branch and environment bindings first. The build command was verified
successfully. `wrangler whoami` currently reports no authentication, and the
managed environment rejects connections to `api.cloudflare.com`. The environment
configuration service also failed to save the requested token requirement; no
access change has been applied. Supply credentials securely in environment
settings, never in chat or committed files.

No Cloudflare deployment has been made in this task. Account/project bindings,
authentication policy and the hosted backend are still required for a live site.

## Validation

```sh
npm run tom:test
python3 -m unittest discover -s scripts/top-of-mind -p 'test_*.py'
cargo clippy --manifest-path crates/top-of-mind-core/Cargo.toml --features server --all-targets -- -D warnings
```

Browser smoke test, with the development hub and frontend running:

```sh
# Use a disposable TOM_WORKSPACE; the smoke test creates test records.
TOM_CHROMIUM=/usr/bin/chromium npm --prefix apps/top-of-mind run test:browser
# Or install Playwright's matching Chromium and omit TOM_CHROMIUM.
```

The smoke test exercises nested folders, a real Rust echo request, thread reload
persistence, document search with citation insertion, and saved notes. Native
packaging remains blocked on this machine by missing GLib/GTK/WebKit development
packages. Paid provider calls and live embedding services have not been exercised;
provider/embedding HTTP contracts are tested against local mock services.
