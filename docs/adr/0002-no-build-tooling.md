# 0002. The site is plain static files with no build tooling

- **Date:** 2026-08-04
- **Status:** Accepted

## Context

soms.cat is one page of Catalan prose, a handful of archival photos and a map, hosted on
GitHub Pages. The 2026-08-04 redesign ("Basalt volcànic") rewrote it from scratch and could
have introduced a bundler, a CSS preprocessor or a framework.

## Decision

- The site is `index.html`, `styles.css` and `script.js` (plus `CNAME` and `images/`),
  written by hand and served exactly as committed.
- The design system lives in CSS custom properties; the only JavaScript is the scroll
  reveal, as progressive enhancement.
- Tooling that produces assets (the map generator) lives in its own self-contained folder
  under `tools/` and is run by hand, never at deploy time.

## Consequences

+ Nothing to install, upgrade or break; any static server previews the site.
+ What is in the repo is what ships — easy to reason about and to audit.
− No minification, image pipeline or templating; e.g. `tietes.jpg` (900 KB) is served as-is.
− Generated content (the map SVG) is committed into `index.html` and must not be hand-edited.
