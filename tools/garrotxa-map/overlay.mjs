/* The vector half of the Garrotxa map: boundary, hydrography, volcanic cones,
   settlements and lettering, emitted as an SVG fragment to paste into
   index.html. It is inline rather than a standalone .svg file so the labels can
   use the page's own webfonts and respond to CSS. */

import { simplify, toPath } from "./geo.mjs";

/* Type sizes are in SVG user units against a ~1040-unit viewBox. The plate
   renders around 500 px wide, so a 21-unit label lands at roughly 10 px —
   which is the real constraint on how many names this map can carry.
   Elevation figures are sized relative to their label; the scale bar takes its
   size from CSS. */
const TYPE = {
  title: 25,
  city: 24,
  town: 20.5,
  minor: 18,
  volcano: 17.5,
};

/* Named on every screen. Anything else is either a bare dot or tier two. */
const TIER_ONE = new Set([
  "Olot",
  "Besalú",
  "Castellfollit de la Roca",
  "Santa Pau",
  "Sant Joan les Fonts",
  "Sant Feliu de Pallerols",
  "Sant Esteve d'en Bas",
]);

/* Argelaguer and Sant Jaume de Llierca are deliberately absent: they sit two
   millimetres apart in the Fluvià corridor, right where Castellfollit and
   Besalú already need the room. */
const TIER_TWO = new Set([
  "Tortellà",
  "Montagut",
  "les Preses",
  "Riudaura",
  "Mieres",
  "les Planes d'Hostoles",
]);

/* Three cones carry the story of the zona volcànica; the other thirty-two are
   marks only. Croscat and Santa Margarida are the pair everybody walks to,
   Montsacopa is the one Olot is built around. */
const VOLCANOES_NAMED = new Map([
  ["Volcà del Croscat", "el Croscat"],
  ["Volcà de Santa Margarida", "Santa Margarida"],
  ["Volcà del Montsacopa", "Montsacopa"],
]);

const PEAKS_NAMED = new Set(["Puigsacalm"]);

/* On a phone the plate is barely 310 px wide, so the desktop lettering would
   land at about 6 px — unreadable. The narrow screen gets its own, much larger
   and much shorter, set of names, laid out independently so the two never have
   to compromise for each other. Only one group is ever displayed. */
const MOBILE_SCALE = 1.8;
const MOBILE_KEEP = new Set([
  "Olot",
  "Besalú",
  "Castellfollit de la Roca",
  "Santa Pau",
  "Sant Feliu de Pallerols",
]);
const MOBILE_OPTIONAL = new Set([
  "el Croscat",
  "Santa Margarida",
  "Sant Joan les Fonts",
  "Sant Esteve d'en Bas",
]);

/* Simplification tolerances in SVG units (1 unit ≈ 40 m on the ground). The
   comarca outline is the one line worth spending bytes on. */
const TOL = { comarca: 0.55, riu: 1.3 };

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const n1 = (v) => Number(v.toFixed(1));

/* ---- label placement ---------------------------------------------------- */

/* Candidate offsets around a marker, in preference order: to the right first,
   which reads best for Latin script, then left, then the diagonals. */
const CANDIDATES = [
  { dx: 8, dy: 4.5, anchor: "start" },
  { dx: -8, dy: 4.5, anchor: "end" },
  { dx: 8, dy: -7, anchor: "start" },
  { dx: -8, dy: -7, anchor: "end" },
  { dx: 8, dy: 16, anchor: "start" },
  { dx: -8, dy: 16, anchor: "end" },
  { dx: 0, dy: -11, anchor: "middle" },
  { dx: 0, dy: 21, anchor: "middle" },
  { dx: 8, dy: -20, anchor: "start" },
  { dx: -8, dy: -20, anchor: "end" },
  { dx: 8, dy: 29, anchor: "start" },
  { dx: -8, dy: 29, anchor: "end" },
  { dx: 0, dy: -24, anchor: "middle" },
  { dx: 0, dy: 34, anchor: "middle" },
];

function boxFor(x, y, cand, text, size) {
  const w = text.length * size * 0.5;
  const h = size * 1.05;
  const left =
    cand.anchor === "start" ? x + cand.dx
    : cand.anchor === "end" ? x + cand.dx - w
    : x + cand.dx - w / 2;
  return { x0: left - 1.5, y0: y + cand.dy - h + 1, x1: left + w + 1.5, y1: y + cand.dy + 2 };
}

const overlaps = (a, b) =>
  a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/* Hand corrections for the few names the automatic placer cannot resolve.
   Keyed by label text; values are a candidate override in SVG units. */
const NUDGE = {};

function placeLabels(items, obstacles, frame, report) {
  const placed = [];
  const boxes = obstacles.slice();
  const margin = 8;

  for (const item of items) {
    let chosen = null;
    if (NUDGE[item.text]) {
      const cand = NUDGE[item.text];
      chosen = { cand, box: boxFor(item.x, item.y, cand, item.text, item.size) };
      boxes.push(chosen.box);
      placed.push({ ...item, ...cand });
      continue;
    }
    for (const cand of CANDIDATES) {
      const box = boxFor(item.x, item.y, cand, item.text, item.size);
      if (
        box.x0 < margin ||
        box.y0 < margin ||
        box.x1 > frame.width - margin ||
        box.y1 > frame.height - margin
      ) {
        continue;
      }
      if (boxes.some((b) => overlaps(b, box))) continue;
      chosen = { cand, box };
      break;
    }
    if (!chosen) {
      /* A second-tier name that cannot find a clear spot is worth less than
         the clutter it would cause, so it goes. A first-tier one has to stay:
         it gets forced and flagged for a hand nudge. */
      if (item.tier === 2) {
        report.push(`- dropped "${item.text}" (no clear position)`);
        continue;
      }
      report.push(`! forced "${item.text}" — overlaps, needs a hand nudge`);
      chosen = {
        cand: CANDIDATES[0],
        box: boxFor(item.x, item.y, CANDIDATES[0], item.text, item.size),
      };
    }
    boxes.push(chosen.box);
    placed.push({ ...item, ...chosen.cand });
  }
  return placed;
}

/* ---- main --------------------------------------------------------------- */

export function buildOverlay({ frame, rings, features }) {
  const report = [];
  const P = ([lon, lat]) => frame.project(lon, lat);
  const els = features.elements;

  /* Comarca outline — the one line that has to be crisp. */
  const comarcaRings = rings.map((r) => simplify(r.map(P), TOL.comarca));
  const comarcaPath = toPath(comarcaRings, { dp: 1 });

  /* Hydrography. Overpass returns the Fluvià in several pieces; they are all
     tagged with the same name, so collect them under one id for the textPath. */
  const rivers = els.filter((e) => e.type === "way" && e.tags?.waterway === "river");
  const fluvia = [];
  const otherRivers = [];
  for (const way of rivers) {
    const line = simplify(way.geometry.map((p) => P([p.lon, p.lat])), TOL.riu);
    (way.tags.name === "Riu Fluvià" ? fluvia : otherRivers).push(line);
  }
  // Longest Fluvià segment carries the label.
  fluvia.sort((a, b) => b.length - a.length);

  /* The Fluvià runs on east past the crop, so a fixed startOffset drops the
     name outside the frame. Walk the chosen segment and anchor the label to
     the middle of the stretch that is actually on the map. */
  const fluviaOffset = (() => {
    const line = fluvia[0];
    const cum = [0];
    for (let i = 1; i < line.length; i++) {
      cum.push(cum[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
    }
    const total = cum[cum.length - 1];
    const inside = line
      .map(([x, y], i) => (x > 90 && x < frame.width - 130 && y > 70 && y < frame.height - 70 ? i : -1))
      .filter((i) => i >= 0);
    if (!inside.length || !total) return "50%";
    const mid = inside[Math.floor(inside.length / 2)];
    return `${((cum[mid] / total) * 100).toFixed(1)}%`;
  })();

  /* Volcanic cones. */
  const volcanoes = els
    .filter((e) => e.type === "node" && e.tags?.natural === "volcano")
    .map((e) => {
      const [x, y] = P([e.lon, e.lat]);
      return { x, y, name: e.tags.name, ele: Number(e.tags.ele) || 0 };
    })
    .sort((a, b) => a.ele - b.ele);

  const peaks = els
    .filter((e) => e.type === "node" && e.tags?.natural === "peak")
    .map((e) => {
      const [x, y] = P([e.lon, e.lat]);
      return { x, y, name: e.tags.name, ele: Number(e.tags.ele) || 0 };
    });

  const places = els
    .filter((e) => e.type === "node" && /^(town|village)$/.test(e.tags?.place ?? ""))
    .map((e) => {
      const [x, y] = P([e.lon, e.lat]);
      return {
        x, y,
        name: e.tags.name,
        population: Number(e.tags.population) || 0,
      };
    })
    .sort((a, b) => b.population - a.population);

  report.push(
    `${comarcaRings[0].length} pts on the comarca outline, ` +
      `${volcanoes.length} cones, ${places.length} places`,
  );

  /* ---- lettering ------------------------------------------------------- */

  /* Markers are obstacles for every label, and so is the title block. */
  const obstacles = [
    { x0: 12, y0: 12, x1: 300, y1: 56 }, // title
    { x0: 12, y0: frame.height - 62, x1: 250, y1: frame.height - 12 }, // scale bar
  ];
  for (const p of places) obstacles.push({ x0: p.x - 4, y0: p.y - 4, x1: p.x + 4, y1: p.y + 4 });
  /* Cones are deliberately NOT obstacles. Fifteen of them sit within a
     centimetre of the Croscat, so a name long enough to matter can never find
     a slot that clears them all — and a haloed name crossing a 5-unit triangle
     reads fine, which is how printed maps have always handled it. */

  const wanted = [];
  for (const p of places) {
    if (p.name === "Olot") {
      wanted.push({ ...p, text: p.name, size: TYPE.city, tier: 1, kind: "city" });
    }
  }
  /* Cones are placed before the villages: the Croscat / Santa Margarida pair
     shares a corner with Santa Pau, and on this map the volcanoes are the
     point. Whoever gets there second takes the awkward slot. */
  for (const v of volcanoes) {
    const label = VOLCANOES_NAMED.get(v.name);
    if (label) wanted.push({ ...v, text: label, size: TYPE.volcano, tier: 1, kind: "volcano" });
  }
  for (const p of places) {
    if (p.name !== "Olot" && TIER_ONE.has(p.name)) {
      wanted.push({ ...p, text: p.name, size: TYPE.town, tier: 1, kind: "town" });
    }
  }
  for (const p of places) {
    if (TIER_TWO.has(p.name)) {
      wanted.push({ ...p, text: p.name, size: TYPE.minor, tier: 2, kind: "town" });
    }
  }
  for (const pk of peaks) {
    if (PEAKS_NAMED.has(pk.name)) {
      wanted.push({ ...pk, text: pk.name, size: TYPE.minor, tier: 2, kind: "peak" });
    }
  }

  const labels = placeLabels(wanted, obstacles, frame, report);

  /* The narrow-screen pass: fewer names, much bigger, placed from scratch. */
  const wantedNarrow = wanted
    .filter((w) => MOBILE_KEEP.has(w.text) || MOBILE_OPTIONAL.has(w.text))
    .map((w) => ({
      ...w,
      size: w.size * MOBILE_SCALE,
      tier: MOBILE_KEEP.has(w.text) ? 1 : 2,
    }))
    .sort((a, b) => a.tier - b.tier);
  const narrowReport = [];
  const labelsNarrow = placeLabels(wantedNarrow, obstacles, frame, narrowReport);
  for (const line of narrowReport) report.push(`[estret] ${line}`);

  /* ---- scale bar -------------------------------------------------------- */

  const barKm = 10;
  const barLen = (barKm * 1000) / frame.metresPerUnit;
  const barX = 16;
  const barY = frame.height - 26;

  /* ---- emit -------------------------------------------------------------- */

  const cone = (v) => {
    const r = 2.4 + Math.min(2.6, (v.ele / 850) * 2.6);
    return `M${n1(v.x - r)} ${n1(v.y + r * 0.72)}L${n1(v.x)} ${n1(v.y - r * 0.86)}L${n1(v.x + r)} ${n1(v.y + r * 0.72)}Z`;
  };

  const named = new Set(VOLCANOES_NAMED.keys());
  const minorCones = volcanoes.filter((v) => !named.has(v.name)).map(cone).join("");
  const majorCones = volcanoes.filter((v) => named.has(v.name)).map(cone).join("");

  const fluviaHead = toPath([fluvia[0]], { close: false, dp: 1 });
  const fluviaTail = toPath(fluvia.slice(1), { close: false, dp: 1 });
  const riuPath = toPath(otherRivers, { close: false, dp: 1 });
  const kb = (s) => `${(s.length / 1024).toFixed(1)} KB`;
  report.push(
    `bytes — comarca ${kb(comarcaPath)}, ` +
      `rius ${kb(fluviaHead + fluviaTail + riuPath)}, cons ${kb(minorCones + majorCones)}`,
  );

  /* Sizes are written as presentation attributes rather than left to CSS so
     that what the collision solver measured is exactly what the browser draws. */
  const renderLabels = (list) =>
    list
      .map((l) => {
        const cls = [
          "mapa__nom",
          `mapa__nom--${l.kind}`,
          l.tier === 2 ? "mapa__nom--menor" : "",
        ]
          .filter(Boolean)
          .join(" ");
        const ele =
          l.kind === "volcano" || l.kind === "peak"
            ? `<tspan class="mapa__cota" dx="4" font-size="${n1(l.size * 0.69)}">${Math.round(l.ele)}</tspan>`
            : "";
        return (
          `<text class="${cls}" x="${n1(l.x + l.dx)}" y="${n1(l.y + l.dy)}"` +
          ` font-size="${n1(l.size)}" text-anchor="${l.anchor}">${esc(l.text)}${ele}</text>`
        );
      })
      .join("\n        ");

  const labelMarkup = renderLabels(labels);
  const labelMarkupNarrow = renderLabels(labelsNarrow);

  const svg = `<svg class="mapa" viewBox="0 0 ${frame.width} ${frame.height}" role="img" aria-labelledby="mapa-titol mapa-desc">
      <title id="mapa-titol">Mapa en relleu de la Garrotxa</title>
      <desc id="mapa-desc">La comarca de la Garrotxa amb el relleu ombrejat, el riu Fluvià, els ${volcanoes.length} volcans de la zona volcànica i els pobles principals, amb Olot al centre.</desc>
      <defs>
        <clipPath id="mapa-retall"><path d="${comarcaPath}"/></clipPath>
        <path id="mapa-fluvia" d="${fluviaHead}"/>
      </defs>

      <image class="mapa__relleu" href="./images/garrotxa-relleu.webp" x="0" y="0" width="${frame.width}" height="${frame.height}" preserveAspectRatio="none"/>

      <g class="mapa__aigua" clip-path="url(#mapa-retall)">
        <use href="#mapa-fluvia" class="mapa__riu mapa__riu--gran"/>
        <path class="mapa__riu" d="${fluviaTail}"/>
        <path class="mapa__riu mapa__riu--petit" d="${riuPath}"/>
      </g>

      <path class="mapa__limit" d="${comarcaPath}"/>

      <g class="mapa__volcans">
        <path class="mapa__con" d="${minorCones}"/>
        <path class="mapa__con mapa__con--gran" d="${majorCones}"/>
      </g>

      <g class="mapa__poblacions">
        <path class="mapa__punt" d="${places
          .filter((p) => p.name !== "Olot")
          .map((p) => `M${n1(p.x - 2.2)} ${n1(p.y)}a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0`)
          .join("")}"/>
        ${places
          .filter((p) => p.name === "Olot")
          .map((p) => `<circle class="mapa__capital" cx="${n1(p.x)}" cy="${n1(p.y)}" r="5"/>`)
          .join("")}
      </g>

      <text class="mapa__fluvia-nom">
        <textPath href="#mapa-fluvia" startOffset="${fluviaOffset}">el Fluvià</textPath>
      </text>

      <g class="mapa__retols mapa__retols--ample">
        ${labelMarkup}
      </g>
      <g class="mapa__retols mapa__retols--estret">
        ${labelMarkupNarrow}
      </g>

      <text class="mapa__titol" x="16" y="40" font-size="${TYPE.title}">LA GARROTXA</text>

      <rect class="mapa__marc" x="1.5" y="1.5" width="${frame.width - 3}" height="${frame.height - 3}"/>

      <g class="mapa__escala">
        <path d="M${barX} ${n1(barY)}h${n1(barLen)}M${barX} ${n1(barY - 4)}v8M${n1(barX + barLen / 2)} ${n1(barY - 3)}v6M${n1(barX + barLen)} ${n1(barY - 4)}v8"/>
        <text x="${n1(barX + barLen + 7)}" y="${n1(barY + 4.5)}">${barKm} km</text>
      </g>
    </svg>`;

  return { svg, report };
}
