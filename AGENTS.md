# soms.cat

Single-page static homage to the Soms family and La Garrotxa: their heritage, their
language and their land. Catalan copy, genuine archival family photos presented as museum
plates, and a bespoke shaded-relief map of the comarca. Plain `index.html` + `styles.css` +
`script.js`, no build tooling, served by GitHub Pages at [soms.cat](https://soms.cat) and
published only when a new `v*` tag is pushed.

## Project documents — read before working

| File | Holds |
|---|---|
| [principles.md](principles.md) | The rules every change must follow |
| [architecture.md](architecture.md) | How the project is built: design system, page structure, map generator, deploy |
| [decisions.md](decisions.md) | Index of ADRs in `docs/adr/`: why each choice was made |
| [tasks.md](tasks.md) | Open work and the dated log of what was done |
| [security.md](security.md) | Threat surface, secrets, dependency policy, how to report a vulnerability |

[README.md](README.md) (in Catalan) is the user-facing entry point.
[tools/garrotxa-map/README.md](tools/garrotxa-map/README.md) documents the map generator.

## Working rules

1. **Read `principles.md` before changing code or docs.** If a change would break a
   principle, stop and ask; don't work around it.
2. **Every change updates `tasks.md`**: tick or add Open items, and add a dated line at the
   top of Done.
3. **A structural or behavioural change updates `architecture.md` in the same commit**, and
   the README too when users can see it.
4. **A choice between real alternatives** (API shape, dependency, convention, process) gets
   a new ADR in `docs/adr/` plus a line in `decisions.md`. Propose it to the user before
   marking it Accepted. Never edit an accepted ADR; supersede it with a new one.
5. **Anything touching auth, secrets, input handling or dependencies is checked against
   `security.md`**, and updates it when the surface changes.
6. **At the end of a session, outcomes go to those files, not here.** This file keeps only
   how to work and pointers — never a session log.
7. Confirm before anything outward-facing: pushes, releases, publishing, deploys. Here that
   means **pushing a `v*` tag**, which is the only thing that publishes the site.
8. **Verify visual changes in a real browser** at 390px and 1440px: no horizontal overflow,
   reveals work, no console errors. There is no automated test suite.

## Development commands

- `python3 -m http.server 8000`: serve the site locally at <http://localhost:8000> (any
  static server works; no `npm install`).
- `cd tools/garrotxa-map && npm install && npm run build`: rebuild the relief WebP and the
  SVG overlay. `npm run build -- --svg` rebuilds only the overlay (fast, no re-download).
- `cd tools/garrotxa-map && npm run inject`: splice the overlay into `index.html` between
  the `<!-- mapa:inici -->` / `<!-- mapa:fi -->` markers.
- `git tag -a vX.Y.Z -m "vX.Y.Z" && git push origin vX.Y.Z`: publish (confirm first). A
  push to `main` publishes nothing.

## Pitfalls that have bitten before

- **`node` fails with "No version is set for shim"** → the mise shim has no global default
  on this machine → call a concrete install:
  `~/.local/share/mise/installs/node/<version>/bin/node`.
- **`sharp` not found when running the generator with `NODE_PATH`** → ESM ignores
  `NODE_PATH` → symlink `~/.claude/skills/og-card/node_modules` into
  `tools/garrotxa-map/node_modules`, or `npm install`.
- **`inject.mjs` exits 1** → its `OPEN` constant no longer matches the marker comment in
  `index.html` byte for byte → change both together.
- **`for id in $ids` glued every id into one URL** → zsh does not word-split unquoted
  variables → use `while IFS= read -r id; do …; done <<< "$ids"`, which works in bash and
  zsh.
- **A tag was pushed but nothing ran** → `git push --follow-tags` silently skips
  lightweight tags → always tag with `git tag -a`.
- **Workflow is green but the site didn't change** → the tag already had a successful
  deployment, so the `desplega` job was skipped by design → check the `github-pages`
  environment, and use a new tag.
