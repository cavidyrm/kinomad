# Handoff: Kinomad Studio Website

## Overview
Complete marketing site for **Kinomad**, a design studio in Dubai, UAE. The package covers eight pages: Landing, Works (portfolio index), three project-detail templates (Website / Brand identity / 3D & motion), a Privacy notice, a 404 page, and an internal CRM panel for adding new works.

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
- **Website Page**: adds "→ Live at" URL row and a "Visit live site ↗" CTA (accent fill hover). Sites run locally at `http://localhost:3001–3005` (placeholder — projects are served from user-provided site files).
- **Motion Page**: reel is **optional**. With a reel: `<video controls>` at `assets/reels/<id>.mp4` + poster, then a "Selected shots" section. Without one: the reel section is skipped entirely, the page opens into the shots (brand-identity-style layout) and the hero CTA becomes "See the shots" → `#shots`.
- **Brand Page** and **Motion Page** share one gallery system: a `repeat(6,1fr)` grid, `3px` gaps, where **each shot carries its own `span` (2/3/4/6) and `aspect-ratio`** — count and sizes are unconstrained per project. Every shot collapses to `span 6` below 780cqw. Data lives in each case's `shots: []` array.

### 6. Privacy — `Kinomad Privacy.dc.html`
Legal notice built on the project-page shell: `LEGAL// PRIVACY` label, giant "PRIVACY" title, italic Gambetta summary line, and a meta table (Controller / Jurisdiction / Last updated). Body is ten numbered rows (`01`–`10`) in a `64px | 1fr` grid — Who we are, What we collect, Why we use it, What we do not do, Cookies and storage, Who else sees it, How long we keep it, Your rights, Security, Changes — collapsing to one column below 780cqw. Closes with a data-request CTA to `Hello@Kinomadstudio.com`. Linked from every footer next to "Dubai, UAE".

**Copy is a solid, honest draft, not legal advice** — have counsel review it against UAE PDPL and GDPR before launch, and fill in the real legal entity name, the actual sub-processor list, and retention periods that match the studio's practice.

### 7. 404 — `Kinomad 404.dc.html`
Giant "4**0**4" (accent zero), line "This dream doesn't exist, or it hasn't been made real yet.", "Back to home ↗" CTA, slat-out entrance animation, ERROR 404// corner label.

### 8. CRM — `Kinomad CRM.dc.html` (internal tool, do not link publicly)
Add-work panel with a Website / Brand / 3D type switcher; per-type fields; a shots repeater (add/remove rows, per-shot width + ratio, live summary) shared by Brand and 3D; credits repeater; sticky summary with completeness checklist; Publish validation; and a Bookings inbox fed by the landing page scheduler.

Section map: `01` project meta · `02` type-specific media (Website: live URL + site zip + port; Brand: hero + fill colour; 3D: optional reel + poster + card image) · `02B` shots · `03` credits.

**The website local-run (zip upload → unpack → serve on a port) needs a backend.** Full implementation spec — data model, API, unpack guards, publish validation, security, acceptance checks — is in **`CRM-LOCAL-RUN.md`** in this bundle. Persistence for everything else (assets, bookings) is prototyped in browser storage and needs the same API treatment.

## Interactions & Behavior (site-wide)
- **Custom cursor**: 7px accent square, eased trailing follow, morphs round over interactive elements. Hidden on touch / coarse pointers and tablet/mobile.
- **Custom scrollbar**: native hidden; fixed 10px cream rectangle thumb, fills with accent proportional to scroll velocity from the leading edge, smoothstep-eased, drains on direction change.
- **Smooth wheel scroll**: wheel events intercepted, scroll position eased at ~0.085 lerp per frame.
- **Link hover**: underline sweeps in left→right (`background-size` 0→100%, 0.9s `cubic-bezier(0.22,1,0.36,1)`), exits off the right edge on leave; 2px thick. Real CSS `:hover` (class `.km-flink`).
- **CTA buttons** (`.km-cta`): cream background, accent fills left→right on hover (0.8s, same bezier), text stays dark ink `#14130F`.
- **Nav bar**: fixed, centered, translucent — `color-mix(… 62%, transparent)` + `backdrop-filter:blur(18px)`; no social icons; borderless theme toggle (accent tint on hover).
- **Theme**: dark (default) / light, toggled in nav, persisted in `localStorage`.
- **Booking**: custom on-brand modal scheduler (date picker → time slots → name/email/note → confirmation). Reads availability from the CRM config (working days, hours, slot interval, minimum notice, blocked dates, timezone); confirmed bookings land in the CRM Bookings inbox. Prototype persists to browser storage — back it with the API in production.
- **Global colour tweaks**: accent / background / nav colour are written to shared browser storage by whichever page's tweak panel changes them, and every page (including the CRM and 404) reads them on load. In production this is a single theme source, not per-page storage.
- **Reduced motion**: handled in CSS *and* JS. CSS kills animations and collapses transition durations, and sets `scroll-behavior:auto`. In JS, `_reduced()` gates `_initCursor()`: under reduced motion there is no custom cursor, no wheel hijack and no per-frame RAF loop — a plain passive scroll listener drives the scrollbar and hero instead, and the hero's final slat stage becomes a hard cut at 50% progress rather than a staggered wipe. Mirror this structure in production: one `prefersReducedMotion` check that disables cursor, smooth scroll and staggered reveals together.
- **Keyboard & assistive tech**: every page has a `.km-skip` skip-to-content link (visible on focus, first tab stop) targeting `#km-main`, a global `:focus-visible` ring (2px accent, 3px offset), `aria-expanded` + `aria-controls` on the nav menu button, and `aria-expanded` on the FAQ rows. Still to do in production: keyboard operation of the works carousel (arrow keys + visible focus on the active slide), focus trap and `Esc` handling in the booking modal, and `aria-live` on the booking confirmation step.

## State Management
Each page is a single component with local state: theme, device-preview mode, hover ids, carousel index, FAQ open index, booking modal. Project-detail pages parse `?project=` for routing. No server data; all content is inline in `_cases()` / data arrays in each file's logic class — in production, lift this into a CMS or JSON content layer shared across pages (the same project data feeds Works cards AND detail pages; keep it single-source).

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
1. Per-page `<title>` + meta description, e.g. "Kinomad — Design studio in Dubai" / "Works — Kinomad" / project names for detail pages.
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
- `assets/hero-1.png`, `assets/hero-2.png`, `assets/hero-3.png` — the three hero images (16:9), in wipe order
- `assets/hero-1-mobile.png`, `assets/hero-2-mobile.png`, `assets/hero-3-mobile.png` — portrait crops of the same three, used below 780px
- All project/process photos are **Pexels stock placeholders** (hotlinked URLs in the data arrays) — replace with owned imagery before launch
- Reel videos expected at `assets/reels/<project-id>.mp4` — not included
- `image-slot.js` — prototype-only drag-and-drop image placeholder; in production these are plain `<img>`/CMS images
- `support.js` — prototype runtime; not part of the handoff implementation

## Files
- `Kinomad Landing.dc.html` — landing page
- `Kinomad Works.dc.html` — portfolio index
- `Kinomad Website Page.dc.html` / `Kinomad Brand Page.dc.html` / `Kinomad Motion Page.dc.html` — project detail templates
- `Kinomad Privacy.dc.html` — privacy notice (draft copy, needs legal review)
- `Kinomad 404.dc.html` — error page
- `Kinomad CRM.dc.html` — internal add-work panel (needs backend)
- `CRM-LOCAL-RUN.md` — backend spec for the website zip-upload / local-serve feature
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
- Mobile hero art: portrait crops replace the cover-cropped 16:9 originals below 780px, and the slats overscale to `1.04` so sub-pixel seams no longer leak hairlines of the image at full cover.
- Works carousel swipe reworked to follow the finger, with a touch-event fallback — the earlier "swipe does nothing" behaviour on tablet/mobile is fixed.

**Engineering — still open**
6. Smooth wheel scroll still hijacks the wheel for users *without* a reduced-motion preference. Test against trackpad momentum and long-page keyboard paging; consider a user-facing toggle.
7. Booking modal needs a focus trap, `Esc` to close, focus restore on close, and `aria-live` on the confirmation.
8. The works carousel is pointer/touch only — add arrow-key navigation and a visible focus state.
9. Query-param routing (`?project=`) must become real routes; see the SEO section.
10. No loading, empty or error states anywhere — the CRM especially, once it talks to an API (`CRM-LOCAL-RUN.md` specifies the states it needs).
11. Image delivery is unoptimised full-size PNG/JPEG. Add responsive `srcset`, modern formats and lazy loading below the fold; the hero images are the largest payload on the site. The mobile/desktop hero swap is currently a JS `src` change — move it to `<picture>` so only one set is fetched.
12. Colour contrast should be re-run with a real checker once brand imagery replaces the stock photos — the hero meta row in particular sits on a scrim tuned to the current three images.

**Design**
13. Light theme is now audited section by section on the Landing page; give Works and the detail pages the same pass once real imagery lands.
14. Device testing was done at 834px and 390px in the preview, not on physical hardware. Verify the hero wipe performance and the carousel's pointer capture on a real phone.
15. No cookie-consent banner. Not needed while the site sets no tracking cookies — revisit the moment analytics is added.
