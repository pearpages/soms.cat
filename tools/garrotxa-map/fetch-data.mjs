/* Data acquisition for the Garrotxa relief map.
   Everything is cached under ./.cache/ so re-runs never re-hit the network. */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const COMARCA_RELATION = 2806999;
const OVERPASS_AREA = 3600000000 + COMARCA_RELATION;

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
];

const UA = "soms.cat map builder (pere@soms.cat)";

/* `fingerprint` is whatever the response depends on — for an Overpass call, the
   query text itself. It is folded into the filename so that editing a query can
   never silently reuse the answer to the previous one. */
async function cached(cacheDir, key, fingerprint, produce) {
  const stamp = createHash("sha256").update(fingerprint).digest("hex").slice(0, 8);
  const ext = path.extname(key);
  const file = path.join(cacheDir, `${key.slice(0, -ext.length)}.${stamp}${ext}`);
  if (existsSync(file)) {
    return JSON.parse(await readFile(file, "utf8"));
  }
  const value = await produce();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value));
  return value;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Overpass is routinely overloaded and answers 429/504 with an HTML body.
   Rotate endpoints and back off rather than failing the build. */
async function overpass(query) {
  let lastError;
  for (let attempt = 0; attempt < 6; attempt++) {
    const endpoint = OVERPASS_ENDPOINTS[attempt % OVERPASS_ENDPOINTS.length];
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": UA,
        },
        body: new URLSearchParams({ data: query }),
      });
      const text = await res.text();
      if (!res.ok || !text.trimStart().startsWith("{")) {
        throw new Error(`${endpoint} -> ${res.status} ${text.slice(0, 120)}`);
      }
      return JSON.parse(text);
    } catch (error) {
      lastError = error;
      console.warn(`  overpass attempt ${attempt + 1} failed: ${error.message}`);
      await sleep(3000 * (attempt + 1));
    }
  }
  throw lastError;
}

/* ---- comarca outline -------------------------------------------------- */

const NOMINATIM_URL =
  "https://nominatim.openstreetmap.org/search" +
  "?county=Garrotxa&state=Catalunya&country=Spain" +
  "&format=json&polygon_geojson=1&limit=5";

export function fetchComarca(cacheDir) {
  return cached(cacheDir, "comarca.json", NOMINATIM_URL, async () => {
    const res = await fetch(NOMINATIM_URL, { headers: { "User-Agent": UA } });
    const hits = await res.json();
    const hit = hits.find(
      (h) => h.osm_type === "relation" && Number(h.osm_id) === COMARCA_RELATION,
    );
    if (!hit) throw new Error("Garrotxa relation not found in Nominatim reply");
    const g = hit.geojson;
    // Normalise Polygon | MultiPolygon down to a list of rings (outer only).
    const rings =
      g.type === "Polygon"
        ? [g.coordinates[0]]
        : g.coordinates.map((poly) => poly[0]);
    return { rings };
  });
}

/* ---- everything else, in one Overpass round trip ----------------------

   The explicit area id matters: `map_to_area` times out on the public
   endpoints far more often than not. */

const FEATURES_QUERY = `
  [out:json][timeout:180];
  area(${OVERPASS_AREA})->.g;
  (
    node(area.g)["natural"="volcano"]["name"];
    node(area.g)["natural"="peak"]["name"](if: t["ele"] > 1150);
    way(area.g)["waterway"="river"]["name"];
    node(area.g)["place"~"^(town|village)$"]["name"];
  );
  out geom;
`;

export function fetchFeatures(cacheDir) {
  return cached(cacheDir, "features.json", FEATURES_QUERY, async () => {
    console.log("  querying Overpass…");
    return overpass(FEATURES_QUERY);
  });
}

/* ---- ICGC "Mapa d'Ombres 2m" hillshade --------------------------------

   Terrarium's z13 mosaic stitches several source DEMs and the joins show up as
   rectangular seams once hillshaded. The ICGC serves a LiDAR-derived 2 m
   hillshade of the whole of Catalonia with no such seams, so the shading comes
   from there and the terrarium grid is kept only for the colour ramp.
   Licence: © Institut Cartogràfic i Geològic de Catalunya, CC BY 4.0.        */

const ICGC_WMS = "https://geoserveis.icgc.cat/icgc_mdt2m/wms/service";
const ICGC_MAX = 2048; // MaxWidth/MaxHeight advertised in GetCapabilities

const toMercatorX = (lon) => (lon * 20037508.34) / 180;
const toMercatorY = (lat) =>
  (Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180)) *
  (20037508.34 / 180);

export async function fetchHillshade(cacheDir, frame) {
  const dir = path.join(cacheDir, "ombra");
  await mkdir(dir, { recursive: true });

  const cols = Math.ceil(frame.demW / ICGC_MAX);
  const rows = Math.ceil(frame.demH / ICGC_MAX);

  // Mercator is linear in pixel space, so splitting the metre bbox by pixel
  // fraction lines the sub-images up exactly.
  const mx0 = toMercatorX(frame.west);
  const mx1 = toMercatorX(frame.east);
  const my0 = toMercatorY(frame.south);
  const my1 = toMercatorY(frame.north);

  const xEdges = [0];
  for (let c = 1; c <= cols; c++) xEdges.push(Math.round((frame.demW * c) / cols));
  const yEdges = [0];
  for (let r = 1; r <= rows; r++) yEdges.push(Math.round((frame.demH * r) / rows));

  const parts = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px0 = xEdges[c], px1 = xEdges[c + 1];
      const py0 = yEdges[r], py1 = yEdges[r + 1];
      const file = path.join(dir, `${frame.demW}x${frame.demH}_${c}_${r}.png`);
      const part = {
        file,
        x: px0,
        y: py0,
        width: px1 - px0,
        height: py1 - py0,
      };
      if (!existsSync(file)) {
        const bbox = [
          mx0 + ((mx1 - mx0) * px0) / frame.demW,
          my1 - ((my1 - my0) * py1) / frame.demH,
          mx0 + ((mx1 - mx0) * px1) / frame.demW,
          my1 - ((my1 - my0) * py0) / frame.demH,
        ].join(",");
        const url =
          `${ICGC_WMS}?service=WMS&version=1.1.1&request=GetMap&layers=OMB2m` +
          `&styles=&srs=EPSG:3857&bbox=${bbox}` +
          `&width=${part.width}&height=${part.height}&format=image/png`;
        console.log(`  ICGC hillshade ${c},${r} (${part.width}×${part.height})…`);
        const res = await fetch(url, { headers: { "User-Agent": UA } });
        const buf = Buffer.from(await res.arrayBuffer());
        if (!res.ok || buf.subarray(1, 4).toString() !== "PNG") {
          throw new Error(`ICGC WMS ${c},${r}: ${res.status} ${buf.subarray(0, 200)}`);
        }
        await writeFile(file, buf);
      }
      parts.push(part);
    }
  }
  return parts;
}

/* ---- Copernicus GLO-30 elevation --------------------------------------

   Only feeds the hypsometric colour ramp. AWS's terrarium mosaic was tried
   first and rejected: it stitches several source DEMs, and the metre-scale
   offsets between them survive any amount of smoothing as visible rectangular
   blocks of tint. Copernicus is a single seamless global model.
   Licence: © DLR e.V. 2010-2014 / Airbus DS GmbH 2014-2018, free reuse.     */

export async function fetchCopernicus(cacheDir, south, north, west, east) {
  const dir = path.join(cacheDir, "copernicus");
  await mkdir(dir, { recursive: true });

  const names = [];
  for (let lat = Math.floor(south); lat <= Math.floor(north); lat++) {
    for (let lon = Math.floor(west); lon <= Math.floor(east); lon++) {
      const ns = `${lat < 0 ? "S" : "N"}${String(Math.abs(lat)).padStart(2, "0")}`;
      const ew = `${lon < 0 ? "W" : "E"}${String(Math.abs(lon)).padStart(3, "0")}`;
      names.push({ lat, lon, id: `${ns}_00_${ew}_00` });
    }
  }

  for (const tile of names) {
    tile.file = path.join(dir, `${tile.id}.tif`);
    if (existsSync(tile.file)) continue;
    const stem = `Copernicus_DSM_COG_10_${tile.id}_DEM`;
    console.log(`  downloading Copernicus ${tile.id}…`);
    const res = await fetch(
      `https://copernicus-dem-30m.s3.amazonaws.com/${stem}/${stem}.tif`,
      { headers: { "User-Agent": UA } },
    );
    if (!res.ok) throw new Error(`Copernicus ${tile.id}: ${res.status}`);
    await writeFile(tile.file, Buffer.from(await res.arrayBuffer()));
  }
  return names;
}
