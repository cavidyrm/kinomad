# Deploying this handoff

The repo (`cavidyrm/kinomad`) builds a static nginx image, pushes it to
`ghcr.io/cavidyrm/kinomad-frontend:latest`, and restarts the container on the server over SSH.
Nothing about that pipeline needs to change. Replace two files and add the new ones.

## What broke on the last deploy

**`KMAPI is not defined`, booking modal renders empty.** The `Dockerfile` copied pages
with an explicit per-file whitelist:

```dockerfile
COPY support.js image-slot.js /usr/share/nginx/html/
COPY ["Kinomad Landing.dc.html", "/usr/share/nginx/html/Kinomad Landing.dc.html"]
…
```

`km-api.js` was never added to that list, so the image shipped without it. The pages
requested it, got the SPA fallback (`try_files … /index.html` returns HTML with a 200),
the browser parsed HTML as JavaScript, and `window.KMAPI` was never defined. The error
surfaced inside the scheduler because that is the only thing on the landing page that
reads it.

**`Kinomad Privacy.dc.html` was also missing** from the same whitelist — the privacy
notice has been 404ing since it was added. The footer links to it on every page.

The replacement `Dockerfile` copies by glob (`*.js`, `*.dc.html`) and then **asserts**
every required file is present, so the build fails loudly instead of the site failing
quietly. A forgotten `COPY` line cannot happen again.

## Files to replace

| From here | Repo path |
| --- | --- |
| `deploy/Dockerfile` | `Dockerfile` |
| `deploy/nginx.conf` | `nginx.conf` |

`docker-compose.yml`, `samplestaticcompose.yml`, `.dockerignore` and
`.github/workflows/deploy.yml` are unchanged — keep the ones in the repo.

## Files to add at the repo root

- `km-api.js` — the API client every page loads. **This is the file that was missing.**
- `km-routes.js` — the canonical route table, and the link rewriting that turns the
  design-tool filenames into clean URLs when the page is served from a host.
- `Kinomad CRM Sign In.dc.html` — the admin sign-in page.

Every page is replaced in this drop, because all nine now load `km-routes.js`.

And replace with the versions in this folder: `Kinomad Landing.dc.html`,
`Kinomad CRM.dc.html`, plus `README.md`, `BACKEND-GUIDE.md`, `CRM-HOSTED-BUNDLES.md`
(this replaces `CRM-LOCAL-RUN.md` — hosted bundles are unpacked server-side now, there is
no local server to start, so delete the old file).

## Routing

The new `nginx.conf` adds the clean URLs the README documents, without renaming any file:

| URL | Serves |
| --- | --- |
| `/` | `Kinomad Landing.dc.html` (also copied to `index.html`) |
| `/works` | `Kinomad Works.dc.html` |
| `/website/<slug>` | `Kinomad Website Page.dc.html`, rendering that project |
| `/brand/<slug>` | `Kinomad Brand Page.dc.html` |
| `/motion/<slug>` | `Kinomad Motion Page.dc.html` |
| `/privacy` | `Kinomad Privacy.dc.html` |
| `/admin` | `Kinomad CRM.dc.html` |
| `/admin/login` | `Kinomad CRM Sign In.dc.html` |

The bare `/website`, `/brand` and `/motion` also resolve, showing the first project of
that type. Direct filename URLs keep working too.

**How the pages know.** `km-routes.js` holds the route table and, only when the page is
served from a host (the URL does not end in `.dc.html`), rewrites every internal link to
its clean form, sets `<link rel="canonical">`, and reads the project slug from the path
instead of `?project=`. In a design tool or a `file://` checkout it does nothing, so one
set of files works in both places. If the script fails to load, links fall back to the
filename URLs, which nginx still serves — degraded, not broken.

**Why the type prefix.** `/works/<slug>` needs to know a project's type to pick a
template, and only the API knows that. `/brand/vantar` is resolvable by a static server
today. When the backend renders project pages, switch to `/works/<slug>` and 301 these.

Two things to know about paths:

1. **Depth matters.** The pages reference `assets/…` and `./km-api.js` relatively, so a
   route one level deep resolves them under that level. `/admin/login` is the only such
   route, and the config aliases `/admin/assets/` and `/admin/*.js` back to the root.
   `/works/<slug>` will have the same problem when the backend starts rendering per-slug
   pages — at that point either switch the pages to root-absolute paths (`/assets/…`,
   `/km-api.js`) or add `<base href="/">` to each page's `<head>`.
2. **Belt and braces.** All three pages that need `km-api.js` load it relatively and then
   retry from `/km-api.js` if `window.KMAPI` is still undefined, so a wrong base path
   degrades instead of breaking. The pages also fail gracefully if the client never
   arrives: the landing scheduler falls back to published hours and refuses to submit, the
   CRM shows a *Console failed to load* screen, sign-in blocks with an inline notice.

`try_files … /index.html` was also removed from the catch-all. A missing asset now returns
a real 404 instead of 200-with-HTML, which is what disguised the missing script as a
JavaScript error.

## Before the backend exists

`km-api.js` is a **prototype stand-in** — it stores projects, availability and bookings in
the visitor's own browser. It is safe to deploy (nothing leaves the browser, no secrets)
and it makes the CRM and scheduler demonstrable, but:

- Bookings made on the live site are only visible in the browser that made them. The
  studio will not see them in the CRM.
- Anyone can open `/admin/login` and sign in with any valid email and a 4-character
  password.

If the site is going public before the API is ready, either keep `/admin*` off the public
build, or put HTTP basic auth in front of it:

```nginx
location ~ ^/admin {
    auth_basic "Kinomad";
    auth_basic_user_file /etc/nginx/.htpasswd;
    try_files "/Kinomad CRM.dc.html" =404;
}
```

Swapping in the real service is described in `BACKEND-GUIDE.md`: replace the bodies of the
methods on `window.KMAPI` with `fetch` calls. The routes, payloads and status codes the UI
already handles (401, 404, 409, 422, 503) are the contract.

## Sanity check after deploying

```bash
curl -sI https://kinomadstudio.com/km-api.js | head -n1        # 200, not 404
curl -s  https://kinomadstudio.com/km-api.js | head -c 40      # JS, not "<!DOCTYPE html>"
curl -sI https://kinomadstudio.com/privacy | head -n1          # 200
curl -sI https://kinomadstudio.com/admin/login | head -n1      # 200
curl -sI https://kinomadstudio.com/brand/vantar | head -n1      # 200
curl -sI https://kinomadstudio.com/admin/km-api.js | head -n1   # 200 — depth-safe rule
curl -sI https://kinomadstudio.com/nope | head -n1              # 404, not 200
```

Then open the landing page, click **Book a call**, and confirm the calendar and time
column render. That path is the one that failed before.
