#!/usr/bin/env node
/* Builds the Garrotxa relief map for soms.cat.
   See ./README.md — this is a one-off generator, NOT a site build step.

   Usage:  npm run build [-- --relief | --svg]

   With no flags it runs both stages. */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, stat, writeFile } from "node:fs/promises";

import {
  fetchComarca,
  fetchCopernicus,
  fetchFeatures,
  fetchHillshade,
} from "./fetch-data.mjs";
import { makeFrame } from "./geo.mjs";
import { renderRelief } from "./relief.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const CACHE = path.join(HERE, ".cache");
const OUT = path.join(HERE, "out");

const ZOOM = 13;
const PAD = 0.03; // fraction of span added on every side, for label room
const OUT_WIDTH = 1400; // relief WebP width in px
const SVG_WIDTH = 1040; // SVG user units

const flags = process.argv.slice(2);
const wantRelief = flags.length === 0 || flags.includes("--relief");
const wantSvg = flags.length === 0 || flags.includes("--svg");

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

async function main() {
  await mkdir(CACHE, { recursive: true });
  await mkdir(OUT, { recursive: true });

  console.log("· comarca outline");
  const { rings } = await fetchComarca(CACHE);
  const pts = rings.flat();
  const lons = pts.map((p) => p[0]);
  const lats = pts.map((p) => p[1]);

  let west = Math.min(...lons), east = Math.max(...lons);
  let south = Math.min(...lats), north = Math.max(...lats);
  const padLon = (east - west) * PAD;
  const padLat = (north - south) * PAD;
  west -= padLon; east += padLon;
  south -= padLat; north += padLat;

  const frame = makeFrame({ south, north, west, east, z: ZOOM, width: SVG_WIDTH });
  console.log(
    `  bbox ${south.toFixed(4)},${west.toFixed(4)} → ${north.toFixed(4)},${east.toFixed(4)}`,
  );
  console.log(`  DEM ${frame.demW}×${frame.demH}   SVG ${frame.width}×${frame.height}`);

  if (wantRelief) {
    console.log("· relief");
    const copTiles = await fetchCopernicus(CACHE, south, north, west, east);
    const shadeParts = await fetchHillshade(CACHE, frame);

    const outFile = path.join(ROOT, "images", "garrotxa-relleu.webp");
    const info = await renderRelief({
      frame,
      copTiles,
      rings,
      shadeParts,
      outFile,
      outWidth: OUT_WIDTH,
    });
    const { size } = await stat(outFile);
    console.log(`  → images/garrotxa-relleu.webp  ${info.width}×${info.height}  ${kb(size)}`);
  }

  if (wantSvg) {
    console.log("· overlay");
    const { buildOverlay } = await import("./overlay.mjs");
    const features = await fetchFeatures(CACHE);
    const { svg, report } = buildOverlay({ frame, rings, features });
    const outFile = path.join(OUT, "garrotxa.svg.html");
    await writeFile(outFile, svg);
    console.log(`  → out/garrotxa.svg.html  ${kb(Buffer.byteLength(svg))}`);
    for (const line of report) console.log(`    ${line}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
