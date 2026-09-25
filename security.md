# Security

The security surface of soms.cat and the rules that protect it. General rules are in
[principles.md](principles.md); how the pieces fit in [architecture.md](architecture.md).
Update this file whenever the surface changes (new input, endpoint, secret, dependency,
permission).

## Reporting a vulnerability

Don't open a public issue for an unfixed vulnerability. Use GitHub's private vulnerability
reporting on [pearpages/soms.cat](https://github.com/pearpages/soms.cat/security) (Security
→ Report a vulnerability). TODO: private vulnerability reporting is currently disabled on
the repo; enable it in Settings → Code security.

## Surface

- **The site:** one static page on GitHub Pages. No forms, no user input, no cookies, no
  auth, no server-side code. `script.js` only toggles CSS classes. The realistic risks are
  defacement or content injection, reachable only through the repo, the deploy pipeline or
  a third-party resource.
- **Third-party resources loaded by every visitor:** Google Fonts
  (`fonts.googleapis.com`, `fonts.gstatic.com`) and
  `unpkg.com/@pearpages/credit@0/dist/credit.css`. Both are CSS/fonts, no third-party
  JavaScript. They see visitors' IPs and user agents.
- **Deploy pipeline:** `.github/workflows/desplega.yml` runs on tag pushes with
  `contents: read`, `pages: write`, `id-token: write`. It reads the deployments API with
  the built-in `github.token` and interpolates only `github.ref_name` (via `env`, not
  inline in the script).
- **Map generator (`tools/garrotxa-map/`):** runs by hand on a developer machine, fetches
  from public APIs (ICGC WMS, AWS Open Data, Nominatim, Overpass) without credentials, and
  writes only to `.cache/`, `out/`, `images/garrotxa-relleu.webp` and `index.html`.

## Secrets

- None. The site and the generator use no API keys; the workflow uses only the
  automatically provided `github.token`.
- `.env*` files are never committed.
- Privacy: the page shows family photos and names by the family's choice; don't add
  personal data (addresses, contact details, living people's details) without asking.

## Dependencies

- The site has no package dependencies.
- The generator depends only on `sharp`, installed by hand when the map is rebuilt; nothing
  from it ships to visitors.
- GitHub Actions are pinned to major tags (`actions/checkout@v4`,
  `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`,
  `actions/deploy-pages@v4`), all first-party GitHub actions.

## Known risks

- **Floating third-party CSS without SRI.** `@pearpages/credit@0` follows the latest `0.x`
  and has no `integrity` attribute, so a compromised release or unpkg could restyle or
  hide page content (CSS only; no script execution). Accepted: it is the author's own
  package and the point of `@0` is to stay current (ADR-0005).
- **Google Fonts** is a third-party request that exposes visitor IPs to Google. Accepted
  for the design; self-hosting would remove it.
- **Actions pinned by tag, not SHA.** A moved tag on a first-party GitHub action would run
  in the deploy job. Accepted for first-party actions.
- **No lockfile for the generator.** `sharp@^0.34.5` resolves at install time. Accepted:
  it runs rarely, by hand, and its output is reviewed in the diff.
