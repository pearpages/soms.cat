# garrotxa-map

**The site has no build step, and this is not one.** Nothing in this folder runs at
deploy time; nothing here is needed to serve `index.html`. It is a one-off generator,
kept in the repo so the map is reproducible and its provenance is auditable.

Everything the map needs lives in this folder and nowhere else.

## What it builds

`build.mjs` produces the two halves of the map:

| Output | What it is |
|---|---|
| `../../images/garrotxa-relleu.webp` | shaded-relief base, 1400 px, ~146 KB — terrain only, no text or linework |
| `out/garrotxa.svg.html` | the SVG overlay — boundary, Fluvià, volcanic cones, settlements, lettering |

`inject.mjs` then drops that SVG into `index.html`, between the
`<!-- mapa:inici -->` / `<!-- mapa:fi -->` markers. It is re-runnable: it replaces
whatever is currently between them.

> The `OPEN` constant in `inject.mjs` must match the marker comment in `index.html`
> byte for byte. Change one and you must change the other, or injection stops finding
> its slot (it exits 1 rather than failing silently).

The overlay is inlined rather than shipped as a standalone `.svg` because an SVG loaded
through `<img>` cannot use the page's webfonts. Inline, the names render in real
Fraunces and Space Grotesk, respond to the breakpoint, and are readable by screen
readers.

## Running it

```sh
cd tools/garrotxa-map
npm install          # sharp is the only dependency
npm run build        # both stages
npm run build -- --svg   # overlay only — fast, no re-download
npm run inject
```

On this machine `node` is not on PATH and `sharp` is already available from the
`og-card` skill, so the shortcut is:

```sh
ln -s ~/.claude/skills/og-card/node_modules tools/garrotxa-map/node_modules
~/.local/share/mise/installs/node/24.16.0/bin/node tools/garrotxa-map/build.mjs
```

`NODE_PATH` does **not** work as a substitute — ESM ignores it.

Everything fetched is cached under `.cache/` (gitignored, ~87 MB), so re-runs are
offline and instant. Cache filenames carry a hash of the request that produced them, so
editing a query always refetches instead of silently reusing the old answer. Delete the
folder to force a full refetch.

## Where the data comes from

| Layer | Source | Licence |
|---|---|---|
| Hillshade | ICGC `OMB2m` WMS — 2 m LiDAR-derived *Mapa d'Ombres* | CC BY 4.0 |
| Elevation (colour ramp only) | Copernicus DEM GLO-30, AWS Open Data | free reuse |
| Comarca outline | OSM relation 2806999 via Nominatim | ODbL |
| Rivers, cones, settlements | Overpass, `area(3602806999)` | ODbL |

All four are credited in the figure caption in `index.html`. ODbL **requires** that
credit — do not drop it.

## Things already tried and rejected

Worth knowing before you re-litigate them:

- **AWS terrarium DEM tiles.** They stitch several source DEMs, and the metre-scale
  offsets between them survive any amount of smoothing as visible rectangular blocks of
  tint. Copernicus is a single seamless model, which is why the ramp comes from there
  and the shading from ICGC.
- **`map_to_area` in the Overpass query.** Times out on the public endpoints far more
  often than not. Use the explicit area id `3602806999`. The script already retries
  across three mirrors.
- **Municipal boundaries.** At the size this plate actually renders they never resolve
  into information — they just add grain over the relief — and they cost more bytes than
  every other layer combined. Removed rather than left switched off.
- **Volcano cones as label obstacles.** Fifteen sit within a centimetre of the Croscat,
  so a name long enough to matter can never find a slot clearing them all. Cones are
  deliberately excluded from the collision set; a haloed name crossing a small triangle
  reads fine, which is how printed maps have always handled it.

## Tuning

Cartographic knobs are at the top of `relief.mjs` (ramp, ink colours, shade strength,
the fade outside the comarca) and `overlay.mjs` (which names appear at which breakpoint,
simplification tolerances, cone sizing).

Label sizes are written into the SVG as presentation attributes, not left to CSS, so
that the sizes the collision solver measured are the ones the browser draws. Don't move
them into `styles.css`.

`--svg` prints a placement report:

- `- dropped "…"` — a second-tier name found no clear slot and was discarded. Usually
  the right outcome.
- `! forced "…"` — a first-tier name is overlapping something and wants a hand
  correction. Add an entry to the `NUDGE` table in `overlay.mjs`.
