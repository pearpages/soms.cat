# Principles

Every change to this repository, whether code, docs, tests or process, complies with these
rules. When a change would break one, stop and ask the user instead of working around it.
Changing a principle is itself a decision: it needs the user's agreement and an ADR
([decisions.md](decisions.md)). How things are built is in
[architecture.md](architecture.md); security rules in [security.md](security.md).

Each rule has a **Why**, and a **Check** where something enforces it (a test, lint rule,
CI step, hook).

## Site

**P1. The site has zero build tooling: it is `index.html`, `styles.css`, `script.js`,
`CNAME` and `images/`, served as-is.** Nothing under `tools/` runs at deploy time or is
needed to serve the page.
*Why:* a single static page doesn't earn a toolchain; the browser reads the files as they
are. *Check:* `.github/workflows/desplega.yml` copies exactly those files into the Pages
artifact. [ADR-0002](docs/adr/0002-no-build-tooling.md)

**P2. Styling lives in `styles.css`, uses the design tokens on `:root`, BEM-style class
names, and is mobile-first with breakpoints at 640px and 1024px.** No inline styles.
*Why:* one design system ("Basalt volcànic") with one source of truth for colour and type.
*Check:* review; tokens `--basalt`, `--groc`, `--pergami`, `--cendra`… in `styles.css`.

**P3. Motion is progressive enhancement.** Every animation is gated behind
`prefers-reduced-motion`, and the page is fully visible without JavaScript — reveal styles
only apply under `html.js`.
*Why:* content first; motion must never hide it or make someone ill.
*Check:* `styles.css` scopes `[data-reveal]` under `.js` and has a
`prefers-reduced-motion: reduce` override; `script.js` bails out to visible when reduced.

**P4. All copy is Catalan, and correct Catalan** (Família, la introducció, la innovació…).
*Why:* it is an homage to a Catalan family and comarca; mistakes read as disrespect.
*Check:* review.

## Images

**P5. Photos on the page are genuine archival photos, kept untouched and original, and
every `<img>` carries `width`/`height`.** `images/familia.webp` is AI-generated and stays
in the repo but off the page.
*Why:* the page's authority rests on real photos; the dimensions prevent layout shift.
*Check:* review.

## Map

**P6. The map SVG between `<!-- mapa:inici -->` and `<!-- mapa:fi -->` is generated:
change `tools/garrotxa-map/overlay.mjs` and re-run, never edit the markup by hand.** Its
`font-size`s stay presentation attributes, not CSS.
*Why:* hand edits are lost on the next run, and the collision solver must measure exactly
what the browser draws. *Check:* `inject.mjs` replaces everything between the markers; its
`OPEN` constant must match the marker byte for byte (it exits 1 otherwise).
[ADR-0003](docs/adr/0003-bespoke-relief-map.md)

**P7. The data credits (ICGC, Copernicus, OpenStreetMap) stay in the map's figcaption and
in the README.**
*Why:* the ODbL requires attribution for OSM data; CC BY 4.0 for the ICGC hillshade.
*Check:* review.

## Footer

**P8. The `@pearpages/credit` block keeps the package contract and passes WCAG AA.** It is
a `<div class="sk-author">` (never a second `<footer>`), its icon `<span>` stays empty,
`.sk-author__credit` holds exactly one link, and its theme tokens are scoped to
`.sk-author` with `--sk-ink-soft: var(--cendra)`.
*Why:* nested footers are invalid and add a second `contentinfo` landmark; the package's
`#667` fallback is 3.36:1 on this ground, `--cendra` is 6.2:1.
*Check:* `styles.css` `.sk-author` rule. [ADR-0005](docs/adr/0005-pearpages-credit-footer.md)

## Release

**P9. Only a new annotated `v*` tag publishes the site; pushes to `main` never do.**
*Why:* publishing is a deliberate act, not a side effect of every commit.
*Check:* `desplega.yml` triggers on `tags: ["v*"]` and skips tags that already have a
successful deployment. [ADR-0004](docs/adr/0004-deploy-on-new-tag.md)

## Process

**P10. Knowledge lives in its file.** How to work → `AGENTS.md`; rules → here; how it is
built → `architecture.md`; why → an ADR; work → `tasks.md`; risk → `security.md`.
*Why:* a session log in the agent file hides decisions from the next person.
[ADR-0001](docs/adr/0001-project-knowledge-files.md)
