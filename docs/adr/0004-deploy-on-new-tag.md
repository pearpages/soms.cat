# 0004. Publish only when a new `v*` tag is pushed

- **Date:** 2026-09-09
- **Status:** Accepted

## Context

GitHub Pages ran in `legacy` mode from the `main` branch, so every push published the
site, including work-in-progress and docs-only commits.

## Decision

- Switch the Pages source to "GitHub Actions". `.github/workflows/desplega.yml` runs on
  `push` of tags matching `v*`.
- A `comprova` job skips publishing when the tag already has a deployment in `success`,
  `in_progress` or `queued` in the `github-pages` environment. It matches both `vX` and
  `refs/tags/vX` because `actions/deploy-pages` doesn't document which it records. A failed
  deployment doesn't block the tag, so transient failures can be retried.
- The artifact contains only the site: `index.html`, `styles.css`, `script.js`, `CNAME`,
  `images/`.
- `github.event.created` was rejected as the guard: it misses delete-and-recreate and
  manual re-runs.

## Consequences

+ Publishing is deliberate; `main` can move freely.
+ Moving a tag with `-f`, recreating it or re-running the workflow cannot republish.
+ Docs and `tools/` never reach the public site.
− Tags must be annotated: `git push --follow-tags` silently skips lightweight ones.
− A green run is not proof of a publish — it may have been skipped by design.
