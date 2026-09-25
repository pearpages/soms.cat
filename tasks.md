# Tasks

What's open and what's been done. Every change updates this file: tick or add an Open
item, and add a dated line at the top of **Done**.

## Open

### Scaffold follow-ups

- [ ] **Enable private vulnerability reporting** — security.md points reporters to it, but it is off — GitHub Settings → Code security.

### Backlog

- [ ] **Compress `tietes.jpg`** (900 KB) into an optimized copy — optional; largest asset on the page.
- [ ] **Validate the Open Graph card on the live URL** — Facebook Sharing Debugger / opengraph.xyz; can only be checked after deploy.
- [ ] **Consider lazy-loading the relief map** — optional; SVG `<image>` loads `garrotxa-relleu.webp` eagerly although it is below the fold.

## Done

- [x] 2026-09-25: Scaffolded project knowledge files — 12 created, 3 fixed, 1 follow-up. CLAUDE.md is now a shim; ADRs 0002–0005 accepted; README states no license (all rights reserved).
- [x] 2026-09-09: Catalan README and tag-only deploy — Pages source switched to GitHub Actions; `desplega.yml` publishes only a new `v*` tag; artifact holds only the site.
- [x] 2026-09-09: Added three sibling-site links (`cerdanya.soms.cat`, `masiablanca.soms.cat`, `bitepals.com`) under "Altres" in the footer.
- [x] 2026-09-09: Adopted `@pearpages/credit` footer via its plain-HTML recipe, themed to pass WCAG AA.
- [x] 2026-08-10: Consolidated the map generator into a self-contained `tools/garrotxa-map/`; removed dead code; cache keys now hash the request.
- [x] 2026-08-10: Replaced the clip-art Garrotxa map with a bespoke shaded-relief plate built from ICGC, Copernicus and OSM data.
- [x] 2026-08-04: Generated `images/og.webp` Open Graph card and completed og/twitter image meta.
- [x] 2026-08-04: Full redesign ("Basalt volcànic") — new `index.html`, `styles.css`, `script.js`; Catalan copy-edits; fixed meta placeholders.
