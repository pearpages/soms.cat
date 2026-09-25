# 0003. The Garrotxa map is a bespoke relief plate built by a one-off generator

- **Date:** 2026-08-10
- **Status:** Accepted

## Context

The page used `images/MapaGarrotxa.png`: clip-art with a flat orange fill, a drop shadow
and Arial lettering. It clashed with the museum-quality design and the archival photos.

## Decision

- Build the map from real data: ICGC `OMB2m` 2 m LiDAR hillshade (CC BY 4.0), Copernicus
  GLO-30 elevations for the colour ramp, and OSM (ODbL) for the comarca boundary, rivers,
  volcanic cones and settlements.
- Ship it in two layers: `images/garrotxa-relleu.webp` for the relief only, and an inline
  SVG overlay in `index.html` for linework and lettering, so labels use Fraunces / Space
  Grotesk, respond to the breakpoint and are readable by screen readers.
- Keep the generator in `tools/garrotxa-map/` (own README, `package.json`, `.gitignore`)
  so the map is reproducible, with a request-hashed cache. It injects between the
  `<!-- mapa:inici -->` / `<!-- mapa:fi -->` markers.
- Credit all data sources in the figcaption and the README.

Rejected: AWS terrarium DEM tiles (dataset seams show as tint blocks), municipal
boundaries (8.5 KB of grain that never resolves at plate size), `map_to_area` in Overpass
(times out). Details in the generator's README.

## Consequences

+ A map that matches the design and carries real geography, with 0 label overlaps at 390px
  and 1440px.
+ Net wire cost about +9 KB (`index.html` 5→14 KB gzipped, image 149→146 KB).
− The SVG in `index.html` is generated and must never be edited by hand.
− The relief WebP loads eagerly (SVG `<image>` has no `loading="lazy"`), where the old PNG
  was lazy.
− Attribution is a licence obligation, not decoration.
