# Try Top-of-Mind on Cloudflare

The migration is on the **top-of-mind-migration** branch of
**YellowKidokc/OpenCovibe**. Your original Top-of-Mind repository is unchanged.

## Publish the interface

1. Open your Cloudflare dashboard and go to **Workers & Pages**.
2. Choose **Create application**, then **Pages**, then connect a Git repository.
   Cloudflare may call this **Import an existing Git repository**.
3. Connect GitHub and choose **YellowKidokc/OpenCovibe**.
4. Select the **top-of-mind-migration** branch.
5. Enter these build settings:

   | Setting | Value |
   | --- | --- |
   | Root directory | `apps/top-of-mind` |
   | Framework | Vite (or None with the commands below) |
   | Build command | `npm ci && npm run build` |
   | Build output directory | `dist` |
   | Node version, if requested | `24` |

6. Choose **Save and Deploy**. Cloudflare supplies the website address when the
   build finishes.

If Cloudflare shows only Workers deployment options, switch to the Pages creation
flow; this project uses Pages Functions. Do not deploy the repository root's
Svelte build by mistake.

## What you can try immediately

The site publishes the React interface. AI calls, saved conversations and folder
editing need the Rust backend, so the site will show **Backend unavailable** until
that connection is configured. This is not a complete standalone Cloudflare
backend. Provider API keys must never be entered as `VITE_` variables.

The backend and sign-in requirements are listed in
[the migration guide](docs/top-of-mind/MIGRATION.md#cloudflare-pages). They include
an HTTPS Rust gateway, Cloudflare Access, and these Pages bindings:
`TOM_BACKEND_URL`, `TOM_HUB_TOKEN`, `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`.
The gateway and Rust service must use matching `TOM_HUB_TOKEN` values.

If you only want to see the interface first, you can publish it before configuring
those bindings. Missing bindings deliberately return an unavailable response
rather than exposing an unauthenticated workspace.

## Current limits

The core React/Rust workspace has working nested folders, shared multi-AI threads,
bounded reply modes, notes, prompt storage and document search. Agent and plugin
screens are preserved previews. Native packaging has not been verified here
because Linux desktop libraries are missing. Cloudflare publication has not been
performed from this environment because Cloudflare authentication and network
access are not configured.
