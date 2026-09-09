# soms.cat

Single-page static homage to the Soms family and La Garrotxa. Deployed on GitHub Pages (`CNAME` = soms.cat). No build tooling — plain `index.html` + `styles.css` + `script.js`.

## Design system — "Basalt volcànic"

- **Mood**: dark, museum-quality. Volcanic-charcoal ground, senyera yellow as the star accent, archival photo treatment.
- **Tokens** (in `styles.css` `:root`): `--basalt` #131013 (page), `--basalt-2` (cards), `--basalt-3` (footer), `--groc` #ffcc00, `--vermell` #ff2a2a, `--vermell-fosc` #c41414, `--pergami` #f3e9d2 (body text), `--cendra` #9b8f85 (captions).
- **Type**: Fraunces (display/h1/h2/pull quotes), Newsreader (body prose), Space Grotesk (eyebrows, captions, lexicon terms). Google Fonts.
- **Signature**: *les quatre barres* — senyera-stripe device (`.quatre-barres`, `--senyera-h`/`--senyera-v` gradients) used as fixed left ribbon (≥1024px), section dividers, and footer top strip.
- **Photos**: real vintage photos presented as archival "plates" (`.plate`) — parchment mat, sepia filter, slight rotation that straightens on hover. The map is a `.plate--document` (no sepia).
- **Map**: the Garrotxa map is a bespoke shaded-relief plate, not stock art — warm hypsometric ramp on parchment, sepia hillshade, oxide-red comarca hairline, the 35 volcanic cones of the zona volcànica, Olot marked with the one `--groc` dot on the plate. Built by `tools/garrotxa-map/`; see that folder's README.
- **Motion**: hero load sequence + IntersectionObserver scroll reveals (`data-reveal` in `script.js`). All gated behind `prefers-reduced-motion`; content is visible without JS (reveal styles only apply under `html.js`).

## Conventions

- BEM-style class names, CSS custom properties, mobile-first (breakpoints 640/1024).
- Catalan copy throughout; keep correct Catalan (Família, la introducció, la innovació…).
- `images/familia.webp` is intentionally unused on the page (AI-generated; clashes with the genuine archival photos). Keep in repo.
- Images stay untouched/original; `<img>` tags carry `width`/`height` attributes to avoid layout shift.
- The map SVG in `index.html` lives between the `<!-- mapa:inici -->` / `<!-- mapa:fi -->` markers and is **generated** — edit `tools/garrotxa-map/overlay.mjs` and re-run, never the markup by hand. Its `font-size`s are presentation attributes on purpose (the generator's collision solver must measure what the browser draws), so don't move them into CSS. The `OPEN` constant in `inject.mjs` must match that marker comment byte for byte.
- `tools/garrotxa-map/` is a one-off generator, not a build step — self-contained, with its own README, `package.json` and `.gitignore`. The site itself still has zero build tooling.

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

### 2026-08-10 — Bespoke Garrotxa relief map
- Replaced `images/MapaGarrotxa.png` (clip-art: flat orange fill, drop shadow, Arial) with a map built from real data. **Old PNG deleted.**
- New `images/garrotxa-relleu.webp` (1400×1360, 146 KB) = shaded-relief base only; the linework and lettering are inline SVG in `index.html` (~28 KB raw) so the labels use Fraunces / Space Grotesk.
- Added the generator under `tools/garrotxa-map/` (see its README).
- Data: ICGC `OMB2m` 2 m LiDAR hillshade (CC BY 4.0), Copernicus GLO-30 for the colour ramp, OSM for boundary/rivers/cones/settlements (ODbL). **All four credited in the figcaption — ODbL requires it, don't drop it.**
- Two label sets are generated and laid out independently: full set ≥640px, a shorter set at 1.8× for narrow screens. Verified 0 rendered label overlaps at 390px and 1440px, no horizontal overflow, no console errors.
- Rejected along the way: AWS terrarium DEM (dataset seams show as tint blocks), municipal hairlines (8.5 KB for grain that never resolves at plate size).
- Net wire cost vs. before: index.html 5→14 KB gzipped, map image 149→146 KB. About +9 KB.
- Note the relief WebP loads eagerly (SVG `<image>` has no `loading="lazy"`), where the old PNG was lazy — below-the-fold, so a minor initial-load cost if ever worth revisiting.

### 2026-08-10 — Tidied the generator into one folder
- Consolidated the seven scattered files (`tools/*.mjs` + `tools/lib/`) into a flat, self-contained `tools/garrotxa-map/` with its own README, `package.json` (`npm run build` / `npm run inject`) and `.gitignore`. Root `.gitignore` is back to just `.DS_Store`.
- Deleted dead code left behind by mid-build reversals: `fetchPark()` (was doing a full Overpass round trip whose result `buildOverlay` ignored), `pointInRings()`, `relationRings()`, `TYPE.ele`/`TYPE.scale`, and the whole switched-off municipal-boundary path including its CSS and the `admin_level=8` Overpass clause. The *reasons* for the rejections live in the folder README now, not as unreachable code.
- Fixed a latent trap: `cached()` keyed only on filename, so editing a query silently reused the previous answer. Cache filenames now carry an 8-char hash of the request.
- Verified behaviour-preserving: rebuild used the moved cache with zero refetch, and the regenerated `index.html` differed only by the marker comment and the removed empty `<g class="mapa__municipis">`; `images/garrotxa-relleu.webp` byte-identical.
- **Pending TODOs**: none. Same optional idea as before: compress `tietes.jpg` (900 KB).

### 2026-09-09 — "Made by pearpages" credit footer
- Adopted `@pearpages/credit` (the shared credit device) via its **Plain HTML** recipe: `<link>` to `https://unpkg.com/@pearpages/credit@0/dist/credit.css` in `<head>` before `styles.css`, plus a `.sk-author` block inside the existing `<footer class="footer">`.
- `@0` tracks the latest `0.x`, so the styling and the pear icon stay current without editing the page. The site still has zero build tooling.
- Used `<div class="sk-author">`, not `<footer>` — nesting footers is invalid HTML and would produce a second `contentinfo` landmark. Verified exactly one `<footer>` in the page.
- Two package contract rules the markup must not break: the icon `<span>` stays **empty** (the pear is a CSS `background`, not an `<img>`), and `.sk-author__credit` keeps **exactly one link** (the rule is the descendant selector `.sk-author__credit a`).
- Theming is scoped to `.sk-author` in `styles.css`, not `:root` — the package's `--sk-ink-soft`/`--sk-accent` are a foreign namespace; our own tokens stay the source of truth. `--sk-ink-soft: var(--cendra)` is **mandatory**: the package's `#667` fallback fails WCAG AA on this dark ground (3.36:1), `--cendra` gives 6.2:1; `--sk-accent: var(--groc)` gives 13.0:1.
- Also gave it `max-width: var(--wide)` + `margin: 0 auto` so its hairline `border-top` aligns with `.footer__container`, and `--font-utility` to match the other utility text.
- The "Altres" column keeps its `pearpages.com` link (user's call), so that link appears twice in the footer by design.
- Verified in Chrome: unpkg CSS 200, pear renders from the data URI, one line at every width, no horizontal overflow, no console errors.
- Added three sibling-site links under `pearpages.com` in the footer's "Altres" column: `cerdanya.soms.cat`, `masiablanca.soms.cat`, `bitepals.com`. All three verified 200 (bitepals redirects to `/ca`, so link the bare domain and let its own locale logic run).
- Labels are bare domains, matching `pearpages.com`. Their own `<title>`s are content-derived ("Font-Romeu · 1760 m · 3 restaurants"), not site names — the descriptive-label style belongs to the *other* column ("Turisme Garrotxa", "10 motius").
- No `target="_blank"`/`rel` — the page uses neither anywhere, external links included. No `styles.css` change needed.
- **Pending TODOs**: none. Same optional idea as before: compress `tietes.jpg` (900 KB).

### 2026-09-09 — README en català i desplegament només per tag
- **Canvi de política de publicació.** Pages passa de `legacy` (branca `main`, cada push publicava) a font "GitHub Actions". Ara **només publica un tag `v*` nou**; els pushos a `main` no toquen el lloc. El domini `soms.cat` i el certificat HTTPS viuen a la config del repo i no els toca el workflow.
- Nou `.github/workflows/desplega.yml`, en dues feines: `comprova` decideix, `desplega` publica.
- La guarda consulta els desplegaments de l'entorn `github-pages` i salta si aquell tag ja en té un. Cobreix els tres casos: moure un tag amb `-f`, esborrar-lo i recrear-lo, i re-executar el workflow a mà. `github.event.created` sol no serviria: no atrapa ni el delete+recreate ni el re-run.
- Es comparen **les dues formes** del `ref` (`v1.0.0` i `refs/tags/v1.0.0`) perquè `actions/deploy-pages` no documenta quina hi grava i no es pot confirmar sense publicar. Els desplegaments legacy hi tenen `main`.
- Un desplegament **fallat** no bloqueja el tag: només compten els estats `success`/`in_progress`/`queued`, perquè una incidència transitòria no deixi una versió bloquejada per sempre.
- Trampa trobada provant la guarda contra l'API real: `for id in $ids` no separa per paraules a zsh i enganxava tots els ids en una sola URL. Ara és `while IFS= read -r id ... <<< "$ids"`, que va igual als dos shells.
- L'artefacte puja **només el lloc** (`index.html`, `styles.css`, `script.js`, `CNAME`, `images/`). En queden fora `CLAUDE.md`, `README.md` i `tools/`. Verificat que cap ruta relativa d'`index.html` queda fora.
- Nou `README.md` **en català**: què és, sense build, estructura, desenvolupament local, desplegament, disseny, el mapa i els crèdits de dades. Els crèdits ICGC/Copernicus/OSM hi surten perquè **l'ODbL exigeix l'atribució**.
- **TODOs pendents**: cap. Mateixa idea opcional de sempre: comprimir `tietes.jpg` (900 KB).
