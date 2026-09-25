# 0005. Footer credit comes from `@pearpages/credit@0` via unpkg

- **Date:** 2026-09-09
- **Status:** Accepted

## Context

pearpages sites share a "Made by pearpages" credit device, published as
`@pearpages/credit`. soms.cat has no build tooling (ADR-0002), so it cannot import the
package through a bundler.

## Decision

- Use the package's plain-HTML recipe: a `<link>` to
  `https://unpkg.com/@pearpages/credit@0/dist/credit.css` before `styles.css`, and a
  `<div class="sk-author">` inside the existing `<footer class="footer">`.
- Pin to `@0` so styling and the pear icon follow the latest `0.x` without edits.
- Theme it by setting `--sk-ink-soft: var(--cendra)` and `--sk-accent: var(--groc)` on
  `.sk-author`, not `:root`, keeping the package's tokens out of the site's namespace.

## Consequences

+ One shared credit across sites, kept current for free; still zero build tooling.
+ Contrast passes WCAG AA (6.2:1 and 13.0:1; the package's `#667` fallback would be 3.36:1).
− A third-party stylesheet on a floating version, with no SRI: a bad `0.x` release or an
  unpkg outage changes or unstyles the footer (see security.md).
− The markup must keep the package contract: empty icon `<span>`, exactly one link in
  `.sk-author__credit`.
