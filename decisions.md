# Decisions

Architecture Decision Records for soms.cat. Each ADR in `docs/adr/` records one choice, its
context and its trade-off. The rules that follow from them are in
[principles.md](principles.md).

New ADR: copy the format below, take the next number, and add a line here. An accepted ADR
is not edited; reversing it means a new ADR whose status says `Supersedes NNNN`, and the old
one's status becomes `Superseded by NNNN`. ADRs are proposed to the user before they are
accepted.

| # | Decision | Status | Date |
|---|---|---|---|
| [0001](docs/adr/0001-project-knowledge-files.md) | Project knowledge lives in principles, architecture, decisions, tasks and security | Accepted | 2026-09-25 |
| [0002](docs/adr/0002-no-build-tooling.md) | The site is plain static files with no build tooling | Accepted | 2026-08-04 |
| [0003](docs/adr/0003-bespoke-relief-map.md) | The Garrotxa map is a bespoke relief plate built by a one-off generator | Accepted | 2026-08-10 |
| [0004](docs/adr/0004-deploy-on-new-tag.md) | Publish only when a new `v*` tag is pushed | Accepted | 2026-09-09 |
| [0005](docs/adr/0005-pearpages-credit-footer.md) | Footer credit comes from `@pearpages/credit@0` via unpkg | Accepted | 2026-09-09 |

## Format

```md
# NNNN. Title

- **Date:** YYYY-MM-DD
- **Status:** Proposed | Accepted | Superseded by NNNN

## Context
What forces the choice.

## Decision
What we do.

## Consequences
What gets better (+) and what it costs (−).
```
