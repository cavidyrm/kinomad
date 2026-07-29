# Before DNS — required changes

Search and replace across `index.html`, `404.html`, `sitemap.xml`, `robots.txt`, and the
two compose files. Nothing here is cosmetic; each item is either wrong in public or a
legal exposure.

## 1. Domain

`https://ironpulse.com/` appears in the canonical link, Open Graph tags, Twitter card
tags, the JSON-LD block, `sitemap.xml` and `robots.txt`. Replace all of them with the
real domain. Also update the Traefik host rules in `docker-compose.yml` and
`samplestaticcompose.yml`, and the image name `ghcr.io/cavidyrm/ironpulse` if the repo is
named differently.

## 2. Business details

| Placeholder | Where |
| --- | --- |
| `220 Forge Street, Building C` | contact section, JSON-LD `streetAddress` |
| `East Docklands, Portland OR` | contact section, footer |
| `(503) 555-0142` | contact section |
| `+1-503-555-0142` | JSON-LD `telephone` |
| opening hours `05:00–21:00` / `07:00–16:00` | JSON-LD `openingHoursSpecification`, schedule section |
| `priceRange` `$22-$199` | JSON-LD — must match the pricing cards |

## 3. Content the studio must supply

- Coach names, roles, credentials and bios (four cards, `assets/coach1–4.png`)
- Real prices and what each tier includes
- The actual class schedule (day / time / class / coach)
- Final photography for hero, four program panels, five floor shots
- FAQ answers

## 4. Wiring

- Form endpoint for contact + booking, with honeypot rejection on `company_hp`
- Analytics snippet
- Privacy policy page and cookie consent, linked from the footer

## 5. Verify

Run the curl checks in `DEPLOY.md`, then load the page and confirm the hero photo, the
program panels and the Lucide icons render — those are the three things that depend on
files outside `index.html`.
