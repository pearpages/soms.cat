/* Web Mercator projection + geometry helpers.

   Everything — the DEM raster and the vector overlay — is expressed in the same
   Mercator tile-pixel frame, so the two can never drift apart. */

export const TILE = 256;

function lonToTileX(lon, z) {
  return ((lon + 180) / 360) * 2 ** z;
}

function latToTileY(lat, z) {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
}

/* A frame maps lon/lat onto SVG user units (and onto DEM pixels via `scale`). */
export function makeFrame({ south, north, west, east, z, width }) {
  const tx0 = lonToTileX(west, z);
  const tx1 = lonToTileX(east, z);
  const ty0 = latToTileY(north, z);
  const ty1 = latToTileY(south, z);

  const demW = Math.round((tx1 - tx0) * TILE);
  const demH = Math.round((ty1 - ty0) * TILE);
  const scale = width / demW;
  const height = Math.round(demH * scale);

  const project = (lon, lat) => [
    (lonToTileX(lon, z) - tx0) * TILE * scale,
    (latToTileY(lat, z) - ty0) * TILE * scale,
  ];

  // Ground metres per SVG unit, at the centre latitude — for the scale bar.
  const midLat = (south + north) / 2;
  const metresPerDemPixel =
    (156543.03392 * Math.cos((midLat * Math.PI) / 180)) / 2 ** z;
  const metresPerUnit = metresPerDemPixel / scale;

  return {
    z, south, north, west, east,
    tx0, tx1, ty0, ty1,
    demW, demH, scale,
    width, height,
    project,
    metresPerUnit,
  };
}

/* ---- Douglas–Peucker --------------------------------------------------- */

function perpDistance(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len;
}

export function simplify(points, tolerance) {
  if (points.length < 3) return points;
  let maxDist = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDistance(points[i], points[0], points[points.length - 1]);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist <= tolerance) return [points[0], points[points.length - 1]];
  return [
    ...simplify(points.slice(0, index + 1), tolerance).slice(0, -1),
    ...simplify(points.slice(index), tolerance),
  ];
}

/* ---- SVG path emission -------------------------------------------------- */

const round = (n, dp = 1) => Number(n.toFixed(dp)).toString();

export function toPath(rings, { close = true, dp = 1 } = {}) {
  return rings
    .filter((r) => r.length > 1)
    .map((ring) => {
      const head = `M${round(ring[0][0], dp)} ${round(ring[0][1], dp)}`;
      const tail = ring
        .slice(1)
        .map(([x, y]) => `L${round(x, dp)} ${round(y, dp)}`)
        .join("");
      return head + tail + (close ? "Z" : "");
    })
    .join("");
}
