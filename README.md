# IRONPULSE — handoff package

Everything needed to put this site in a git repo and deploy it. No build step, no
dependencies to install. The tree in this folder **is** the repo root: copy its contents
in as-is and the pipeline works.

## Contents

```
index.html                     landing page (nginx index)
404.html                       not-found page
industry.css                   design-system stylesheet — the source of truth for the look
image-slot.js                  image placeholder component
assets/                        hero, coach, program and floor photography (PNG)
robots.txt  sitemap.xml        crawl directives

Dockerfile                     nginx:1.27-alpine, glob copy + presence assertions
nginx.conf                     routing, caching, 404, security headers
docker-compose.yml             Traefik labels + host port 3007
samplestaticcompose.yml        reference copy of the above
.dockerignore
.github/workflows/deploy.yml   push to main → build → GHCR → SSH restart

DEPLOY.md                      git workflow, server setup, secrets, sanity checks
CHANGES-REQUIRED.md            the checklist that must be cleared before DNS
```

## Put it in the repo

```bash
git init                       # or clone the existing repo
cp -R handoff/. .              # includes .github/ and .dockerignore — note the trailing dot
git add -A
git commit -m "feat: IRONPULSE static site + deploy pipeline"
git push -u origin main        # this push deploys
```

Then follow **DEPLOY.md**: one-time server setup, the five GitHub secrets
(`SERVER_HOST`, `SERVER_USER`, `SERVER_SSH_KEY`, `GHCR_TOKEN`, `APP_DIR`), and the
post-deploy curl checks.

## How the site is put together

Flat HTML — no framework, no bundler. `index.html` carries the page markup plus a
page-local `<style>` block that overrides the accent ramp (cyan `#00E5FF`) and holds the
section, program-panel, coach, pricing and footer treatments. `industry.css` underneath
it defines the tokens (colour ramps, type scale, spacing, radii, shadows) and the base
component classes (`.btn`, `.card`, `.input`, `.tag`, `.table`, `.blueprint`). Retune the
palette or type in `industry.css`; the page inherits.

Two external runtime dependencies, both `<script src>` in `<head>`:

- **Lucide** from unpkg, for the icons. If you want zero third-party requests, vendor it:
  download `lucide.min.js` next to the pages and change the src. The Dockerfile's `*.js`
  glob will ship it automatically.
- **`image-slot.js`**, local — the photo placeholder component.

Interaction is vanilla JS at the bottom of `index.html`: program panel detail overlay,
coach click-to-reveal, FAQ accordion, scroll reveals, header show/hide, cursor reticle.
Motion is disabled under `prefers-reduced-motion`.

## What is deliberately not here

- **Form backend.** Both forms (contact + booking) are front-end only. Fields carry
  `name` attributes; add `action`/`method` or POST via fetch. An off-screen honeypot
  `company_hp` is present — reject any submission where it is non-empty.
- **Analytics.** Drop the GA4 / Plausible snippet before `</head>`.
- **Legal.** Privacy policy, imprint and cookie consent are not included, and are
  required if you collect form data in the EU/UK.
- **WebP/AVIF.** Photos ship as PNG. Converting them is the single biggest speed win
  available; the `assets/` filenames are referenced from `index.html` and `404.html`.
