# Deploying IRONPULSE

Same pipeline as `cavidyrm/kinomad`: a push to `main` builds a static nginx image,
pushes it to GHCR, then restarts the container on the server over SSH. Nothing is
built client-side — the site is flat HTML, one stylesheet, one script, and PNGs.

## Repo layout

| Path | Role |
| --- | --- |
| `index.html` | the landing page (nginx index) |
| `404.html` | not-found page, wired to `error_page 404` |
| `industry.css` | design-system stylesheet |
| `image-slot.js` | image placeholder component |
| `assets/` | hero, coach, program and floor photography |
| `robots.txt`, `sitemap.xml` | crawl directives |
| `Dockerfile` | nginx:1.27-alpine + glob copy + presence assertions |
| `nginx.conf` | routing, caching, 404, security headers |
| `docker-compose.yml` | Traefik labels + host port 3007 |
| `.github/workflows/deploy.yml` | build → GHCR → SSH restart |

## Git workflow

```
main                 production. Every push deploys. Protect it.
  └── feat/<thing>   short-lived branch, one change
```

1. `git switch -c feat/pricing-copy`
2. Commit in small steps. Conventional prefixes: `feat:`, `fix:`, `copy:`, `chore:`.
3. Open a PR. CI builds the image but does **not** deploy from a branch.
4. Squash-merge to `main` → the deploy job runs.

Recommended branch protection on `main`: require the build to pass, require one
review, disallow force-push. A revert is a new commit, which redeploys the previous
content — there is no rollback button, so keep commits small.

## One-time server setup

```bash
mkdir -p /opt/ironpulse && cd /opt/ironpulse
# copy docker-compose.yml here
docker network create traefik-public   # if it does not already exist
docker login ghcr.io -u <user> -p <ghcr-token>
docker compose up -d
```

## Required GitHub secrets

| Secret | Value |
| --- | --- |
| `SERVER_HOST` | server IP or hostname |
| `SERVER_USER` | SSH user |
| `SERVER_SSH_KEY` | private key for that user |
| `GHCR_TOKEN` | PAT with `read:packages`, used by the server to pull |
| `APP_DIR` | e.g. `/opt/ironpulse` — must match where the compose file lives |

`GITHUB_TOKEN` is provided automatically and is what pushes the image.

## Two deliberate choices in the config

**Glob copies, then assertions.** The Dockerfile copies `*.html *.css *.js *.txt *.xml`
and `assets/`, then asserts the required files exist in the image. A new file dropped
next to the others ships automatically; a deleted or renamed dependency fails the build
loudly instead of the site failing quietly in a browser.

**No SPA fallback.** `try_files \$uri \$uri/ =404` — a missing script returns 404, not
200-with-HTML. An HTML body served where JavaScript was requested is the classic way a
missing file disguises itself as a runtime error.

## Before you point DNS at it

Placeholders still in the content (see `README.md`):

- `https://ironpulse.com/` in canonical, Open Graph, Twitter, JSON-LD, `sitemap.xml`
- address `220 Forge Street, Building C`, phone `(503) 555-0142` (twice — also in JSON-LD)
- coach names, bios, prices, class schedule
- both forms are front-end only: add `action`/`method` or POST via fetch, and reject any
  submission where the honeypot field `company_hp` is non-empty
- analytics snippet before `</head>`; privacy policy and cookie consent are not included

Also swap `ironpulse.com` in `docker-compose.yml` for the real domain, and
`ghcr.io/cavidyrm/ironpulse` for the real image name if the repo is named differently.

## Sanity check after deploying

```bash
curl -sI https://ironpulse.com/                    | head -n1   # 200
curl -sI https://ironpulse.com/industry.css        | head -n1   # 200
curl -s  https://ironpulse.com/image-slot.js       | head -c 40 # JS, not "<!DOCTYPE html>"
curl -sI https://ironpulse.com/assets/hero.png     | head -n1   # 200
curl -sI https://ironpulse.com/pricing             | head -n1   # 301 → /#pricing
curl -sI https://ironpulse.com/nope                | head -n1   # 404, not 200
curl -sI https://ironpulse.com/robots.txt          | head -n1   # 200
```

Then load the page and confirm the hero photo, the program panels and the Lucide icons
render — those are the three things that depend on files outside `index.html`.
