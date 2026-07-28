# Implementation Spec: CRM Hosted Site Bundles

> For the full service this sits inside — schema, endpoints, auth, asset pipeline, publish and
> deploy — read **`BACKEND-GUIDE.md`** first. This file drills into one subsystem of it.

This document specifies the one part of the CRM that cannot be prototyped in HTML: **uploading a
built website as a `.zip`, unpacking it, and serving it from the studio demo host so the case study
can link to it.** Everything else in `Kinomad CRM.dc.html` is a working front-end reference — in the
prototype it runs against `km-api.js`, a stand-in with the same routes and status codes as the
service described here.

Read this together with the CRM prototype — the field names below match the prototype's state keys
exactly.

---

## 1. What the user does

A website project declares **where its site lives** with an External / Hosted toggle. The two paths
never appear at once.

**External** (the common case — the client still runs the site)

1. Opens the CRM, picks type **Website**, fills project meta.
2. Enters the **Live website URL** (`https://client.com`). The public case study links to it.
3. **Publish to works.**

**Hosted by us** (the site was taken down, replaced, or never had a public home)

1. Same meta.
2. Drops a **`.zip` of the built site** (`dist/`, `out/`, `build/` — an `index.html` plus assets).
3. The upload shows real byte progress, then the status row moves
   **Uploading → Unpacking… → Live**, linked to `https://demo.kinomadstudio.com/<slug>`.
4. On failure the row reads **Error** with the server's message and offers **Retry unpack**.
5. **Publish to works** — publish is blocked until the bundle is `ready`.

There is **no port field and no Start/Stop control.** The studio does not operate a local server per
project; the unpacked bundle is served from one host, keyed by slug, so the URL is stable, shareable
inside the studio, and survives a restart. Hosted archives are an internal reference: keep them
behind auth or a random path if they must not be publicly reachable.

---

## 2. Data model

```ts
type ProjectType = 'website' | 'brand' | 'three';

interface Project {
  id: string;
  slug: string;            // derived from name on first save, then FROZEN — it is the public URL
  type: ProjectType;
  state: 'draft' | 'published';
  position: number;        // order within its type group; set by drag-reorder in the index
  name: string;
  year: string;
  industry: string;
  meta: string;            // "E-commerce · Design + Dev"
  statement: string;       // italic serif line
  background: string;
  concept: string;
  credits: { who: string; role: string }[];   // array order IS page order
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;

  // website only
  hosting: 'external' | 'hosted';
  liveUrl?: string;        // external: real deployed site — public "Visit site" link
  bundle?: {
    id: string | null;
    name: string;                                        // original filename
    status: 'none' | 'uploading' | 'unpacking' | 'ready' | 'error';
    message: string | null;                              // human-readable failure reason
    url: string | null;                                  // demo host URL when ready
  };

  // brand + 3d
  shots?: Shot[];
  // 3d only
  reelAssetId?: string | null;  // optional — no reel means shots-only layout
  posterAssetId?: string | null;
}

interface Shot {
  id: string;
  assetId: string;
  span: number;   // 1–6 columns on a repeat(6,1fr) grid — any integer, not a named size
  ratio: string;  // free "w/h" pair: "21/9" "2/1" "16/10" "9/16" "1.85/1" …
  order: number;
}
```

`span` is the column count on a `repeat(6, 1fr)` grid with `3px` gaps. Below the 780px breakpoint
every shot becomes `span 6`. **Validate `ratio` by shape, not against an enum** —
`^\d+(\.\d+)?/\d+(\.\d+)?$`, both sides > 0, resulting ratio between 0.2 and 6. The CRM offers ten
presets plus a custom field, and the detail pages render whatever arrives; a fixed enum is what
previously made real project data (16/10, 2/1) unrepresentable.

The CRM defaults a shot's ratio from the dimensions returned by the asset upload, so
`POST /assets` **must** keep returning `width` and `height`.

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
    site/               # extracted web root — served statically at demo host /<slug>
```

---

## 4. API

All admin routes require auth (see §7).

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/session` | sign in → session cookie |
| `DELETE` | `/api/session` | sign out |
| `GET` | `/api/projects` | list, for the CRM index (ordered by `position`) |
| `POST` | `/api/projects` | create draft, returns `id` + derived `slug` |
| `GET` | `/api/projects/:id` | one record, for edit mode |
| `PATCH` | `/api/projects/:id` | update fields (autosave target) |
| `DELETE` | `/api/projects/:id` | delete record + its assets and bundle |
| `POST` | `/api/projects/:id/publish` | validate + publish, or `422 { missing: [{key,label}] }` |
| `POST` | `/api/projects/:id/unpublish` | back to draft, record kept |
| `PATCH` | `/api/projects/reorder` | `{ type, ids: [] }` → writes `position` |
| `POST` | `/api/projects/:id/assets` | multipart image/video upload → `{ assetId, width, height }` |
| `DELETE` | `/api/projects/:id/assets/:assetId` | remove |
| `POST` | `/api/projects/:id/bundle` | multipart `.zip` upload → unpack |
| `GET` | `/api/projects/:id/bundle` | `{ status, url, message }` |
| `DELETE` | `/api/projects/:id/bundle` | delete bundle + extracted files |

The `start` / `stop` routes from the earlier port-based design are **gone**. Serving is a
consequence of a successful unpack, not a user action.

### Bundle upload → unpack

```
POST /api/projects/:id/bundle    (multipart, field: file)
```

1. Reject anything that is not `application/zip` / `.zip`, or larger than **200 MB**.
2. Write to `storage/bundles/<bundleId>/upload.zip`, set `status = 'unpacking'`, respond `202`
   immediately with `{ bundleId }` — the CRM polls `GET .../bundle`. Report upload progress to the
   client from the request body stream; the CRM draws a real progress bar off it.
3. Extract to `storage/bundles/<bundleId>/site/` with these guards:
   - **Zip-slip**: resolve every entry path and reject any that escapes the target directory
     (`..`, absolute paths, symlinks). Abort the whole extraction on the first bad entry.
   - **Zip bomb**: cap total uncompressed size at **1 GB** and entry count at **20 000**.
   - Skip `__MACOSX/`, `.DS_Store`, and dotfiles.
4. Find the web root: if the archive has exactly one top-level directory, descend into it. Then
   require an `index.html` at that level; if absent, search one level deeper for a directory
   containing `index.html`. If still absent → `status = 'error'`,
   `message = 'Unpack failed: no index.html at the archive root.'`
5. On success: `status = 'ready'`, `url = https://demo.kinomadstudio.com/<slug>`, store the resolved
   web root. **Every `message` is written to be shown to a human** — it lands verbatim in the CRM
   status row.

### Serving

- Static file server rooted at each bundle's web root, mounted at `/<slug>` on the demo host.
- SPA fallback: if a request has no file extension and no file matches, serve that bundle's
  `index.html`.
- Set `Cache-Control: no-store` so re-uploads show up immediately.
- The demo host is a **separate origin** from the CRM (see §7) — uploaded bundles are untrusted code.
- A slug is served only while its bundle is `ready`; deleting the bundle or the project unmounts it.

---

## 5. Publish validation

Publish is rejected with `422 { missing: [{ key, label }] }`. The CRM renders **the server's list**,
not its own checklist — the sidebar checklist is a live hint, the server is the authority.

Common to all types: `name`, `year` (4 digits), `industry`, `meta`, `statement`, `background`,
`concept`, at least one credit with both `who` and `role`.

**Website**
- `hosting === 'external'` → `liveUrl` present and a valid absolute `http(s)` URL
- `hosting === 'hosted'` → bundle uploaded and `status === 'ready'`
- hero image (doubles as the Works card image — there is no separate card upload)

**Brand identity**
- hero image
- at least one shot

**3D & motion**
- reel is **optional**
- if a reel is present: poster frame required
- if no reel: at least one shot required (the detail page then renders the shots-only layout,
  skips the reel section, and the hero CTA becomes "See the shots" → `#shots`)
- card image

Publishing sets `publishedAt` and makes the project visible on the Works page and at its detail
route. Unpublishing keeps the record but hides it.

---

## 6. Front-end wiring (what changes in the prototype)

The prototype talks to `km-api.js`. Point it at the real service and the UI should not change.
Specifically, these are already built and expect the contract above:

- **Autosave** — `PATCH` fires ~700ms after the last keystroke; the sidebar shows
  *Saving… / Saved <relative time> / Not saved* with an inline Retry. The record is created on the
  first real keystroke, not on opening the form.
- **Slug** — returned by the server on first save, then displayed read-only with the public URL and
  demo host. The server owns uniqueness (append `-2`, `-3` on collision).
- **Uploads** — each asset and the bundle report byte progress; a failure shows the message on the
  row and keeps the row so the file can be re-picked.
- **Bundle status polling** — poll `GET .../bundle` while `status === 'unpacking'`. Row states:
  `Not uploaded` (muted) · `Uploading` (progress bar) · `Unpacking…` (muted, pulsing) ·
  `Live` (accent, linked to the demo URL) · `Error` (red, `message` beneath, Retry unpack).
- **Shots repeater** — six-segment span picker, ratio presets + custom `w/h`, per-row thumbnail and
  progress, drag to reorder. Persist `order` on drop and on add/remove. Ratio is defaulted from the
  uploaded image's dimensions.
- **Credits repeater** — drag to reorder; persist array order.
- **Projects index** — grouped by type, drag-reorder within a group (`PATCH /projects/reorder`,
  applied optimistically and rolled back on failure), inline delete confirmation, per-row
  publish/unpublish, skeleton loading, error + Retry, per-group and global empty states.
- **Bookings** — reads `GET /api/bookings`; per-row `new / confirmed / cancelled` transitions and
  cancel/archive with an inline confirm. There is no bulk delete.

Delete `km-api.js` once the service is live; it exists to make these states demonstrable, not to be
ported.

---

## 7. Security

- The CRM must be **excluded from the public build** and sit behind auth (session cookie or SSO).
  Add `Disallow: /admin` to `robots.txt` and `noindex` on the route.
- Uploaded bundles are untrusted third-party code. Serve them from a **different origin** than the
  CRM and than the public site (`demo.kinomadstudio.com`), never from the CMS origin, so a malicious
  bundle cannot read admin cookies or ride the studio's session.
- Set a restrictive `Content-Security-Policy` and `X-Frame-Options` on the demo host, and serve it
  without any studio cookies scoped to it.
- If hosted archives must not be publicly reachable, put the demo host behind the same auth or a
  per-project random path — not an obscure port.
- Validate `liveUrl` against an `http(s)` allowlist before rendering it as a link (no `javascript:`).
- Sanitise uploaded filenames; never derive a filesystem path from client-supplied text.

---

## 8. Acceptance checks

1. Upload a Vite/Next static export zip → status goes `uploading` → `unpacking` → `ready`,
   `index.html` found in the nested top-level folder, demo URL resolves.
2. Deep link `/<slug>/about` falls back to that bundle's `index.html`.
3. Upload a zip containing `../../etc/passwd` → extraction aborts, `status = 'error'`, nothing
   written outside the bundle directory.
4. Upload a zip with no `index.html` → the CRM status row shows the server's message verbatim.
5. Switch a website project from Hosted to External → the zip uploader is replaced by the live-URL
   field, and publish validation switches to requiring `liveUrl`.
6. Publish an external website without `liveUrl` → `422`, and the CRM lists "Live website URL"
   from the response.
7. Publish a project missing `year` and `industry` → `422` names both; the CRM shows exactly those
   two, not a generic rejection.
8. Save a shot with `span: 5` and `ratio: "16/10"` → accepted, and the detail page renders a
   5-of-6-column 16:10 shot.
9. Save a shot with `ratio: "0/1"` or `"abc"` → rejected with a field error.
10. Publish a 3D project with three shots and no reel → succeeds; the detail page renders
    shots-only, no `<video>` element, CTA reads "See the shots".
11. Drag to reorder three website projects, reload → the new order persists, and the Works page
    lists them in it.
12. Delete a project with a hosted bundle → the record, its assets and the extracted files are gone,
    and the demo slug 404s.
13. Restart the server process → every `ready` bundle is still served; nothing shows `unpacking`
    forever.
