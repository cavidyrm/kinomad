# Implementation Spec: CRM "Local Website Run"

> For the full service this sits inside — schema, endpoints, auth, asset pipeline, publish and
> deploy — read **`BACKEND-GUIDE.md`** first. This file drills into one subsystem of it.

This document specifies the one part of the CRM that cannot be prototyped in HTML: **uploading a
built website as a `.zip`, serving it on a local port, and linking it from the published case
study.** Everything else in `Kinomad CRM.dc.html` is a working front-end reference.

Read this together with the CRM prototype — the field names below match the prototype's state keys
exactly.

---

## 1. What the user does

1. Opens the CRM, picks type **Website**.
2. Fills project meta (name, year, industry, meta line, statement, background, concept).
3. Enters the **Live website URL** — the real deployed site (`https://client.com`). This is what the
   public case study links to.
4. Drops a **`.zip` of the built site** (`dist/`, `out/`, `build/` — an `index.html` plus assets).
5. Sets a **local port** (default `3001`).
6. Clicks **Start local server** → the zip unpacks and is served at `http://localhost:<port>`.
7. Clicks the port row to open the running preview in a new tab.
8. Clicks **Publish to works** → the project appears on the Works page and gets a detail page.

The local run exists so the studio can screenshot, QA, and archive a client build even after the
client's real domain changes or goes down. It is an **internal preview**, never linked publicly.

---

## 2. Data model

```ts
type ProjectType = 'website' | 'brand' | 'three';

interface Project {
  id: string;              // slug, e.g. "aurelia" — used in routes and asset paths
  type: ProjectType;
  num: string;             // "01" — display order within its section
  name: string;
  year: string;
  industry: string;
  meta: string;            // "E-commerce · Design + Dev"
  statement: string;       // italic serif line
  background: string;
  concept: string;
  credits: { who: string; role: string }[];
  publishedAt: string | null;

  // website only
  liveUrl?: string;        // real deployed site — public "Visit site" link
  localPort?: number;      // 3001…3005
  bundleId?: string | null;// id of the uploaded zip, null if none
  bundleStatus?: 'none' | 'unpacking' | 'ready' | 'error';
  bundleError?: string | null;

  // brand + 3d
  shots?: Shot[];
  // 3d only
  reelAssetId?: string | null;  // optional — no reel means shots-only layout
  posterAssetId?: string | null;
}

interface Shot {
  id: string;
  assetId: string;
  size: 'Third' | 'Half' | 'Two thirds' | 'Full'; // → grid span 2 | 3 | 4 | 6 of 6
  ratio: '21/9' | '16/9' | '3/2' | '4/3' | '1/1' | '4/5';
  order: number;
}
```

`size` → `span` mapping (must match the detail pages):
`Third → 2`, `Half → 3`, `Two thirds → 4`, `Full → 6`, on a `repeat(6, 1fr)` grid with `3px` gaps.
Below the 780px breakpoint every shot becomes `span 6`.

---

## 3. Storage layout

```
storage/
  projects/<projectId>/
    meta.json
    shots/<assetId>.<ext>
    reel.mp4
    poster.jpg
  bundles/<bundleId>/
    upload.zip          # original, kept for re-extraction
    site/               # extracted web root — served statically
```

---

## 4. API

All admin routes require auth (see §7).

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/projects` | list, for the CRM index |
| `POST` | `/api/projects` | create draft, returns `id` |
| `PATCH` | `/api/projects/:id` | update fields |
| `POST` | `/api/projects/:id/publish` | validate + publish |
| `POST` | `/api/projects/:id/assets` | multipart image/video upload → `assetId` |
| `DELETE` | `/api/projects/:id/assets/:assetId` | remove |
| `POST` | `/api/projects/:id/bundle` | multipart `.zip` upload → unpack |
| `GET` | `/api/projects/:id/bundle` | `{ status, port, url, error }` |
| `POST` | `/api/projects/:id/bundle/start` | start serving on `localPort` |
| `POST` | `/api/projects/:id/bundle/stop` | stop serving |
| `DELETE` | `/api/projects/:id/bundle` | delete bundle + extracted files |

### Bundle upload → unpack

```
POST /api/projects/:id/bundle    (multipart, field: file)
```

1. Reject anything that is not `application/zip` / `.zip`, or larger than **200 MB**.
2. Write to `storage/bundles/<bundleId>/upload.zip`, set `bundleStatus = 'unpacking'`, respond `202`
   immediately with `{ bundleId }` — the CRM polls `GET .../bundle`.
3. Extract to `storage/bundles/<bundleId>/site/` with these guards:
   - **Zip-slip**: resolve every entry path and reject any that escapes the target directory
     (`..`, absolute paths, symlinks). Abort the whole extraction on the first bad entry.
   - **Zip bomb**: cap total uncompressed size at **1 GB** and entry count at **20 000**.
   - Skip `__MACOSX/`, `.DS_Store`, and dotfiles.
4. Find the web root: if the archive has exactly one top-level directory, descend into it. Then
   require an `index.html` at that level; if absent, search one level deeper for a directory
   containing `index.html`. If still absent → `bundleStatus = 'error'`,
   `bundleError = 'No index.html found in the archive'`.
5. On success: `bundleStatus = 'ready'`, store the resolved web root.

### Serving

- Static file server rooted at the bundle's web root, bound to **`127.0.0.1` only** — never
  `0.0.0.0`. This is a local preview, not a deployment.
- SPA fallback: if a request has no file extension and no file matches, serve `index.html`.
- Set `Cache-Control: no-store` so re-uploads show up immediately.
- Allowed port range **3001–3010**. On `EADDRINUSE`, return `409` with the conflicting project id
  rather than silently picking another port.
- Track running servers in a map `projectId → { server, port }`. Starting a project that is already
  running is a no-op that returns the existing port.
- Stop all servers on process shutdown (`SIGINT`/`SIGTERM`).

---

## 5. Publish validation

Publish is rejected with a list of missing items (the CRM already renders this as a checklist).

Common to all types: `name`, `year`, `industry`, `meta`, `statement`, `background`, `concept`,
at least one credit with both `who` and `role`.

**Website**
- `liveUrl` present and a valid absolute `http(s)` URL
- bundle uploaded and `bundleStatus === 'ready'`
- hero image (doubles as the Works card image — there is no separate card upload)

**Brand identity**
- hero image
- at least one shot

**3D & motion**
- reel is **optional**
- if a reel is present: poster frame required
- if no reel: at least one shot required (the detail page then renders the shots-only layout,
  skips the reel section, and the hero CTA becomes "See the shots" → `#shots`)

Publishing sets `publishedAt` and makes the project visible on the Works page and at its detail
route. Unpublishing keeps the record but hides it.

---

## 6. Front-end wiring (what changes in the prototype)

The prototype holds everything in component state. In production:

- Replace `state.files` / `state.shots` with server-backed assets; upload on file select and store
  the returned `assetId`. Show per-upload progress; the current label swap (`Click to upload…` →
  filename) is the placeholder for it.
- Replace `toggleRun` (a boolean toggle) with real calls to `bundle/start` and `bundle/stop`, and
  poll `GET .../bundle` while `bundleStatus === 'unpacking'`. Status row states:
  `Stopped` (muted) · `Unpacking…` (muted, spinner) · `Running` (accent) · `Error` (red, with
  `bundleError` beneath).
- The port row (`http://localhost:<port>`) becomes a real link, enabled only when running.
- Keep the shots repeater UI exactly as prototyped: add/remove rows, size select, ratio select, live
  summary line ("3 shots · shots-only layout" / "2 shots + reel"). Persist `order` on drag or on
  add/remove.
- Bookings inbox reads from the same API (`GET /api/bookings`); the scheduler on the landing page
  writes to it. In the prototype both sides use browser storage.

---

## 7. Security

- The CRM must be **excluded from the public build** and sit behind auth (session cookie or SSO).
  Add `Disallow: /admin` to `robots.txt` and `noindex` on the route.
- Uploaded bundles are untrusted third-party code. Serve them from a **different origin or port**
  than the CRM (they already are — `localhost:300x`), never from the CMS origin, so a malicious
  bundle cannot read admin cookies.
- Never expose the local preview beyond loopback. If remote preview is ever needed, put it behind
  the same auth and a per-project random subdomain, not a port.
- Validate `liveUrl` against an `http(s)` allowlist before rendering it as a link (no `javascript:`).

---

## 8. Acceptance checks

1. Upload a Vite/Next static export zip → status goes `unpacking` → `ready`, `index.html` found in
   the nested top-level folder.
2. Start → `http://localhost:3001` serves the site; deep link `/about` falls back to `index.html`.
3. Start a second project on the same port → `409`, CRM shows which project holds it.
4. Upload a zip containing `../../etc/passwd` → extraction aborts, `bundleStatus = 'error'`, nothing
   written outside the bundle directory.
5. Upload a zip with no `index.html` → clear error message in the CRM.
6. Publish a website without `liveUrl` → blocked, checklist shows "Live website URL".
7. Publish a 3D project with three shots and no reel → succeeds; the detail page renders shots-only,
   no `<video>` element, CTA reads "See the shots".
8. Restart the server process → no orphaned listeners; previously running projects show `Stopped`.
