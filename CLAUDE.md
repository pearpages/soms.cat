# soms.cat

Single-page static homage to the Soms family and La Garrotxa. Deployed on GitHub Pages (`CNAME` = soms.cat). No build tooling — plain `index.html` + `styles.css` + `script.js`.

## Design system — "Basalt volcànic"

- **Mood**: dark, museum-quality. Volcanic-charcoal ground, senyera yellow as the star accent, archival photo treatment.
- **Tokens** (in `styles.css` `:root`): `--basalt` #131013 (page), `--basalt-2` (cards), `--basalt-3` (footer), `--groc` #ffcc00, `--vermell` #ff2a2a, `--vermell-fosc` #c41414, `--pergami` #f3e9d2 (body text), `--cendra` #9b8f85 (captions).
- **Type**: Fraunces (display/h1/h2/pull quotes), Newsreader (body prose), Space Grotesk (eyebrows, captions, lexicon terms). Google Fonts.
- **Signature**: *les quatre barres* — senyera-stripe device (`.quatre-barres`, `--senyera-h`/`--senyera-v` gradients) used as fixed left ribbon (≥1024px), section dividers, and footer top strip.
- **Photos**: real vintage photos presented as archival "plates" (`.plate`) — parchment mat, sepia filter, slight rotation that straightens on hover. The map is a `.plate--document` (no sepia).
- **Motion**: hero load sequence + IntersectionObserver scroll reveals (`data-reveal` in `script.js`). All gated behind `prefers-reduced-motion`; content is visible without JS (reveal styles only apply under `html.js`).

## Conventions

- BEM-style class names, CSS custom properties, mobile-first (breakpoints 640/1024).
- Catalan copy throughout; keep correct Catalan (Família, la introducció, la innovació…).
- `images/familia.webp` is intentionally unused on the page (AI-generated; clashes with the genuine archival photos). Keep in repo.
- Images stay untouched/original; `<img>` tags carry `width`/`height` attributes to avoid layout shift.

## Session log

### 2026-08-04 — Full redesign ("Basalt volcànic")
- Rewrote `index.html` and `styles.css`; added `script.js` (scroll reveals).
- New structure: full-bleed Santa Pau hero → La família Soms (essay + pull quote + map plate) → Les Tietes de Sant Roc (photo plates) → La Garrotxa (stat strip + wide plate) → El parlar (lexicon card grid) → footer.
- Fixed broken meta placeholders (og:image, favicon now real files), added theme-color, og:locale.
- Catalan copy-edits (Família, imperible, formosos, extenses fagedes, a dalt/A baix, etc.); long paragraphs split for rhythm.
- Verified in Chrome at 1440px and 390px: no horizontal overflow, reveals work, senyera strips render correctly.
- **Pending TODOs**: none. Optional future idea: compress `tietes.jpg` (900 KB) into an optimized copy.

### 2026-08-04 — Open Graph card
- Generated `images/og.webp` (1200×630 WebP, 84 KB) from `santa-pau.jpeg` via the `og-card` skill.
- `index.html`: og:image/twitter:image now point at `https://soms.cat/images/og.webp`; added og:image:width/height/type/alt and twitter:image:alt (Catalan alt text).
- Note: `node` is not on PATH in this machine's default shell; mise has installs — use `~/.local/share/mise/installs/node/<version>/bin/node` directly.
- After deploy, validate the card with the Facebook Sharing Debugger / opengraph.xyz (needs the live URL).
