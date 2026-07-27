# Handoff: Kinomad Studio Website

## Overview
Complete marketing site for **Kinomad**, a design studio in Dubai, UAE. The package covers nine pages: Landing, Works (portfolio index), three project-detail templates (Website / Brand identity / 3D & motion), a Privacy notice, a 404 page, and an internal CRM — sign-in and panel — for managing works.

## About the Design Files
The `.dc.html` files in this bundle are **design references created in HTML** — high-fidelity prototypes showing intended look and behavior, not production code to copy directly. The task is to **recreate these designs in your target codebase's environment** (Next.js, Astro, plain React, etc.) using its established patterns. If no environment exists yet, a static-first framework with per-page routing (Next.js or Astro) fits this site best. Open each file in a browser to see the live design; read its markup and logic class for exact values and behavior.

## Fidelity
**High-fidelity.** Colors, typography, spacing, copy, and interactions are final. Recreate pixel-perfectly. The only placeholder content: Pexels stock photos (swap for real project imagery), `localhost` website URLs, reel videos (`assets/reels/*.mp4`, not included), and the social links (`#`).

## Pages

### 1. Landing — `Kinomad Landing.dc.html`
Sections (top to bottom): Hero, Studio, Process, Services, Featured works, Team, FAQ ("Your questions"), Pricing (CTA only — pricing cards were removed), Footer.
- **Hero**: 420vh scroll section. Sticky viewport, three full-bleed images (`assets/hero-1.png`, `hero-2.png`, `hero-3.png`, `object-fit:cover`, no padding, **no scroll scaling** — only a 1.8s zoom-in on load). Below 780px the three `src`s swap to dedicated **portrait crops** (`assets/hero-N-mobile.png`) so the subject survives a narrow viewport — `cover` throughout, never `contain`. The swap runs in `applyHeroArt()` on mount, on device change and on resize; in production do this with `<picture><source media="(max-width:780px)">` so the browser only downloads one set. Nine vertical slats drive **three sequential left→right wipes**: hero-1 → hero-2 → hero-3 → page background. Images 2 and 3 are stacked above image 1 and revealed by a per-slat CSS mask (they ship with a collapsed mask inline so first paint is image 1 with no JS). Stage windows on hero progress `P`: `0.03–0.30`, `0.34–0.61`, `0.66–0.94`; each slat eases `1-(1-q)³` with a `i/8 * 0.55` stagger. The hero title is masked to the same covered region in the final stage, so it appears only where the dark wipe has landed — no fade. Bottom meta row (copyright / tagline / "Scroll ↓") sits at 88% cream with a soft shadow over a bottom-up dark scrim (`34%` height, `rgba(5,5,5,0.82)`→transparent) for contrast against the light images.
- **Studio**: heading (top border removed), copy, stretched "40+" stat block, letter-rolling number animation that resolves in-view.
- **Process**: 4 expanding cards (Listen / Define / Craft / Launch) with stock images; horizontal accordions on desktop, vertical stack on mobile (<780cqw).
- **Services**: five rows — Brand strategy (01), Interface design (02), Immersive & motion (03), Marketing (04), Engineering (05).
- **Services**: full-width rows; hover expands row and inverts to cream background with description + "EXPLORE MORE" + large project count (count left-aligns to title edge on desktop, top-right on tablet).
- **Featured works**: draggable/swipeable carousel; active photo enlarges; much larger images on mobile (80cqw active). Swipe is direct-manipulation: the strip follows the finger at 0.55 resistance with the snap transition suspended, then springs to the next slide past a 40px threshold. Pointer events drive it (with `setPointerCapture`), and a `touchstart/move/end` fallback mirrors the same path for browsers that do not emit pointer events for touch — the fallback self-suppresses when pointer events did fire, so a swipe never advances twice. `touch-action:pan-y` keeps vertical page scroll; drag-follow is skipped under reduced motion.
- **Team**: cards with direct-DOM hover effects (no React re-render — this avoided a scramble-glitch; keep that constraint).
- **FAQ**: open row inverts (cream bg, dark text); answer opens over 1.1s `cubic-bezier(0.22,1,0.36,1)` with delayed fade.
- **Footer** (shared by all pages): sticky reveal, `#050505`, logo with bottom-up accent-fill hover sweep, `Hello@Kinomadstudio.com`, LinkedIn/Behance/Instagram with underline-sweep hover, "Dubai, UAE", giant half-cropped "kinomad" wordmark (visually centered by glyph ink edges, 19px optical margins). Full viewport height on desktop only (`min-height:0` under 1120cqw).

### 2. Works — `Kinomad Works.dc.html`
Header (giant tracked-out "WORKS"), then three portfolio sections + CTA:
- **Websites**: full-width image cards. Hover: image blurs (`blur(16px) brightness(0.45)`), centered name/meta fade out, and a detail overlay rises in: `(01) · Website` label, name, italic Gambetta statement, "Visit live site ↗" button (accent fill sweep; opens the project's `localhost` URL in a new tab), plus Industry/Category/Year meta table right-aligned. Card itself links to the Website Page. Text shadows are minimal (`0 1px 4px rgba(0,0,0,0.12)`).
- **Brand identity**: rows of 4 images (2×2 grid on mobile, 3px gaps — hover fill overlay bleeds -3px on all sides so gaps don't show). Hover sweeps the brand's fill color over images (staggered `clip-path`) and shows the same detail-overlay pattern, tinted in brand fill/contrast colors. Below 1250cqw the statement + meta table hide; below 900cqw content is left/bottom-anchored, and a static meta row shows on touch.
- **3D & motion**: 2:3 portrait cards with the same hover treatment as the website cards — image blurs (`blur(16px) brightness(0.45)`), overlay rises with `(NN) · 3D & motion`, italic statement, Industry/Year rows and a "View case ↗" CTA. Name and meta sit below the card.
- **Touch behavior**: on Tablet/Mobile preview modes every hover-reveal card is **tap-to-reveal** — first tap opens the overlay, second tap follows the link. Same for the landing's services rows; landing team cards toggle open on tap.
- **CTA**: "DREAMING OF **something?**" (accent, same font), subline "A brand, a website, a 3D world — whatever design you have in mind, ask us…", "Ask us anything ↗" button.

### 3–5. Project pages — `Kinomad Website Page.dc.html`, `Kinomad Brand Page.dc.html`, `Kinomad Motion Page.dc.html`
Shared layout: header with `(NN) · Type` label + giant project name, italic statement, Background/Concept two-column copy, meta table (Agency / Industry / Category / Year), hero media, credits, prev/next project navigation. Routing: one file per type, project selected by `?project=<id>` query param (see `_cases()` in each logic class).
- **Website Page**: adds "→ Live at" URL row and a "Visit live site ↗" CTA (accent fill hover). For an externally hosted project this is the client's real URL; for a studio-hosted archive it is `https://demo.kinomadstudio.com/<slug>` (placeholder in the prototype — projects are served from user-provided site files).
- **Motion Page**: reel is **optional**. With a reel: `<video controls>` at `assets/reels/<id>.mp4` + poster, then a "Selected shots" section. Without one: the reel section is skipped entirely, the page opens into the shots (brand-identity-style layout) and the hero CTA becomes "See the shots" → `#shots`.
- **Brand Page** and **Motion Page** share one gallery system: a `repeat(6,1fr)` grid, `3px` gaps, where **each shot carries its own `span` (2/3/4/6) and `aspect-ratio`** — count and sizes are unconstrained per project. Every shot collapses to `span 6` below 780cqw. Data lives in each case's `shots: []` array.

### 6. Privacy — `Kinomad Privacy.dc.html`
Legal notice built on the project-page shell: `LEGAL// PRIVACY` label, giant "PRIVACY" title, italic Gambetta summary line, and a meta table (Controller / Jurisdiction / Last updated). Body is ten numbered rows (`01`–`10`) in a `64px | 1fr` grid — Who we are, What we collect, Why we use it, What we do not do, Cookies and storage, Who else sees it, How long we keep it, Your rights, Security, Changes — collapsing to one column below 780cqw. Closes with a data-request CTA to `Hello@Kinomadstudio.com`. Linked from every footer next to "Dubai, UAE".

**Copy is a solid, honest draft, not legal advice** — have counsel review it against UAE PDPL and GDPR before launch, and fill in the real legal entity name, the actual sub-processor list, and retention periods that match the studio's practice.

### 7. 404 — `Kinomad 404.dc.html`
Giant "4**0**4" (accent zero), line "This dream doesn't exist, or it hasn't been made real yet.", "Back to home ↗" CTA, slat-out entrance animation, ERROR 404// corner label.

### 8. CRM — `Kinomad CRM.dc.html` + `Kinomad CRM Sign In.dc.html` (internal tools, do not link publicly)
**Sign in is its own page** (`Kinomad CRM Sign In.dc.html` → `/admin/login`): email + password, inline error, session written to browser storage. It is the only unauthenticated route under `/admin`. On success it navigates to the CRM; opened with a live session already present it says so and offers *Open the CRM* or *Sign out instead*. Signing out of the CRM returns here.

The CRM itself (`/admin`) renders nothing without a session — it shows a **Session required** gate linking to sign-in. In production that gate is a server-side redirect; the prototype stops short of redirecting so the page stays inspectable in a design tool.

Three views behind it:
- **Projects** — the index. Grouped by type, draft/published pill per row, hero thumbnail, slug/year/industry subline, last-updated stamp. Per-row **Edit · Publish/Unpublish · Delete** (delete asks first, inline, never a browser `confirm`), **drag to reorder** within a type group, and an empty state per group. Loading skeletons and an error state with Retry.
- **Work** — the record editor. Titled *New project* for a draft and *Editing* for an existing one; the same form serves both. Type is locked after first save (it decides slug, destination page and required fields). Autosaves ~700ms after the last keystroke; the sidebar shows *Saving… / Saved <time> / Not saved* with a Retry row on failure.
- **Booking availability** and **Bookings** — see *Booking* under Interactions.

Section map: `01` project meta (name, year, slug, industry, category, statement, background, concept) · `02` type-specific media · `02B` shots · `03` credits.

**01 Meta.** The slug is derived from the name on first save and then **frozen and shown read-only**, with the resulting public URL (`kinomadstudio.com/works/<slug>`) and, for hosted sites, the demo host beneath it. It is public and permanent — renaming needs a deliberate migration plus a redirect. Year, industry and category are in the completeness checklist because the server requires them.

**02 Website.** An **External / Hosted by us** toggle: external shows the live-URL field, hosted shows the zip uploader — never both. No port field. A status row reads **Not uploaded · Uploading · Unpacking… · Live** (linked to the demo host) **· Error** with the server's message and a Retry. The zip upload has a real progress bar.

**02B Shots** (Brand + 3D). Width is a **six-segment click-to-set picker** that mirrors the `repeat(6,1fr)` grid — any span 1–6, not four named sizes. Ratio offers ten presets (21/9, 2/1, 16/9, 16/10, 3/2, 4/3, 1/1, 4/5, 3/4, 9/16) plus a **custom `w/h`** field, and is **defaulted from the uploaded image's dimensions**. Each row carries its own thumbnail and upload progress, and drags to reorder. A live **grid preview** with a desktop/mobile toggle shows the real layout (everything collapses to span 6 below 780px). Credits drag to reorder too — array order is page order.

**Publish** goes through the server. A `422 {missing}` response renders the server's list, not the local checklist — the checklist is a hint, the server is the authority.

**States.** Autosave, per-upload progress, request failure with retry, empty states, inline delete confirmations and server-driven publish results all exist in the prototype. A header switch (*API healthy / API failing*) forces the next request to fail so every error path is inspectable.

**The CRM needs a backend.** Every request in the prototype goes through `km-api.js`, which mirrors the routes in `BACKEND-GUIDE.md` — swapping it for the real service should not change the UI. Start with **`BACKEND-GUIDE.md`** — stack, schema, the CRM-state→API→column field map, the full add-a-website request sequence, asset pipeline, publish, bookings, security, build order. The zip-upload / demo-host subsystem is specified separately — data model, API, unpack guards, publish validation, security, acceptance checks — in **`CRM-HOSTED-BUNDLES.md`**.

## Deployment & URL structure
The prototype filenames (`Kinomad Landing.dc.html`) are **artifacts of the design tool, not the intended URLs**. In production the site is served from the apex domain and the home page must resolve at the root:

| Prototype file | Production route |
|---|---|
| `Kinomad Landing.dc.html` | `https://kinomadstudio.com/` |
| `Kinomad Works.dc.html` | `/works` |
| `Kinomad Website Page.dc.html` | `/works/[slug]` (website projects) |
| `Kinomad Brand Page.dc.html` | `/works/[slug]` (brand-identity projects) |
| `Kinomad Motion Page.dc.html` | `/works/[slug]` (motion / 3D projects) |
| `Kinomad Privacy.dc.html` | `/privacy` |
| `Kinomad 404.dc.html` | 404 handler (not a routable path) |
| `Kinomad CRM.dc.html` | `/admin` — auth-gated, excluded from the public build and from `sitemap.xml`/`robots.txt` |
| `Kinomad CRM Sign In.dc.html` | `/admin/login` — the only unauthenticated admin route; `noindex` |

The three project-detail templates are **one route**, not three: `/works/[slug]` picks its layout from the project's type. The prototype fakes this with `?project=` — replace it with a real slug segment.

Requirements:
- Home is `/`, never `/index.html` or `/Kinomad Landing.dc.html` — no filename or extension in any public URL.
- Serve on `https://kinomadstudio.com`; 301 `www.kinomadstudio.com` and all `http://` to the apex `https://`.
- Rewrite every internal `href` from the prototype filenames to the routes above. Grep for `.dc.html` — none may survive into production markup.
- One canonical URL per page (`<link rel="canonical">`), no trailing-slash duplicates.
- Existing prototype links stay relative and work when the bundle is opened from disk; that behaviour is only for review.

## Favicon & app icons
Shipped in `assets/`, generated from the K mark (cream `#F1EFE7` glyph on `#0D0D0D`, 22% corner radius). Already wired into every page's `<head>`:

```html
<title>…</title>
<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/favicon-180.png">
<meta name="theme-color" content="#0D0D0D">
```

Also add in production: `favicon.ico` (16/32/48 multi-res) at the web root for legacy crawlers, and a `site.webmanifest` referencing `favicon-512.png` for Android install icons. Per-page `<title>`s are set in the prototypes — carry them over verbatim.

## Interactions & Behavior (site-wide)
- **Custom cursor**: 7px accent square, eased trailing follow, morphs round over interactive elements. Hidden on touch / coarse pointers and tablet/mobile.
- **Custom scrollbar**: native hidden; fixed 10px cream rectangle thumb, fills with accent proportional to scroll velocity from the leading edge, smoothstep-eased, drains on direction change.
- **Smooth wheel scroll**: wheel events intercepted, scroll position eased at ~0.085 lerp per frame.
- **Link hover**: underline sweeps in left→right (`background-size` 0→100%, 0.9s `cubic-bezier(0.22,1,0.36,1)`), exits off the right edge on leave; 2px thick. Real CSS `:hover` (class `.km-flink`).
- **CTA buttons** (`.km-cta`): cream background, accent fills left→right on hover (0.8s, same bezier), text stays dark ink `#14130F`.
- **Nav bar**: fixed, centered, translucent — `color-mix(… 62%, transparent)` + `backdrop-filter:blur(18px)`; no social icons; borderless theme toggle (accent tint on hover).
- **Theme**: dark (default) / light, toggled in nav, persisted in `localStorage`.
- **Booking**: custom on-brand modal scheduler (date picker → time slots → name/email/note → confirmation). It fetches **two** things: the availability config (working days, hours, slot interval, buffer, minimum notice, blocked date *ranges*, IANA timezone) and a **busy-slots feed for the chosen day** — without the second, the grid offers times that are already booked. Taken slots render struck-through and disabled; the slot column has its own loading and error/retry state. Each time shows the **visitor's local clock** beside Dubai time when the two differ (studio works worldwide). A **409** on submit — the slot was taken while the visitor was typing — returns to step 1, refreshes the grid, keeps their details and explains what happened. Focus trap, `Esc` to close, focus restore and `aria-live` on the confirmation are all in place. Confirmed bookings land in the CRM Bookings inbox, where each has **new / confirmed / cancelled** transitions and per-row cancel or archive with a confirm — there is no bulk "clear all".

  **CRM availability tab**: timezone is an IANA picker (`Asia/Dubai`) whose display label is derived, never typed; buffer has a real control; blocked dates are date-picker **ranges** (holidays are ranges); the slots-per-day preview is computed **per meeting type** (length + buffer must fit before the day ends); Save hits the API.
- **Global colour tweaks**: accent / background / nav colour are written to shared browser storage by whichever page's tweak panel changes them, and every page (including the CRM and 404) reads them on load. In production this is a single theme source, not per-page storage.
- **Reduced motion**: handled in CSS *and* JS. CSS kills animations and collapses transition durations, and sets `scroll-behavior:auto`. In JS, `_reduced()` gates `_initCursor()`: under reduced motion there is no custom cursor, no wheel hijack and no per-frame RAF loop — a plain passive scroll listener drives the scrollbar and hero instead, and the hero's final slat stage becomes a hard cut at 50% progress rather than a staggered wipe. Mirror this structure in production: one `prefersReducedMotion` check that disables cursor, smooth scroll and staggered reveals together.
- **Keyboard & assistive tech**: every page has a `.km-skip` skip-to-content link (visible on focus, first tab stop) targeting `#km-main`, a global `:focus-visible` ring (2px accent, 3px offset), `aria-expanded` + `aria-controls` on the nav menu button, and `aria-expanded` on the FAQ rows. The booking modal has a focus trap, `Esc` to close, focus restore on close and `aria-live` on the confirmation step. Still to do in production: keyboard operation of the works carousel (arrow keys + visible focus on the active slide).

### Services rows on tablet/mobile
Each service row is an `<a>` to its Works anchor. Below 1120cqw the **first tap opens the row and is prevented from navigating**; a second tap on the already-open row follows the link. Tapping a different row moves the open state without navigating. The hover handlers are gated off below 1120cqw — without that gate a touch `mouseenter` fires before `click`, the row is already "open" by the time the tap handler runs, and the tap navigates instead of expanding. The same gate applies to the process and team hover handlers.

### Process & Team rows on tablet/mobile
Below `1120cqw` both rows stop being static flex layouts and become **native horizontal scroll-snap carousels** (`overflow-x:auto`, `scroll-snap-type:x mandatory`, `scroll-snap-align:center`, scrollbar hidden). They bleed past the page gutter via a negative inline margin, and carry a symmetric `padding-inline: calc(50cqw - cardWidth/2)` so the **first and last card can each reach the centre** — without that padding the end cards can never satisfy a centre snap and the active state sticks one card short.

Card widths: process `min(46cqw,340px)` tablet / `min(80cqw,320px)` mobile; team `min(44cqw,320px)` / `min(82cqw,300px)`.

The reveal that hover drives on desktop is instead driven by **whichever card is nearest the row's centre**, recomputed from a rAF-throttled `scroll` listener, so it tracks the swipe continuously rather than waiting for a tap. Tapping a partially visible card smooth-scrolls it to centre. Above 1120cqw the rows revert to hover and the team cards are reset closed.

## State Management
Each page is a single component with local state: theme, device-preview mode, hover ids, carousel index, FAQ open index, booking modal. Project-detail pages parse `?project=` for routing. The CRM is the exception: it holds no content of its own and reads everything through `km-api.js`. All public-page content is inline in `_cases()` / data arrays in each file's logic class — in production, lift this into a CMS or JSON content layer shared across pages (the same project data feeds Works cards AND detail pages; keep it single-source).

## Design Tokens
Colors (dark theme):
- `--bg: #1f2121` (landing) / `#1a1a1a` (inner pages) — unify in production
- `--fg: #F1EFE7` (cream) · `--mut: rgba(241,239,231,0.55)` · `--line: rgba(241,239,231,0.14)`
- `--card: #141922` · footer/nav black: `#050505` · ink (text on accent): `#14130F`
- `--accent: #2bcdee` (current tweak value; `#D9FF3D` lime is the alternate) · `--accent-ink: color-mix(in oklab, var(--accent), #14130F 55%)` in light theme

Light theme: `--bg:#EDF0F4 · --fg:#14130F · --mut:rgba(20,19,15,0.55) · --line:rgba(20,19,15,0.16) · --card:#DFE4EB`

Typography (Fontshare):
- **General Sans** 400–700 — body & headings. Display headings: 700, uppercase, letter-spacing -0.025…-0.045em, line-height 0.78–0.95
- **Chillax** 200–700 — monospace-flavored labels (`SECTION//` corner style, 0.14–0.16em tracking, 12–13px)
- **Gambetta** (serif italic) — project statements only, on Works/detail pages
- Body 14–15px/1.5; meta labels 12px uppercase 0.1–0.14em; section titles `clamp(36px,4.6cqw,76px)`

Other: no border radius anywhere (sharp corners; cursor dot morphs round on hover as the one exception); 3px gaps in image grids; page gutter `clamp(20px,4cqw,64px)`; breakpoints at 1250 / 1120 / 900 / 780 container-px.

## SEO Basics (to implement in production)
The prototypes are JS-rendered single files — implement these in the real build:
1. Per-page `<title>` is already set in each prototype — carry it over and add a meta description alongside it.
2. Real routes instead of query params: `/works`, `/works/aurelia`, etc.; project pages statically generated.
3. Open Graph + Twitter card tags per page (use project hero images).
4. Semantic markup: one `<h1>` per page, `<nav>`, `<main>`, `<footer>`, alt text on all project images.
5. `sitemap.xml`, `robots.txt` (disallow the CRM), canonical URLs.
6. JSON-LD: `Organization` (site-wide) + `CreativeWork` per project.
7. Serve fonts with `font-display: swap` (Fontshare default) and preload the two main families.
8. The hero/scroll effects must not block content paint — render text server-side, layer animations on top.
9. Exclude the CRM page from the public build entirely (auth-gated admin route).

## Assets
- `assets/logo-light.svg`, `assets/logo-light.png`, `assets/logo-dark.png` — Kinomad K mark
- `assets/favicon.svg`, `assets/favicon-32.png`, `assets/favicon-180.png`, `assets/favicon-512.png` — browser tab, Apple touch and Android install icons
- `assets/hero-1.png`, `assets/hero-2.png`, `assets/hero-3.png` — the three hero images (16:9), in wipe order
- `assets/hero-1-mobile.png`, `assets/hero-2-mobile.png`, `assets/hero-3-mobile.png` — portrait crops of the same three, used below 780px
- All project/process photos are **Pexels stock placeholders** (hotlinked URLs in the data arrays) — replace with owned imagery before launch
- Reel videos expected at `assets/reels/<project-id>.mp4` — not included
- `image-slot.js` — prototype-only drag-and-drop image placeholder; in production these are plain `<img>`/CMS images
- `support.js` — prototype runtime; not part of the handoff implementation
- `km-api.js` — prototype stand-in API; replace with the real service, do not port

## Files
- `BACKEND-GUIDE.md` — the service to build behind the CRM (read first)
- `CRM-HOSTED-BUNDLES.md` — zip upload, unpack guards, demo-host serving
- `Kinomad Landing.dc.html` — landing page
- `Kinomad Works.dc.html` — portfolio index
- `Kinomad Website Page.dc.html` / `Kinomad Brand Page.dc.html` / `Kinomad Motion Page.dc.html` — project detail templates
- `Kinomad Privacy.dc.html` — privacy notice (draft copy, needs legal review)
- `Kinomad 404.dc.html` — error page
- `Kinomad CRM.dc.html` — internal admin panel: projects index, record editor, scheduler, bookings (needs backend)
- `Kinomad CRM Sign In.dc.html` — the admin sign-in page
- `km-api.js` — the prototype's stand-in API: same routes and shapes as `BACKEND-GUIDE.md`, backed by browser storage, with simulated latency and real `401/404/409/422/503` responses so the loading, error and retry states are genuine. **Delete it when the real API lands** — it exists to make the states demonstrable, not to be ported.
- `assets/` — logos + hero imagery

## Known gaps & recommended improvements
Ordered roughly by value. Nothing here blocks a faithful rebuild — these are the things the prototype cannot answer.

**Content and data**
1. All project/process photography is Pexels stock. Replace with owned imagery before launch.
2. Reel videos (`assets/reels/*.mp4`) were never supplied — the Motion page expects them.
3. Project data is duplicated in the logic class of every page. Lift to one content source (CMS or JSON) that feeds Works cards *and* detail pages; the CRM writes to it.
4. Social links are `#`. Real LinkedIn / Behance / Instagram URLs needed.
5. Pricing was cut down to a CTA. Decide whether real pricing tiers return.

**Engineering — resolved in this bundle**
- All public pages share `--bg:#1f2121`; only the CRM uses `#1a1a1a`, deliberately, as an admin surface.
- Reduced motion now covers the JS effects (see *Interactions*), which also removes the wheel hijack for those users.
- Skip link, `:focus-visible` ring, nav `aria-expanded`/`aria-controls`, FAQ `aria-expanded`, `<main id="km-main">` landmark on every page.
- Light-theme `--mut` raised from `rgba(20,19,15,0.55)` to `0.7` — the old value failed AA for small body text on `#EDF0F4` (~3.5:1, now ~5.6:1).
- Tablet (834px) and mobile (390px) checked across Landing, Works and the detail pages: brand grids go 4-up → 2×2, 3D cards stack, section headings wrap without collision, footers collapse.
- Privacy page added and linked from every footer.
- Favicon set + per-page `<title>` added to all eight pages; production URL map documented under **Deployment & URL structure** (home = `kinomadstudio.com`, no `.dc.html` in any public URL).
- Mobile hero art: portrait crops replace the cover-cropped 16:9 originals below 780px, and the slats overscale to `1.04` so sub-pixel seams no longer leak hairlines of the image at full cover.
- Works carousel swipe reworked to follow the finger, with a touch-event fallback — the earlier "swipe does nothing" behaviour on tablet/mobile is fixed.
- Booking modal accessibility closed out: focus trap, `Esc`, focus restore on close, `aria-live` on the confirmation step.
- Loading, empty, error/retry, progress, autosave and confirmation states now exist across the CRM and the booking modal, driven by a stand-in API (`km-api.js`) that returns real status codes.
- CRM completed: sign-in as its own page, projects index (grouped, reorderable, edit/unpublish/delete), and an edit mode reusing the record editor. Shots accept **any span 1–6 and any aspect ratio**, defaulted from the uploaded image.

**Engineering — still open**
6. Smooth wheel scroll still hijacks the wheel for users *without* a reduced-motion preference. Test against trackpad momentum and long-page keyboard paging; consider a user-facing toggle.
7. The works carousel is pointer/touch only — add arrow-key navigation and a visible focus state.
8. Query-param routing (`?project=`) must become real routes; see the SEO section.
9. Image delivery is unoptimised full-size PNG/JPEG. Add responsive `srcset`, modern formats and lazy loading below the fold; the hero images are the largest payload on the site. The mobile/desktop hero swap is currently a JS `src` change — move it to `<picture>` so only one set is fetched.
10. Colour contrast should be re-run with a real checker once brand imagery replaces the stock photos — the hero meta row in particular sits on a scrim tuned to the current three images.

**Design**
11. Light theme is now audited section by section on the Landing page; give Works and the detail pages the same pass once real imagery lands.
12. Device testing was done at 834px and 390px in the preview, not on physical hardware. Verify the hero wipe performance and the carousel's pointer capture on a real phone.
13. No cookie-consent banner. Not needed while the site sets no tracking cookies — revisit the moment analytics is added.
