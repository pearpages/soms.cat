/* Shaded-relief base for the Garrotxa map.

   Terrarium DEM tiles -> elevation grid -> Horn hillshade + warm hypsometric
   ramp -> feathered fade outside the comarca -> WebP. No text, no linework:
   the base is pure terrain, everything else lives in the SVG overlay. */

import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { TILE, toPath } from "./geo.mjs";

/* Warm, low-chroma ramp. It has to read as aged paper, not as a topo poster,
   so the whole span from valley floor to Puigsacalm covers very little chroma. */
const RAMP = [
  [120, [244, 236, 216]],
  [330, [237, 225, 194]],
  [560, [227, 209, 169]],
  [800, [214, 191, 145]],
  [1050, [196, 169, 122]],
  [1300, [175, 146, 103]],
  [1560, [152, 123, 86]],
];

const PAPER = [243, 233, 210]; // --pergami

/* Slopes are shaded by blending toward two inks rather than by multiplying:
   multiplying blows the lit faces out to flat white long before the shadows
   have any depth. Warm paper-white and a sepia shadow keep it engraved. */
const HIGHLIGHT = [255, 252, 243];
const SHADOW = [88, 71, 52];
const LIT_STRENGTH = 0.5;
const SHADOW_STRENGTH = 0.66;
const SHADE_SPREAD = 2.1; // std devs mapped to full ink

/* The ICGC layer is 2 m data; at map scale it needs taking down a notch. */
const SHADE_SOFTEN = 1.6; // blur sigma, in DEM pixels

/* The terrarium grid is used only for the colour ramp, so it gets smoothed
   hard: it contributes a slow warm gradient, never any detail. */
const DEM_SMOOTH_RADIUS = 6;

/* How much of the relief survives outside the comarca boundary. */
const OUTSIDE_OPACITY = 0.15;
const FEATHER_SIGMA = 14; // in DEM pixels

function rampColour(ele) {
  if (ele <= RAMP[0][0]) return RAMP[0][1];
  for (let i = 1; i < RAMP.length; i++) {
    if (ele <= RAMP[i][0]) {
      const [e0, c0] = RAMP[i - 1];
      const [e1, c1] = RAMP[i];
      const t = (ele - e0) / (e1 - e0);
      return [
        c0[0] + (c1[0] - c0[0]) * t,
        c0[1] + (c1[1] - c0[1]) * t,
        c0[2] + (c1[2] - c0[2]) * t,
      ];
    }
  }
  return RAMP[RAMP.length - 1][1];
}

/* Resample the Copernicus tiles onto the frame's Mercator pixel grid. */
async function buildElevationGrid(frame, copTiles) {
  const loaded = [];
  for (const tile of copTiles) {
    const { data, info } = await sharp(tile.file, { unlimited: true })
      .raw({ depth: "float" })
      .toBuffer({ resolveWithObject: true });
    loaded.push({
      ...tile,
      w: info.width,
      h: info.height,
      ch: info.channels, // libvips fans the single band out to RGB
      f: new Float32Array(data.buffer, data.byteOffset, data.length / 4),
    });
  }

  const n = 2 ** frame.z;
  const lonAt = new Float64Array(frame.demW);
  for (let x = 0; x < frame.demW; x++) {
    lonAt[x] = ((frame.tx0 + x / TILE) / n) * 360 - 180;
  }
  const latAt = new Float64Array(frame.demH);
  for (let y = 0; y < frame.demH; y++) {
    const t = frame.ty0 + y / TILE;
    latAt[y] = (Math.atan(Math.sinh(Math.PI * (1 - (2 * t) / n))) * 180) / Math.PI;
  }

  const grid = new Float32Array(frame.demW * frame.demH);
  for (let y = 0; y < frame.demH; y++) {
    const lat = latAt[y];
    const tile =
      loaded.find((t) => lat >= t.lat && lat < t.lat + 1) ?? loaded[0];
    const row = (tile.lat + 1 - lat) * tile.h;
    const r0 = Math.min(tile.h - 1, Math.max(0, Math.floor(row)));
    const r1 = Math.min(tile.h - 1, r0 + 1);
    const fr = row - r0;
    for (let x = 0; x < frame.demW; x++) {
      const col = (lonAt[x] - tile.lon) * tile.w;
      const c0 = Math.min(tile.w - 1, Math.max(0, Math.floor(col)));
      const c1 = Math.min(tile.w - 1, c0 + 1);
      const fc = col - c0;
      const a = tile.f[(r0 * tile.w + c0) * tile.ch];
      const b = tile.f[(r0 * tile.w + c1) * tile.ch];
      const c = tile.f[(r1 * tile.w + c0) * tile.ch];
      const d = tile.f[(r1 * tile.w + c1) * tile.ch];
      grid[y * frame.demW + x] =
        (a + (b - a) * fc) * (1 - fr) + (c + (d - c) * fc) * fr;
    }
  }
  return grid;
}

/* Separable box blur, run three times — a cheap, accurate-enough Gaussian. */
function smoothGrid(grid, w, h, radius) {
  const pass = (src, dst, w, h, stride, step) => {
    const norm = 1 / (2 * radius + 1);
    for (let line = 0; line < h; line++) {
      const base = line * stride;
      let sum = 0;
      for (let i = -radius; i <= radius; i++) {
        sum += src[base + Math.min(w - 1, Math.max(0, i)) * step];
      }
      for (let i = 0; i < w; i++) {
        dst[base + i * step] = sum * norm;
        const out = Math.min(w - 1, Math.max(0, i - radius));
        const inn = Math.min(w - 1, Math.max(0, i + radius + 1));
        sum += src[base + inn * step] - src[base + out * step];
      }
    }
  };

  let a = grid;
  let b = new Float32Array(grid.length);
  for (let n = 0; n < 3; n++) {
    pass(a, b, w, h, w, 1); // horizontal
    [a, b] = [b, a];
    pass(a, b, h, w, 1, w); // vertical
    [a, b] = [b, a];
  }
  return a;
}

/* Rasterise the comarca outline through librsvg — far faster and more correct
   than per-pixel point-in-polygon over 8 million pixels. */
async function buildInsideMask(frame, rings) {
  const projected = rings.map((ring) =>
    ring.map(([lon, lat]) => {
      const [x, y] = frame.project(lon, lat);
      return [x / frame.scale, y / frame.scale]; // back to DEM pixel units
    }),
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${frame.demW}" height="${frame.demH}">
    <rect width="100%" height="100%" fill="#000"/>
    <path d="${toPath(projected, { dp: 2 })}" fill="#fff" fill-rule="evenodd"/>
  </svg>`;
  const { data } = await sharp(Buffer.from(svg))
    .greyscale()
    .blur(FEATHER_SIGMA)
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data;
}

/* Assemble the ICGC WMS sub-images into one greyscale shade layer. */
async function buildShadeLayer(frame, parts) {
  const canvas = sharp({
    create: {
      width: frame.demW,
      height: frame.demH,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
    },
  }).composite(
    await Promise.all(
      parts.map(async (p) => ({
        input: await readFile(p.file),
        left: p.x,
        top: p.y,
      })),
    ),
  );
  const { data } = await sharp(await canvas.png().toBuffer())
    .greyscale()
    .blur(SHADE_SOFTEN)
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data;
}

export async function renderRelief({
  frame, copTiles, rings, shadeParts, outFile, outWidth,
}) {
  console.log("  resampling DEM…");
  const raw = await buildElevationGrid(frame, copTiles);
  const ele = smoothGrid(raw, frame.demW, frame.demH, DEM_SMOOTH_RADIUS);

  console.log("  assembling hillshade…");
  const shade = await buildShadeLayer(frame, shadeParts);

  console.log("  masking comarca…");
  const mask = await buildInsideMask(frame, rings);

  console.log("  shading…");
  const W = frame.demW;
  const H = frame.demH;

  /* Normalise against the layer's own distribution rather than a fixed
     mid-grey, so flat valley floors land on the ramp colour untouched and the
     ink is spent where there is actually relief. */
  let sum = 0;
  for (let i = 0; i < shade.length; i++) sum += shade[i];
  const mean = sum / shade.length;
  let variance = 0;
  for (let i = 0; i < shade.length; i++) variance += (shade[i] - mean) ** 2;
  const spread = SHADE_SPREAD * Math.sqrt(variance / shade.length);

  const rgb = Buffer.allocUnsafe(W * H * 3);

  for (let p = 0; p < W * H; p++) {
    let d = (shade[p] - mean) / spread;
    if (d < -1) d = -1;
    if (d > 1) d = 1;

    const base = rampColour(ele[p]);
    const ink = d > 0 ? HIGHLIGHT : SHADOW;
    const mix = d > 0 ? LIT_STRENGTH * d : SHADOW_STRENGTH * -d;
    const alpha = OUTSIDE_OPACITY + (1 - OUTSIDE_OPACITY) * (mask[p] / 255);

    const o = p * 3;
    for (let k = 0; k < 3; k++) {
      const shaded = base[k] + (ink[k] - base[k]) * mix;
      const v = PAPER[k] + (shaded - PAPER[k]) * alpha;
      rgb[o + k] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
  }

  console.log("  encoding WebP…");
  const info = await sharp(rgb, { raw: { width: W, height: H, channels: 3 } })
    .resize({ width: outWidth, kernel: "lanczos3" })
    .webp({ quality: 80, effort: 6, smartSubsample: true })
    .toFile(outFile);

  return info;
}
