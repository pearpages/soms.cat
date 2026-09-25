# Architecture

How soms.cat is built. It explains *how* things work. The rules that follow from it are in
[principles.md](principles.md), the reasons for each choice in
[decisions.md](decisions.md), the security surface in [security.md](security.md), and open
work in [tasks.md](tasks.md). When code and this file disagree, the code is right and this
file is a bug.

## Shape

A single static page with no build step, deployed to GitHub Pages under the custom domain
in `CNAME` (`soms.cat`). The browser reads the source files as they are. A separate,
self-contained Node generator under `tools/garrotxa-map/` produced the map once; it is
kept for reproducibility and is not part of serving or deploying the site.

## Modules

| Path | Owns |
|---|---|
| `index.html` | The whole page, meta/Open Graph tags, and the generated map SVG |
| `styles.css` | The design system: tokens on `:root`, components, breakpoints, reveal styles |
| `script.js` | Scroll reveals only (`IntersectionObserver` on `[data-reveal]`) |
| `images/` | Archival photos, coat of arms, `og.webp` card, `garrotxa-relleu.webp` relief |
| `CNAME` | The GitHub Pages custom domain |
| `tools/garrotxa-map/` | One-off map generator with its own README, `package.json` and `.gitignore` |
| `.github/workflows/desplega.yml` | Tag-triggered deploy to GitHub Pages |

### Page structure

Full-bleed Santa Pau hero → *La família Soms* (essay, pull quote, map plate) → *Les Tietes
de Sant Roc* (photo plates) → *La Garrotxa* (stat strip + wide plate) → *El parlar*
(lexicon card grid) → footer (links + `@pearpages/credit` block).

### Design system — "Basalt volcànic"

- **Mood:** dark, museum-quality. Volcanic-charcoal ground, senyera yellow as the star
  accent, archival photo treatment.
- **Tokens** (`styles.css` `:root`): `--basalt` #131013 (page), `--basalt-2` (cards),
  `--basalt-3` (footer), `--groc` #ffcc00, `--vermell` #ff2a2a, `--vermell-fosc` #c41414,
  `--pergami` #f3e9d2 (body text), `--cendra` #9b8f85 (captions).
- **Type** (Google Fonts): Fraunces (display, h1/h2, pull quotes), Newsreader (body prose),
  Space Grotesk (eyebrows, captions, lexicon terms).
- **Signature — *les quatre barres*:** the senyera-stripe device (`.quatre-barres`,
  `--senyera-h`/`--senyera-v` gradients) used as a fixed left ribbon (≥1024px), section
  dividers and the footer's top strip.
- **Photos:** presented as archival plates (`.plate`) — parchment mat, sepia filter, slight
  rotation that straightens on hover. The map is a `.plate--document` (no sepia).
- **Motion:** hero load sequence plus scroll reveals. `script.js` adds `is-visible` as
  elements enter the viewport, or immediately when reduced motion is set or
  `IntersectionObserver` is missing. Reveal styles apply only under `html.js`.

### The Garrotxa map

Two layers stacked in one `.plate--document`:

- `images/garrotxa-relleu.webp` (1400×1360) — the shaded-relief base only: a warm
  hypsometric ramp from Copernicus GLO-30 elevations under an ICGC `OMB2m` 2 m LiDAR
  hillshade, on parchment.
- An inline SVG in `index.html`, between `<!-- mapa:inici -->` / `<!-- mapa:fi -->` — the
  oxide-red comarca hairline, the Fluvià, the 35 volcanic cones, settlements and lettering
  from OSM. Inline (not `<img>`) so labels use the page's webfonts and are readable by
  screen readers. Two label sets are laid out independently: the full set at ≥640px and a
  shorter set at 1.8× for narrow screens. Olot is the one `--groc` dot on the plate.

The generator (`build.mjs` → `fetch-data.mjs`, `relief.mjs`, `overlay.mjs`, `geo.mjs`;
then `inject.mjs`) fetches from ICGC WMS, Copernicus on AWS Open Data, Nominatim and
Overpass, caches every response under `.cache/` (gitignored, keyed by a hash of the
request), and uses `sharp` for raster work. Its README records what was tried and rejected.

## Data flow

No server-side logic, no state, no user input. The page loads three first-party files plus
images, and three external resources at runtime:

- Google Fonts CSS and font files (`fonts.googleapis.com`, `fonts.gstatic.com`).
- `https://unpkg.com/@pearpages/credit@0/dist/credit.css` — floats on the latest `0.x`, so
  the footer credit stays current without editing the page.
- `https://analytics.pearpages.com/script.js` — the footfall tag (self-hosted, cookieless
  Umami), `defer`red on its own line just before `</head>`, site ID from footfall's README.

The relief WebP is referenced from an SVG `<image>`, which has no `loading="lazy"`, so it
loads eagerly even though it sits below the fold.

## Build, test, deploy

- **Build:** none for the site. The map generator runs by hand (`npm run build`,
  `npm run inject` in `tools/garrotxa-map/`) only when the map changes.
- **Test:** no automated tests. Changes are verified in Chrome at 390px and 1440px: no
  horizontal overflow, reveals work, no console errors, no rendered map-label overlaps.
- **Deploy:** GitHub Pages with source "GitHub Actions". Pushing a new `v*` tag runs
  `desplega.yml`:
  1. `comprova` queries the `github-pages` environment's deployments and skips when the
     tag (as `vX` or `refs/tags/vX`) already has one in `success`, `in_progress` or
     `queued`. Failed deployments don't block a retry.
  2. `desplega` copies `index.html`, `styles.css`, `script.js`, `CNAME` and `images/` into
     `_lloc/`, uploads it as the Pages artifact and deploys it.

  Pushes to `main` publish nothing. The domain and HTTPS certificate live in the repo's
  Pages settings, not in the workflow. Docs, `tools/` and dotfiles never reach the site.
