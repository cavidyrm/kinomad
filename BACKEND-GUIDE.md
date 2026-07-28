# Backend Guide: the service behind the Kinomad CRM

The CRM prototype (`Kinomad CRM.dc.html`) is a complete front-end reference with **no server**. It
holds everything in component state and browser storage. This guide specifies the service that has
to exist for it to be real, with the **"add a website project"** flow as the spine — that flow
touches every subsystem (records, images, file bundles, a local run, publish, and the public site),
so once it works the brand and 3D flows are subsets of it.

Companion documents:
- `CRM-LOCAL-RUN.md` — deep dive on the zip upload, unpack guards and localhost preview server.
- `README.md` — the front-end handoff, page by page, plus production URL routing.

---

## 1. What the service has to do

1. Hold a **draft** project the moment the studio starts typing, so nothing is lost on refresh.
2. Accept **image and video uploads** and give back stable ids the record can reference.
3. Accept a **`.zip` of the client's built site**, unpack it safely, and serve it on a local port
   for internal QA and archiving.
4. **Validate and publish** — a published project appears on the Works page and gets a detail page.
5. Serve the **public site's** project data.
6. Receive **bookings** from the landing-page scheduler and expose them in the CRM inbox.

Everything is one service. There is no reason to split the CRM API from the public read API at this
size; keep one codebase with two route groups (`/api/admin/*` authenticated, `/api/public/*` open).

---

## 2. Stack

Nothing here is exotic. Choose boring, and prefer whatever the implementing team already runs.

| Concern | Recommendation | Why |
| --- | --- | --- |
| Runtime | Node 20+ (TypeScript) | Same language as the front end; the zip/static-serve work is trivial in Node |
| Framework | Fastify (or Express) | Multipart, static serving, and route scoping all first-class |
| Database | PostgreSQL | Needs relations (projects → credits, shots, assets) and JSON columns; SQLite is fine for a single-studio self-hosted install |
| Migrations/ORM | Drizzle or Prisma | Typed schema shared with the API layer |
| File storage | Local disk behind a `StorageAdapter` interface | The studio runs this on one box; the interface keeps S3/R2 a one-file change later |
| Image processing | `sharp` | Derivatives + AVIF/WebP |
| Zip | `yauzl` (streaming, entry-by-entry) | Lets you enforce zip-slip and zip-bomb guards **during** extraction, not after |
| Auth | Session cookie + Argon2 | Two to five studio users; OAuth is overkill |
| Validation | Zod | One schema per payload, shared with publish validation |

**Do not** put the uploaded client bundles behind the same origin as the CRM. See §9.

---

## 3. Service layout

```
server/
  src/
    routes/
      admin/projects.ts      # CRUD + publish
      admin/assets.ts        # image/video upload
      admin/bundle.ts        # zip upload, unpack, start/stop   → CRM-LOCAL-RUN.md
      admin/bookings.ts      # inbox
      admin/availability.ts  # scheduler config
      public/projects.ts     # what the website reads
      public/bookings.ts     # what the scheduler writes
    services/
      publish.ts             # validation + publish transition
      assets.ts              # upload, derivatives, delete
      bundles.ts             # extract, serve, port registry
      slug.ts
    db/schema.ts
    db/migrations/
    auth/
    storage/                 # StorageAdapter: local | s3
  storage/                   # runtime data, gitignored
```

---

## 4. Data model

The CRM's state keys are the contract. Match these names and the front-end wiring is a rename-free
swap.

```sql
create type project_type as enum ('website', 'brand', 'three');
create type bundle_status as enum ('none', 'unpacking', 'ready', 'error');

create table projects (
  id            text primary key,               -- slug: "aurelia"
  type          project_type not null,
  position      integer not null,               -- display order within its section; "num" in the UI
  name          text not null default '',
  year          text not null default '',
  industry      text not null default '',
  meta          text not null default '',       -- "E-commerce · Design + Dev"
  statement     text not null default '',       -- italic serif line on the card + detail hero
  background    text not null default '',
  concept       text not null default '',
  fill          text not null default '#5B79A6',-- brand-card background, hex
  live_url      text,                           -- website only, absolute http(s)
  local_port    integer default 3001,           -- website only, 3001–3010
  bundle_id     text,                           -- website only
  bundle_status bundle_status not null default 'none',
  bundle_error  text,
  hero_asset_id text,                           -- also used as the Works card image
  reel_asset_id text,                           -- three only, optional
  poster_asset_id text,                         -- three only, required iff reel present
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table credits (
  id         bigserial primary key,
  project_id text not null references projects(id) on delete cascade,
  who        text not null,
  role       text not null,
  position   integer not null
);

create table shots (
  id         text primary key,
  project_id text not null references projects(id) on delete cascade,
  asset_id   text not null references assets(id),
  size       text not null,   -- 'Third' | 'Half' | 'Two thirds' | 'Full'
  ratio      text not null,   -- '21/9' | '16/9' | '3/2' | '4/3' | '1/1' | '4/5'
  position   integer not null
);

create table assets (
  id           text primary key,
  project_id   text references projects(id) on delete cascade,
  kind         text not null,     -- 'image' | 'video'
  mime         text not null,
  bytes        bigint not null,
  width        integer,
  height       integer,
  original_name text,
  created_at   timestamptz not null default now()
);

create table bookings (
  id          text primary key,
  type_name   text not null,      -- "Intro call"
  minutes     integer not null,
  starts_at   timestamptz not null,
  name        text not null,
  email       text not null,
  note        text,
  status      text not null default 'new',   -- 'new' | 'confirmed' | 'cancelled'
  created_at  timestamptz not null default now()
);

create table availability (      -- single row
  id        integer primary key default 1,
  config    jsonb not null
);
```

`shots.size` maps to a grid span on a `repeat(6, 1fr)` grid with `3px` gaps:
`Third → 2`, `Half → 3`, `Two thirds → 4`, `Full → 6`. Below 780px every shot is `span 6`. The
detail pages already implement this — the API just stores the label.

### Field map — CRM state → API → column

| CRM state | API field | Column |
| --- | --- | --- |
| `type` | `type` | `type` |
| `fields.name` | `name` | `name` |
| `fields.year` | `year` | `year` |
| `fields.industry` | `industry` | `industry` |
| `fields.meta` | `meta` | `meta` |
| `fields.statement` | `statement` | `statement` |
| `fields.background` | `background` | `background` |
| `fields.concept` | `concept` | `concept` |
| `fields.fill` | `fill` | `fill` |
| `fields.liveUrl` | `liveUrl` | `live_url` |
| `fields.port` | `localPort` | `local_port` |
| `files.heroImg` | `heroAssetId` | `hero_asset_id` |
| `files.siteFiles` | — (bundle upload) | `bundle_id` |
| `files.reel` | `reelAssetId` | `reel_asset_id` |
| `files.poster` | `posterAssetId` | `poster_asset_id` |
| `credits[]` | `credits[]` | `credits` table |
| `shots[]` | `shots[]` | `shots` table |
| `running` | derived from `GET /bundle` | — (runtime only) |

There is **no separate card image**. The hero asset is used for both the Works card and the top of
the detail page — the CRM labels it "Hero image · card & page top".

---

## 5. The add-a-website flow, end to end

```
CRM                                   Service
───                                   ───────
type = Website, first keystroke  ──▶  POST /api/admin/projects {type:'website'}
                                 ◀──  201 {id:'draft-8f2a', ...}
each field blur / debounce 600ms ──▶  PATCH /api/admin/projects/:id {name:'Aurelia'}
                                 ◀──  200 {project}
hero image chosen                ──▶  POST /api/admin/projects/:id/assets  (multipart)
                                 ◀──  201 {assetId, width, height, variants}
                                 ──▶  PATCH .../:id {heroAssetId}
site .zip chosen                 ──▶  POST /api/admin/projects/:id/bundle  (multipart)
                                 ◀──  202 {bundleId, status:'unpacking'}
poll every 1s                    ──▶  GET  /api/admin/projects/:id/bundle
                                 ◀──  200 {status:'ready'}
"Start local server"             ──▶  POST .../bundle/start {port:3001}
                                 ◀──  200 {url:'http://localhost:3001'}
"Publish to works"               ──▶  POST /api/admin/projects/:id/publish
                                 ◀──  200 {project} | 422 {missing:[...]}
```

Two rules that matter:

- **The draft exists before the first upload.** Assets and bundles are keyed by project id, so the
  record has to come first. Create it on entering the form, not on save. Sweep drafts with no
  `name` and no assets after 7 days.
- **`PATCH` is a partial merge**, never a whole-object replace. The CRM autosaves individual fields;
  a replace would race with an in-flight upload and blank out `heroAssetId`.

---

## 6. API

All `/api/admin/*` routes require a valid session (§9). All responses are JSON. Errors are
`{ error: { code, message, fields? } }`.

### Projects

| Method | Route | Body → Response |
| --- | --- | --- |
| `GET` | `/api/admin/projects` | → `{ projects: ProjectSummary[] }`, newest draft first |
| `POST` | `/api/admin/projects` | `{ type }` → `201 { project }` |
| `GET` | `/api/admin/projects/:id` | → `{ project }` with credits, shots, assets expanded |
| `PATCH` | `/api/admin/projects/:id` | partial `Project` → `{ project }` |
| `DELETE` | `/api/admin/projects/:id` | → `204`; cascades assets + bundle |
| `POST` | `/api/admin/projects/:id/publish` | → `{ project }` or `422 { missing }` |
| `POST` | `/api/admin/projects/:id/unpublish` | → `{ project }` |
| `POST` | `/api/admin/projects/reorder` | `{ ids: string[] }` per type → `204` |

`PATCH` example:

```http
PATCH /api/admin/projects/aurelia
Content-Type: application/json

{ "name": "Aurelia", "liveUrl": "https://aurelia.com", "credits": [
  { "who": "Ahmad N.", "role": "Design lead" },
  { "who": "Studio",   "role": "Development" }
] }
```

Sending `credits` or `shots` **replaces the whole array** (they are ordered lists, and the CRM
already owns the full array in state). Omitting the key leaves it untouched. Positions are taken
from array order — do not trust a client-sent `position`.

### Slugs

`id` is a slug derived from `name` on first save (`"Aurelia Studio" → "aurelia-studio"`), then
**frozen** — it is in the public URL. If two projects slugify the same, suffix `-2`. Expose a
`PATCH /api/admin/projects/:id/slug` for a deliberate rename, and 301 the old slug from a
`slug_redirects` table.

### Assets

```http
POST /api/admin/projects/:id/assets
Content-Type: multipart/form-data;  field: file
```

- Accept `image/jpeg|png|webp|avif` up to 25 MB, `video/mp4|webm` up to 500 MB.
- **Sniff the magic bytes**; do not trust the `Content-Type` header or the extension.
- Strip EXIF (it carries GPS from client photo shoots).
- Store the original, then generate `640 / 1280 / 1920 / 2560` wide AVIF + WebP derivatives for
  images. Return them so the front end can build `srcset` — the prototype ships unoptimised
  full-size images and this is where that gets fixed.
- Respond `201 { assetId, kind, width, height, variants: [{ w, format, url }] }`.
- `DELETE /api/admin/projects/:id/assets/:assetId` → `409` if it is still referenced by
  `hero_asset_id`, a shot, or a poster. Make the caller detach first; silent nulling loses work.

Serve assets from `/assets/:assetId/:width.:format` with a one-year immutable cache header. Asset
ids are content-addressed or random, never sequential.

### Bundle (website only)

`POST|GET|DELETE /api/admin/projects/:id/bundle`, `POST .../bundle/start`, `POST .../bundle/stop`.
Full behaviour — extraction guards, web-root detection, SPA fallback, port registry, loopback
binding — is in **`CRM-LOCAL-RUN.md` §4**. Do not implement it from this summary.

### Public

| Method | Route | Notes |
| --- | --- | --- |
| `GET` | `/api/public/projects` | published only, grouped by type, ordered by `position` |
| `GET` | `/api/public/projects/:slug` | 404 for unpublished; check `slug_redirects` before 404ing |
| `GET` | `/api/public/availability` | what the scheduler renders |
| `POST` | `/api/public/bookings` | see §7 |

Public reads never expose `local_port`, `bundle_*`, or draft records.

---

## 7. Bookings

The landing-page scheduler currently reads availability from browser storage and writes bookings
back to it. In production both sides talk to this service.

`GET /api/public/availability` returns the config the CRM's Availability tab edits:

```json
{
  "types": [{ "name": "Intro call", "min": 30 }, { "name": "Project deep-dive", "min": 60 }],
  "tz": "Asia/Dubai",
  "days": [true, true, true, true, true, false, false],
  "start": "10:00",
  "end": "18:00",
  "interval": 30,
  "notice": 12,
  "blocked": ["2026-08-11"]
}
```

`days` is Monday-first. `notice` is minimum hours ahead. Store `tz` as an **IANA zone**, not the
display string `"GST (UTC+4), Dubai"` — the prototype shows the label, the server needs the zone,
and Dubai has no DST today but the code should not assume that.

`POST /api/public/bookings` takes `{ typeName, startsAt, name, email, note }` and must, server-side:

1. Recompute the slot grid from `availability` — **never trust the client's slot**.
2. Reject a slot outside working days/hours, inside `blocked`, or under the notice window.
3. Reject a slot that overlaps an existing non-cancelled booking (unique index on `starts_at`,
   catch the conflict, return `409`).
4. Rate-limit by IP and by email — 5/hour. This endpoint is unauthenticated.
5. Send the confirmation email and a studio notification; queue it, and do not fail the booking if
   the mail provider is down.

`startsAt` is an absolute UTC instant. Do the timezone maths on the server.

---

## 8. Publish

`POST /api/admin/projects/:id/publish` runs the same checklist the CRM renders, server-side, and
returns `422 { missing: [{ key, label }] }` on failure — the CRM already knows how to display that
array.

Required for every type: `name`, `year`, `industry`, `meta`, `statement`, `background`, `concept`,
and at least one credit with both `who` and `role`.

| Type | Additional |
| --- | --- |
| Website | valid absolute `http(s)` `liveUrl`; bundle uploaded with `bundleStatus === 'ready'`; hero image |
| Brand identity | hero image; at least one shot |
| 3D & motion | reel **optional** — with a reel, a poster frame is required; without one, at least one shot (the detail page then renders the shots-only layout) |

On success set `published_at` and **revalidate the public site**: the Works index, the project's
detail route, and the landing page (it shows featured work). If the public site is statically
generated, call its revalidation hook here; if it reads the API live, just bust the CDN cache.
Unpublish keeps the record and clears `published_at`.

---

## 9. Security

The uploaded bundles are the sharp edge — they are untrusted third-party code the studio is choosing
to execute in a browser.

- **Never serve a bundle from the CRM's origin.** They are on `localhost:300x` precisely so a
  malicious bundle cannot read the admin session cookie. Do not "simplify" this into a
  `/preview/:id` path on the main app.
- Bind bundle servers to `127.0.0.1` only. Never `0.0.0.0`.
- Enforce the zip-slip and zip-bomb guards during extraction (`CRM-LOCAL-RUN.md` §4). Test them —
  acceptance check 4 exists for a reason.
- Validate `liveUrl` against an `http(s)` allowlist before ever rendering it as an `href`. A stored
  `javascript:` URL is a stored XSS on the public case study.
- Session cookies: `HttpOnly`, `Secure`, `SameSite=Lax`, rotating on login, 30-day idle expiry.
- The CRM route is `noindex`, `Disallow: /admin` in `robots.txt`, and excluded from the public
  build entirely.
- CSRF token on all admin mutations, or `SameSite=Strict` plus an `Origin` check.
- Rate-limit login (10/hour/IP) and the public booking endpoint.
- Log every publish, unpublish, and delete with the acting user — a two-person studio still wants to
  know who unpublished a client's case study.

---

## 10. Configuration

```
DATABASE_URL=postgres://…
SESSION_SECRET=
STORAGE_DRIVER=local            # local | s3
STORAGE_PATH=./storage
PUBLIC_SITE_URL=https://kinomadstudio.com
ADMIN_ORIGIN=https://admin.kinomadstudio.com
BUNDLE_PORT_MIN=3001
BUNDLE_PORT_MAX=3010
BUNDLE_MAX_ZIP_BYTES=209715200      # 200 MB
BUNDLE_MAX_UNPACKED_BYTES=1073741824
SMTP_URL=
REVALIDATE_TOKEN=
```

---

## 11. Build order

Ship in this order; each step is independently demoable.

1. **Schema + projects CRUD + auth.** Wire the CRM's text fields to real autosave. No files yet.
2. **Assets.** Hero upload, derivatives, `srcset` on the public pages. Brand and 3D shots come free.
3. **Publish + public read API.** Works page and detail pages driven by real data.
4. **Bundle upload and unpack** with the guards, status polling, error surface.
5. **Local run.** Port registry, start/stop, loopback static server.
6. **Bookings.** Availability config, public POST with server-side slot validation, CRM inbox.
7. **Hardening.** Rate limits, audit log, backups, the acceptance checks below.

Steps 1–3 make the site real. Steps 4–5 are the studio's internal archive tool and can lag a launch
if needed — publish validation just has to stop requiring a bundle until they land.

---

## 12. Acceptance checks

Beyond the eight in `CRM-LOCAL-RUN.md` §8:

1. Start a new website project, type a name, hard-refresh → the draft and its name survive.
2. Upload a 20 MP hero JPEG → derivatives at 640/1280/1920/2560 in AVIF and WebP; the public card
   requests the 1280 AVIF on a laptop, not the original.
3. Upload a hero with GPS EXIF → the served file has no EXIF.
4. Rename `credits` order in the CRM, save, reload → order preserved.
5. Publish, then change `name` → the slug and public URL do **not** change.
6. Deliberately rename the slug → old URL 301s to the new one.
7. Publish a website with `liveUrl` = `javascript:alert(1)` → rejected at validation.
8. Delete an asset still used as a hero → `409`, nothing deleted.
9. Two bookings posted for the same slot concurrently → exactly one succeeds, the other gets `409`.
10. Post a booking for 03:00 local → rejected as outside working hours, regardless of the client's
    own timezone.
11. Publish a project → Works index, its detail page, and the landing page all show it without a
    manual cache purge.
