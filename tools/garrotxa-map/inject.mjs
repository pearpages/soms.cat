#!/usr/bin/env node
/* Drops the SVG built by build.mjs into index.html, between the two marker
   comments. Re-runnable: it replaces whatever is currently between them.

   Usage: npm run inject */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");

/* OPEN must match index.html byte for byte — if either side is edited alone,
   injection stops finding its slot. */
const OPEN = "<!-- mapa:inici — generat per tools/garrotxa-map/build.mjs -->";
const CLOSE = "<!-- mapa:fi -->";

const html = await readFile(path.join(ROOT, "index.html"), "utf8");
const svg = (await readFile(path.join(HERE, "out/garrotxa.svg.html"), "utf8")).trim();

const start = html.indexOf(OPEN);
const end = html.indexOf(CLOSE);
if (start === -1 || end === -1) {
  console.error(`index.html is missing the ${OPEN} / ${CLOSE} markers`);
  process.exit(1);
}

const indented = svg
  .split("\n")
  .map((line, i) => (i === 0 ? `            ${line}` : `      ${line}`))
  .join("\n");

const next =
  html.slice(0, start + OPEN.length) +
  "\n" +
  indented +
  "\n            " +
  html.slice(end);

await writeFile(path.join(ROOT, "index.html"), next);
console.log(`injected ${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB of SVG into index.html`);
