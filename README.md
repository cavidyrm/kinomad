# Handoff: Kinomad Studio Website

## Overview
Complete marketing site for **Kinomad**, a design studio in Dubai, UAE. The package covers seven pages: Landing, Works (portfolio index), three project-detail templates (Website / Brand identity / 3D & motion), a 404 page, and an internal CRM panel for adding new works.

## About the Design Files
The `.dc.html` files in this bundle are **design references created in HTML** — high-fidelity prototypes showing intended look and behavior, not production code to copy directly. The task is to **recreate these designs in your target codebase's environment** (Next.js, Astro, plain React, etc.) using its established patterns. If no environment exists yet, a static-first framework with per-page routing (Next.js or Astro) fits this site best. Open each file in a browser to see the live design; read its markup and logic class for exact values and behavior.

## Fidelity
**High-fidelity.** Colors, typography, spacing, copy, and interactions are final. Recreate pixel-perfectly. The only placeholder content: Pexels stock photos (swap for real project imagery), `localhost` website URLs, reel videos (`assets/reels/*.mp4`, not included), and the social links (`#`).

## Pages

### 1. Landing — `Kinomad Landing.dc.html`
Sections (top to bottom): Hero, Studio, Process, Services, Featured works, Team, FAQ ("Your questions"), Pricing (CTA only — pricing cards were removed), Footer.
- **Hero**: 240vh scroll section. Sticky viewport shows the stone-cluster image (`assets/hero-stones.png`, `object-fit:contain`, generous padding) on `#050505`. On scroll, 18 thin vertical slats wipe left→right (`scaleX` 0→1, staggered, cubic ease-out), covering the image with the page background. The hero title is masked per-slat so it appears only where the dark wipe has covered — no fade. Meta row bottom: copyright / tagline / "Scroll ↓".
- **Studio**: heading (top border removed), copy, stretched "40+" stat block, letter-rolling number animation that resolves in-view.
- **Process**: 4 expanding cards (Listen / Define / Craft / Launch) with stock images; horizontal accordions on desktop, vertical stack on mobile (<780cqw).
- **Services**: full-width rows; hover expands row and inverts to cream background with description + "EXPLORE MORE" + large project count (count left-aligns to title edge on desktop, top-right on tablet).
- **Featured works**: draggable/swipeable carousel; active photo enlarges; pointer-tracked swipe with 40px threshold (works with touch cancel); much larger images on mobile (80cqw active).
- **Team**: cards with direct-DOM hover effects (no React re-render — this avoided a scramble-glitch; keep that constraint).
- **FAQ**: open row inverts (cream bg, dark text); answer opens over 1.1s `cubic-bezier(0.22,1,0.36,1)` with delayed fade.
- **Footer** (shared by all pages): sticky reveal, `#050505`, logo with bottom-up accent-fill hover sweep, `Hello@Kinomadstudio.com`, LinkedIn/Behance/Instagram with underline-sweep hover, "Dubai, UAE", giant half-cropped "kinomad" wordmark (visually centered by glyph ink edges, 19px optical margins). Full viewport height on desktop only (`min-height:0` under 1120cqw).

### 2. Works — `Kinomad Works.dc.html`
Header (giant tracked-out "WORKS"), then three portfolio sections + CTA:
- **Websites**: full-width image cards. Hover: image blurs (`blur(16px) brightness(0.45)`), centered name/meta fade out, and a detail overlay rises in: `(01) · Website` label, name, italic Gambetta statement, "Visit live site ↗" button (accent fill sweep; opens the project's `localhost` URL in a new tab), plus Industry/Category/Year meta table right-aligned. Card itself links to the Website Page. Text shadows are minimal (`0 1px 4px rgba(0,0,0,0.12)`).
- **Brand identity**: rows of 4 images (2×2 grid on mobile, 3px gaps — hover fill overlay bleeds -3px on all sides so gaps don't show). Hover sweeps the brand's fill color over images (staggered `clip-path`) and shows the same detail-overlay pattern, tinted in brand fill/contrast colors. Below 1250cqw the statement + meta table hide; below 900cqw content is left/bottom-anchored, and a static meta row shows on touch.
- **3D & motion**: taller portrait cards linking to Motion Page.
- **CTA**: "DREAMING OF **something?**" (accent, same font), subline "A brand, a website, a 3D world — whatever design you have in mind, ask us…", "Ask us anything ↗" button.

### 3–5. Project pages — `Kinomad Website Page.dc.html`, `Kinomad Brand Page.dc.html`, `Kinomad Motion Page.dc.html`
Shared layout: header with `(NN) · Type` label + giant project name, italic statement, Background/Concept two-column copy, meta table (Agency / Industry / Category / Year), hero media, credits, prev/next project navigation. Routing: one file per type, project selected by `?project=<id>` query param (see `_cases()` in each logic class).
- **Website Page**: adds "→ Live at" URL row and a "Visit live site ↗" CTA (accent fill hover). Sites run locally at `http://localhost:3001–3005` (placeholder — projects are served from user-provided site files).
- **Motion Page**: hero is a `<video controls>` reel expected at `assets/reels/<id>.mp4` + poster image.
- **Brand Page**: 4-image galleries.

### 6. 404 — `Kinomad 404.dc.html`
Giant "4**0**4" (accent zero), line "This dream doesn't exist, or it hasn't been made real yet.", "Back to home ↗" CTA, slat-out entrance animation, ERROR 404// corner label.

### 7. CRM — `Kinomad CRM.dc.html` (internal tool, do not link publicly)
Add-work panel with a Website / Brand / 3D type switcher; per-type fields; credits repeater; sticky summary with completeness checklist; Publish validation. **Website type expects a .zip of built site files and a port, to be unpacked and served locally — this requires a backend** (upload endpoint + static file server per project). The panel is a working front-end prototype; persistence and the local-server runner are not implemented.

## Interactions & Behavior (site-wide)
- **Custom cursor**: 7px accent square, eased trailing follow, morphs round over interactive elements. Hidden on touch / coarse pointers and tablet/mobile.
- **Custom scrollbar**: native hidden; fixed 10px cream rectangle thumb, fills with accent proportional to scroll velocity from the leading edge, smoothstep-eased, drains on direction change.
- **Smooth wheel scroll**: wheel events intercepted, scroll position eased at ~0.085 lerp per frame.
- **Link hover**: underline sweeps in left→right (`background-size` 0→100%, 0.9s `cubic-bezier(0.22,1,0.36,1)`), exits off the right edge on leave; 2px thick. Real CSS `:hover` (class `.km-flink`).
- **CTA buttons** (`.km-cta`): cream background, accent fills left→right on hover (0.8s, same bezier), text stays dark ink `#14130F`.
- **Nav bar**: fixed, centered, translucent — `color-mix(… 62%, transparent)` + `backdrop-filter:blur(18px)`; no social icons; borderless theme toggle (accent tint on hover).
- **Theme**: dark (default) / light, toggled in nav, persisted in `localStorage`.
- **Booking**: "Book a call" is currently `mailto:Hello@Kinomadstudio.com`. A finished but disconnected booking-modal (embedded Cal.com iframe, `bookingUrl` prop) exists in the Landing file for later use.
- **Reduced motion**: all pages carry `@media (prefers-reduced-motion: reduce){*{animation:none!important}}` — extend this to the JS-driven effects in production.

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
- `assets/logo-light.png`, `assets/logo-dark.png` — Kinomad mark
- `assets/hero-stones.png`, `assets/hero-k-*.png` — hero imagery
- All project/process photos are **Pexels stock placeholders** (hotlinked URLs in the data arrays) — replace with owned imagery before launch
- Reel videos expected at `assets/reels/<project-id>.mp4` — not included
- `image-slot.js` — prototype-only drag-and-drop image placeholder; in production these are plain `<img>`/CMS images
- `support.js` — prototype runtime; not part of the handoff implementation

## Files
- `Kinomad Landing.dc.html` — landing page
- `Kinomad Works.dc.html` — portfolio index
- `Kinomad Website Page.dc.html` / `Kinomad Brand Page.dc.html` / `Kinomad Motion Page.dc.html` — project detail templates
- `Kinomad 404.dc.html` — error page
- `Kinomad CRM.dc.html` — internal add-work panel (needs backend)
- `assets/` — logos + hero imagery
