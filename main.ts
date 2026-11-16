// main.ts — ai-excited-01 entry: "MIDNIGHT BLOOM".
//
// One image, drawn from code alone, written to /output/entry.png.
// Node 22, standard library only, no network, fully deterministic (the grader runs
// the entry twice and both runs must write the same bytes).
//
// The picture: a colossal bioluminescent jellyfish filling the top of the frame, so
// big the frame cuts it off, its rim burning and its tentacles coming down out of
// the dark past a tiny lantern-lit boat caught in the swell below. The night behind
// it is split by hard rays. It has just come up out of that water, and the water is
// still coming off it.
//
// Drawn in a bold, flat, cel-shaded poster style: thick ink outlines, five flat tone
// bands per shape, hard edges. Everything is hand-drawn here: signed-distance
// shapes, capsule ribbons, a per-pixel background, an ordered dither, and a
// hand-rolled PNG writer (zlib is Node's own).
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------------------
// canvas
// ---------------------------------------------------------------------------

const px = new Float32Array(W * H * 3);

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
function mix(a, b, t) {
  return a + (b - a) * t;
}
function mix3(a, b, t) {
  return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
}

// opaque anti-aliased stroke in one flat colour: the brush of this whole picture
function solidSegment(x0, y0, x1, y1, rad, cr, cg, cb, alpha) {
  const minx = Math.max(0, Math.floor(Math.min(x0, x1) - rad - 2));
  const maxx = Math.min(W - 1, Math.ceil(Math.max(x0, x1) + rad + 2));
  const miny = Math.max(0, Math.floor(Math.min(y0, y1) - rad - 2));
  const maxy = Math.min(H - 1, Math.ceil(Math.max(y0, y1) + rad + 2));
  for (let y = miny; y <= maxy; y++) {
    for (let x = minx; x <= maxx; x++) {
      const vx = x1 - x0;
      const vy = y1 - y0;
      const wx = x + 0.5 - x0;
      const wy = y + 0.5 - y0;
      const len2 = vx * vx + vy * vy;
      let t = len2 > 0 ? (wx * vx + wy * vy) / len2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const dx = wx - vx * t;
      const dy = wy - vy * t;
      const d = Math.sqrt(dx * dx + dy * dy) - rad;
      const cov = clamp(0.5 - d, 0, 1);
      if (cov > 0) {
        const i = (y * W + x) * 3;
        const a = cov * alpha;
        const ia = 1 - a;
        px[i] = px[i] * ia + cr * a;
        px[i + 1] = px[i + 1] * ia + cg * a;
        px[i + 2] = px[i + 2] * ia + cb * a;
      }
    }
  }
}

function solidDot(x, y, rad, cr, cg, cb, alpha) {
  const minx = Math.max(0, Math.floor(x - rad - 1));
  const maxx = Math.min(W - 1, Math.ceil(x + rad + 1));
  const miny = Math.max(0, Math.floor(y - rad - 1));
  const maxy = Math.min(H - 1, Math.ceil(y + rad + 1));
  for (let yy = miny; yy <= maxy; yy++) {
    for (let xx = minx; xx <= maxx; xx++) {
      const dx = xx + 0.5 - x;
      const dy = yy + 0.5 - y;
      const d = Math.sqrt(dx * dx + dy * dy) - rad;
      const cov = clamp(0.5 - d, 0, 1);
      if (cov > 0) {
        const i = (yy * W + xx) * 3;
        const a = cov * alpha;
        const ia = 1 - a;
        px[i] = px[i] * ia + cr * a;
        px[i + 1] = px[i + 1] * ia + cg * a;
        px[i + 2] = px[i + 2] * ia + cb * a;
      }
    }
  }
}

function bezPt(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  return [
    a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
  ];
}

// a fixed pseudo-random stream: the picture is the same on every run
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261116);

// ---------------------------------------------------------------------------
// palette — five flat tones, one ink, three accents
// ---------------------------------------------------------------------------

const INK = [0.016, 0.020, 0.080];
const SKY_TOP = [0.035, 0.045, 0.175];
const SKY_LOW = [0.095, 0.125, 0.400];
const RAY_LIGHT = [0.145, 0.205, 0.580];
const SEA_DEEP = [0.018, 0.038, 0.128];
const SEA_MID = [0.052, 0.100, 0.275];
const ICE = [0.930, 1.000, 1.000];
const CYAN = [0.190, 0.870, 0.980];
const SKYBLUE = [0.220, 0.480, 0.950];
const VIOLET = [0.440, 0.260, 0.890];
const DEEPVIO = [0.200, 0.075, 0.450];
const MAGENTA = [1.000, 0.230, 0.660];
const FOAM = [0.900, 0.980, 1.000];
const AMBER = [1.000, 0.760, 0.300];

const HORIZON = 762;

// ---------------------------------------------------------------------------
// 1. the night: gradient sky, a hard burst of rays, black water below
// ---------------------------------------------------------------------------

const FOCUS = [512, 300];

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    let r, g, b;
    if (y < HORIZON) {
      const t = Math.pow(y / HORIZON, 1.4);
      r = mix(SKY_TOP[0], SKY_LOW[0], t);
      g = mix(SKY_TOP[1], SKY_LOW[1], t);
      b = mix(SKY_TOP[2], SKY_LOW[2], t);
      const dx = x + 0.5 - FOCUS[0];
      const dy = y + 0.5 - FOCUS[1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ang = Math.atan2(dy, dx) + Math.PI;
      const sector = Math.floor((ang / (Math.PI * 2)) * 26);
      if (sector % 2 === 0 && dist > 130) {
        const fade = clamp((dist - 130) / 520, 0, 1);
        const k = 0.60 * (0.45 + 0.55 * fade);
        r = mix(r, RAY_LIGHT[0], k);
        g = mix(g, RAY_LIGHT[1], k);
        b = mix(b, RAY_LIGHT[2], k);
      }
      const halo = Math.exp(-(dist * dist) / (2 * 420 * 420)) * 0.62;
      r = mix(r, CYAN[0], halo * 0.34);
      g = mix(g, CYAN[1], halo * 0.34);
      b = mix(b, CYAN[2], halo * 0.34);
    } else {
      const t = Math.pow((y - HORIZON) / (H - HORIZON), 0.7);
      r = mix(SEA_MID[0], SEA_DEEP[0], t);
      g = mix(SEA_MID[1], SEA_DEEP[1], t);
      b = mix(SEA_MID[2], SEA_DEEP[2], t);
    }
    const dx2 = (x + 0.5 - FOCUS[0]) / 760;
    const dy2 = (y + 0.5 - FOCUS[1]) / 760;
    const vig = 1 - 0.40 * clamp(dx2 * dx2 + dy2 * dy2, 0, 1.8);
    const i = (y * W + x) * 3;
    px[i] = r * vig;
    px[i + 1] = g * vig;
    px[i + 2] = b * vig;
  }
}

// stars: clean points and four-point diamonds, kept few so nothing competes
for (let i = 0; i < 95; i++) {
  const x = rnd() * W;
  const y = Math.pow(rnd(), 1.3) * (HORIZON - 80) + 40;
  const b = 0.25 + Math.pow(rnd(), 2) * 0.75;
  const s = 1.0 + rnd() * 2.0;
  if (rnd() < 0.30) {
    solidSegment(x - s * 3.6, y, x + s * 3.6, y, s * 0.9, ICE[0], ICE[1], ICE[2], b);
    solidSegment(x, y - s * 3.6, x, y + s * 3.6, s * 0.9, ICE[0], ICE[1], ICE[2], b);
    solidDot(x, y, s * 1.5, ICE[0], ICE[1], ICE[2], b);
  } else {
    solidDot(x, y, s * 0.8, ICE[0], ICE[1], ICE[2], b);
  }
}

// ---------------------------------------------------------------------------
// 2. the shaft of light it drags down out of the bell: the axis of the picture
// ---------------------------------------------------------------------------

// three defined cones of light falling from the bell to the surface: the axis of
// the picture, drawn with hard edges like every other shape here
const CONES = [
  [-268, -150, 44, 60, 0.055],
  [16, 78, -10, 104, 0.085],
  [252, 148, 96, 68, 0.05],
];
for (const c of CONES) {
  for (let y = 214; y < HORIZON; y += 3) {
    const t = (y - 214) / (HORIZON - 214);
    const cx = 512 + c[0] + (c[2] - c[0]) * t;
    const hw = c[1] + (c[3] - c[1]) * t;
    solidSegment(cx - hw, y, cx + hw, y, 1.4, CYAN[0], CYAN[1], CYAN[2], c[4]);
  }
}

// ---------------------------------------------------------------------------
// 3. the creature, filling the top of the frame and cut off by it
// ---------------------------------------------------------------------------

const CX = 512;
const CY = 96;
const TILT = -0.06;
const A = 508;
const B = 372;
const SKIRT = 104;
const cosT = Math.cos(TILT);
const sinT = Math.sin(TILT);

function toLocal(x, y) {
  const dx = x - CX;
  const dy = y - CY;
  return [dx * cosT + dy * sinT, -dx * sinT + dy * cosT];
}
function toWorld(lx, ly) {
  return [CX + lx * cosT - ly * sinT, CY + lx * sinT + ly * cosT];
}
// signed distance to the bell (negative inside, in pixels)
function bellField(lx, ly) {
  const e = Math.sqrt((lx * lx) / (A * A) + (ly * ly) / (B * B)) - 1;
  let d1 = e * B;
  if (ly > 0) d1 += ly * 1.8;
  const wf = 1 - 0.07 * clamp(ly / SKIRT, 0, 1);
  const dw = Math.abs(lx) - A * 0.96 * wf;
  const db = ly - (SKIRT + 13 * Math.sin(lx * 0.055));
  const du = -ly;
  return Math.min(d1, Math.max(dw, Math.max(db, du)));
}

// the bell: five flat bands lit from above, a burning rim, a thick ink outline
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const lxy = toLocal(x + 0.5, y + 0.5);
    const lx = lxy[0];
    const ly = lxy[1];
    if (lx < -A - 40 || lx > A + 40 || ly < -B - 40 || ly > SKIRT + 40) continue;
    const f = bellField(lx, ly);
    const cov = clamp(0.5 - f, 0, 1);
    if (cov <= 0) continue;
    if (f > -10) {
      const ocov = clamp(0.5 - (f + 10), 0, 1);
      const a = ocov * cov * 0.98;
      const i0 = (y * W + x) * 3;
      const ia = 1 - a;
      px[i0] = px[i0] * ia + INK[0] * a;
      px[i0 + 1] = px[i0 + 1] * ia + INK[1] * a;
      px[i0 + 2] = px[i0 + 2] * ia + INK[2] * a;
      if (f > 0) continue;
    }
    // lit from above: ice and cyan over the crown, deep violet down at the skirt
    const up = clamp(-ly / B, -0.4, 1);
    let col;
    if (up > 0.30) col = ICE;
    else if (up > 0.12) col = mix3(CYAN, ICE, (up - 0.12) / 0.18 * 0.6);
    else if (up > -0.02) col = CYAN;
    else if (up > -0.16) col = SKYBLUE;
    else if (up > -0.24) col = VIOLET;
    else col = DEEPVIO;
    // the rim it burns with, and a pale line just inside it
    if (f > -12) col = MAGENTA;
    else if (f > -19) col = ICE;
    else if (f > -31) col = VIOLET;
    const i = (y * W + x) * 3;
    px[i] = px[i] * (1 - cov) + col[0] * cov;
    px[i + 1] = px[i + 1] * (1 - cov) + col[1] * cov;
    px[i + 2] = px[i + 2] * (1 - cov) + col[2] * cov;
  }
}

// radial ribs in the shadowed part of the bell, like a real one
for (let i = 0; i < 21; i++) {
  const u = i / 10 - 1;
  const q0 = toWorld(u * A * 0.10, -B * 0.92);
  const q1 = toWorld(u * A * 0.90, SKIRT - 16);
  solidSegment(q0[0], q0[1], q1[0], q1[1], 6, CYAN[0], CYAN[1], CYAN[2], 0.16);
  solidSegment(q0[0], q0[1], q1[0], q1[1], 2.4, ICE[0], ICE[1], ICE[2], 0.16);
}
// the glow under the crown, where the light gathers
for (let i = 0; i < 3; i++) {
  const p = toWorld(-120 + i * 120, -B * 0.55 + 40);
  solidDot(p[0], p[1], 90, CYAN[0], CYAN[1], CYAN[2], 0.10);
}
// the specular sweep across the crown: wet glass
{
  let prev = null;
  for (let s = 0; s <= 46; s++) {
    const u = s / 46;
    const ang = Math.PI * 1.10 + u * Math.PI * 0.34;
    const p = toWorld(Math.cos(ang) * A * 0.86, Math.sin(ang) * B * 0.86);
    if (prev) {
      solidSegment(prev[0], prev[1], p[0], p[1], mix(4, 17, Math.sin(u * Math.PI)), ICE[0], ICE[1], ICE[2], 0.5);
    }
    prev = p;
  }
}
// the ruffled lip of the bell: a second scallop line inside the rim
for (let i = 0; i < 60; i++) {
  const p = toWorld((i / 59 - 0.5) * 2 * A * 0.9, SKIRT + 13 * Math.sin(((i / 59 - 0.5) * 2 * A * 0.9) * 0.055) - 12);
  solidDot(p[0], p[1], 12, ICE[0], ICE[1], ICE[2], 0.12);
}

// ---------------------------------------------------------------------------
// 3. tentacles: inked ribbons of light coming down out of the dark
// ---------------------------------------------------------------------------

const BANDS = [
  [CYAN, 0.0, 0.26],
  [SKYBLUE, 0.24, 0.50],
  [VIOLET, 0.48, 0.76],
  [MAGENTA, 0.74, 1.01],
];

const TENTACLES = [];
for (let i = 0; i < 13; i++) {
  const u = i / 6 - 1;
  const m = toWorld(u * A * 0.88, SKIRT - 26 + (i % 2) * 12);
  const back = i % 3 === 0;
  const len = 0.52 + ((i * 41) % 6) * 0.088;
  const j1 = (rnd() - 0.5) * 60;
  const j2 = (rnd() - 0.5) * 130;
  const j3 = (rnd() - 0.5) * 190;
  TENTACLES.push({
    p0: [m[0], m[1]],
    p1: [m[0] + u * 90 - 26 + j1, m[1] + 170 * len],
    p2: [m[0] + u * 130 + 34 + j2, m[1] + 380 * len],
    p3: [m[0] + u * 190 + 96 + j3, m[1] + 560 * len],
    back: back,
    seed: i,
    width: 30 - Math.abs(u) * 9,
  });
}

function drawTentacles(inFront) {
  for (const t of TENTACLES) {
    if (t.back === inFront) continue;
    const scale = inFront ? 1.0 : 0.78;
    const dim = inFront ? 1.0 : 0.60;
    const N = 280;
    const pts = [];
    for (let s = 0; s <= N; s++) pts.push(bezPt(t.p0, t.p1, t.p2, t.p3, s / N));
    const wAt = (u0) => (t.width * Math.pow(1 - u0, 0.45) + 6) * scale;
    for (let s = 0; s < N; s++) {
      const w = wAt(s / N);
      solidSegment(pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1], w + 4, INK[0], INK[1], INK[2], 1);
    }
    for (const band of BANDS) {
      const c = band[0];
      for (let s = 0; s < N; s++) {
        const u0 = s / N;
        if (u0 < band[1] || u0 >= band[2]) continue;
        const w = wAt(u0);
        solidSegment(pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1], w, c[0] * dim, c[1] * dim, c[2] * dim, 1);
      }
    }
    // a pale edge down one side: the light on the near face of the ribbon
    for (let s = 0; s < N; s++) {
      const u0 = s / N;
      if (u0 > 0.78) continue;
      const w = wAt(u0);
      const nx = pts[s + 1][1] - pts[s][1];
      const ny = -(pts[s + 1][0] - pts[s][0]);
      const l = Math.sqrt(nx * nx + ny * ny) || 1;
      const off = (s / N < 0.5 ? 1 : -1) * w * 0.5;
      solidSegment(
        pts[s][0] + (nx / l) * off,
        pts[s][1] + (ny / l) * off,
        pts[s + 1][0] + (nx / l) * off,
        pts[s + 1][1] + (ny / l) * off,
        w * 0.22,
        ICE[0],
        ICE[1],
        ICE[2],
        0.55 * (inFront ? 1 : 0.45)
      );
    }
    // beads of light strung down the far half
    for (let s = 0; s < N; s += 30) {
      const u0 = s / N;
      if (u0 < 0.34) continue;
      solidDot(pts[s][0], pts[s][1], wAt(u0) * 0.26 + 1, ICE[0], ICE[1], ICE[2], 0.7 * dim);
    }
    // the tip thins to a point, with a filament trailing off it
    const tip = pts[N];
    const tan = [tip[0] - pts[N - 6][0], tip[1] - pts[N - 6][1]];
    const tl = Math.sqrt(tan[0] * tan[0] + tan[1] * tan[1]) || 1;
    solidDot(tip[0], tip[1], 3.6 * scale, MAGENTA[0], MAGENTA[1], MAGENTA[2], 1);
    for (let k = 1; k <= 4; k++) {
      const f = k / 4;
      solidDot(
        tip[0] + (tan[0] / tl) * 9 * k,
        tip[1] + (tan[1] / tl) * 9 * k,
        3.2 * scale * (1 - f) + 0.8,
        MAGENTA[0],
        MAGENTA[1],
        MAGENTA[2],
        0.7 * (1 - f) + 0.15
      );
    }
  }
}

// oral arms first, deepest of all: three ruffled ribbons straight down out of the bell
for (let i = 0; i < 3; i++) {
  const lx = -186 + i * 186;
  const q0 = toWorld(lx * 0.72, SKIRT - 46);
  const q1 = toWorld(lx * 1.0, 300);
  const q2 = toWorld(lx * 0.8 - 30, 520);
  const q3 = toWorld(lx * 0.5 - 60, 700);
  let prev = q0;
  for (let s = 1; s <= 110; s++) {
    const tt = s / 110;
    const p = bezPt(q0, q1, q2, q3, tt);
    const w = 30 * Math.pow(1 - tt, 0.55) + 7;
    solidSegment(prev[0], prev[1], p[0], p[1], w + 4, INK[0], INK[1], INK[2], 1);
    const col = mix3(VIOLET, MAGENTA, tt);
    solidSegment(prev[0], prev[1], p[0], p[1], w, col[0] * 0.72, col[1] * 0.72, col[2] * 0.72, 1);
    prev = p;
  }
}

drawTentacles(false);

drawTentacles(true);

// water still coming off the rim, falling in thin even streams
for (let i = 0; i < 11; i++) {
  const lx = (i / 5 - 1) * A * 0.92;
  const m = toWorld(lx, SKIRT + 13 * Math.sin(lx * 0.055) - 6);
  const len = 120 + rnd() * 150 + (i % 4 === 0 ? 170 : 0);
  const drift = 24 + rnd() * 30;
  // a slightly wavering stream, fat at the lip and thin where it lets go
  let prev = m;
  for (let k = 1; k <= 6; k++) {
    const t = k / 6;
    const p = [m[0] + drift * t * t, m[1] + len * t];
    solidSegment(prev[0], prev[1], p[0], p[1], 4.6 * (1 - t * 0.6), FOAM[0], FOAM[1], FOAM[2], 0.42);
    solidSegment(prev[0], prev[1], p[0], p[1], 1.8 * (1 - t * 0.6), ICE[0], ICE[1], ICE[2], 0.6);
    prev = p;
  }
  solidDot(prev[0], prev[1], 4.0, FOAM[0], FOAM[1], FOAM[2], 0.85);
  solidDot(prev[0], prev[1] + 9, 2.4, FOAM[0], FOAM[1], FOAM[2], 0.55);
}
// droplets shaken loose on the way up
for (let i = 0; i < 46; i++) {
  const a = rnd() * Math.PI * 2;
  const rad = 130 + rnd() * 500;
  const x = CX + Math.cos(a) * rad;
  const y = 250 + rnd() * 430;
  const s = 1.4 + rnd() * 4.2;
  solidDot(x, y, s, FOAM[0], FOAM[1], FOAM[2], 0.28 + rnd() * 0.5);
}

// ---------------------------------------------------------------------------
// 4. the water: flat bands, hard crest lines, the hole it came through
// ---------------------------------------------------------------------------

solidSegment(0, HORIZON, W, HORIZON, 8, FOAM[0], FOAM[1], FOAM[2], 0.75);
solidSegment(0, HORIZON + 11, W, HORIZON + 11, 3, CYAN[0], CYAN[1], CYAN[2], 0.40);
for (let k = 1; k < 6; k++) {
  const yk = HORIZON + 34 + k * k * 9 + k * 27;
  if (yk > H - 12) break;
  let prev = null;
  for (let x = 0; x <= W; x += 24) {
    const y = yk + (2.6 + k * 1.5) * Math.sin(x * (0.005 + k * 0.0015) + k * 2.1);
    if (prev) {
      const near = clamp(1 - Math.abs(x - CX) / 700, 0, 1);
      const a = (0.05 + 0.26 * near) * (1 - k / 9) + 0.03;
      solidSegment(prev[0], prev[1], x, y, 1.7 + k * 0.3, ICE[0], ICE[1], ICE[2], a);
    }
    prev = [x, y];
  }
}
// where the light lands: a flat pool of it on the water under the creature
for (let y = HORIZON + 2; y < HORIZON + 92; y += 4) {
  const u = (y - (HORIZON + 2)) / 90;
  const hw = 302 * Math.sqrt(Math.max(0, 1 - u * u));
  solidSegment(CX - hw, y, CX + hw, y, 2.2, CYAN[0], CYAN[1], CYAN[2], 0.11);
}
for (let y = HORIZON + 4; y < HORIZON + 70; y += 4) {
  const u = (y - (HORIZON + 4)) / 66;
  const hw = 168 * Math.sqrt(Math.max(0, 1 - u * u));
  solidSegment(CX - hw, y, CX + hw, y, 2.2, ICE[0], ICE[1], ICE[2], 0.09);
}
// the dark hole where it tore through, ringed with foam and spray
for (let i = 0; i < 2; i++) {
  const s = i ? 0.66 : 1.0;
  let prev = null;
  for (let k = 0; k <= 100; k++) {
    const a = Math.PI + (k / 100) * Math.PI;
    const p = [CX + Math.cos(a) * 206 * s, HORIZON + 4 + Math.sin(a) * 30 * s];
    if (prev) {
      solidSegment(prev[0], prev[1], p[0], p[1], i ? 3 : 6, FOAM[0], FOAM[1], FOAM[2], i ? 0.45 : 0.8);
    }
    prev = p;
  }
}
for (let i = 0; i < 90; i++) {
  const a = -Math.PI * 0.99 + rnd() * Math.PI * 0.98;
  const rad = 150 + rnd() * 190;
  const x = CX + Math.cos(a) * rad;
  const y = HORIZON + Math.sin(a) * 30 - rnd() * 130;
  solidDot(x, y, 1.6 + rnd() * 4.4, FOAM[0], FOAM[1], FOAM[2], 0.22 + rnd() * 0.55);
}

// ---------------------------------------------------------------------------
// 5. the boat: one small silhouette, so the scale lands
// ---------------------------------------------------------------------------

const BX = 92;
const BY = 930;

// the hull, with a raised bow and a swell under it
for (let i = 0; i <= 100; i++) {
  const t = i / 100;
  const x = BX + t * 196;
  const y = BY - Math.sin(t * 0.75) * 18 + Math.sin(t * 6.2) * 2.4 - Math.pow(t, 5) * 16;
  solidSegment(x, y, x, y + 19, 11, INK[0], INK[1], INK[2], 1);
}
// the lit edge along the gunwale, catching the light off the water
for (let i = 0; i <= 50; i++) {
  const t = i / 50;
  const x = BX + 10 + t * 130;
  const y = BY - Math.sin((0.08 + t * 0.72) * 0.75) * 18 - Math.pow(0.08 + t * 0.72, 5) * 16;
  solidSegment(x, y - 1, x, y + 2, 3.4, FOAM[0], FOAM[1], FOAM[2], 0.5);
}
// the mast, the main sail, and the jib out to the bow: a boat, at a glance
const SAIL = [0.052, 0.062, 0.145];
solidSegment(BX + 84, BY - 16, BX + 82, BY - 196, 4, INK[0], INK[1], INK[2], 1);
solidSegment(BX + 4, BY - 24, BX + 82, BY - 194, 2.4, INK[0], INK[1], INK[2], 1);
for (let i = 0; i <= 74; i++) {
  const t = i / 74;
  const y = BY - 24 - t * 168;
  const w = Math.pow(t, 0.75) * 104 + 6;
  solidSegment(BX + 86, y, BX + 86 + w, y + (1 - t) * 8, 3.6, SAIL[0], SAIL[1], SAIL[2], 1);
}
for (let i = 0; i <= 60; i++) {
  const t = i / 60;
  const y = BY - 30 - t * 150;
  const x0 = 82 - t * 74;
  solidSegment(BX + 78, y, BX + x0 + 6, y, 3.0, SAIL[0], SAIL[1], SAIL[2], 1);
}
// the mast and the leech of the mainsail, lit from the creature above
for (let i = 0; i <= 74; i++) {
  const t = i / 74;
  const y = BY - 24 - t * 168;
  const w = Math.pow(t, 0.75) * 104 + 6;
  solidSegment(BX + 86 + w, y + (1 - t) * 8, BX + 86 + w, y + (1 - t) * 8 + 3, 1.6, ICE[0], ICE[1], ICE[2], 0.4);
}
// a thin pennant streaming off the masthead
for (let k = 0; k < 3; k++) {
  const f = k / 3;
  const y0 = BY - 200 + f * 16;
  solidSegment(BX + 82, y0, BX + 82 + 34 - f * 12, y0 + 12 + f * 6, 3.2 - f * 1.6, MAGENTA[0], MAGENTA[1], MAGENTA[2], 0.9);
}
// the lantern at the stern, and the warm water under it
solidDot(BX + 18, BY - 34, 34, AMBER[0], AMBER[1], AMBER[2], 0.16);
solidDot(BX + 18, BY - 34, 18, AMBER[0], AMBER[1], AMBER[2], 0.30);
solidDot(BX + 18, BY - 34, 8, ICE[0], ICE[1], ICE[2], 1);
for (let s = 0; s < 20; s++) {
  const t = s / 20;
  const y = BY + 34 + t * 84;
  const w = 28 - t * 16;
  solidSegment(BX - 20 - w + Math.sin(t * 7) * 7, y, BX + 18 + w + Math.sin(t * 7) * 7, y, 7, AMBER[0], AMBER[1], AMBER[2], 0.15 * (1 - t * 0.8));
}
// her reflection, and the V of her wake running off to the right
for (let i = 0; i < 14; i++) {
  const t = i / 14;
  const x = BX + 10 + t * 180;
  const y = BY + 26 + t * 26;
  solidSegment(x, y, x + 14, y, 6 - t * 3, INK[0], INK[1], INK[2], 0.35 * (1 - t * 0.6));
}
for (const dir of [1, -1]) {
  for (let i = 0; i < 26; i++) {
    const t = i / 26;
    const x = BX + 198 + t * 82;
    const y = BY + 12 + t * 44 + dir * t * 30;
    solidSegment(x, y, x + 34, y + dir * 10, 2.4 - t * 1.5, FOAM[0], FOAM[1], FOAM[2], 0.22 * (1 - t * 0.8));
  }
}

// ---------------------------------------------------------------------------
// 6. tone map, dither, and a hand-rolled PNG writer
// ---------------------------------------------------------------------------

const BAYER = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

const raw = Buffer.alloc(W * H * 3 + H);
let rawPos = 0;
for (let y = 0; y < H; y++) {
  raw[rawPos++] = 0; // filter byte; the encoder picks a real filter per row
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3;
    for (let c = 0; c < 3; c++) {
      let v = px[i + c];
      v = v < 0 ? 0 : v > 1 ? 1 : v;
      v = Math.pow(v, 0.92);
      const d = (BAYER[y & 7][x & 7] / 64 - 0.5) / 255;
      raw[rawPos++] = clamp(Math.round((v + d) * 255), 0, 255);
    }
  }
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

const stride = W * 3;
const filtered = Buffer.alloc(H * (stride + 1));
let outPos = 0;
const cand = [
  Buffer.alloc(stride),
  Buffer.alloc(stride),
  Buffer.alloc(stride),
  Buffer.alloc(stride),
  Buffer.alloc(stride),
];
for (let y = 0; y < H; y++) {
  const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
  const up = y > 0 ? raw.subarray((y - 1) * (stride + 1) + 1, y * (stride + 1)) : null;
  for (let x = 0; x < stride; x++) {
    const a = x >= 3 ? row[x - 3] : 0;
    const b = up ? up[x] : 0;
    const c = up && x >= 3 ? up[x - 3] : 0;
    cand[0][x] = row[x];
    cand[1][x] = (row[x] - a) & 0xff;
    cand[2][x] = (row[x] - b) & 0xff;
    cand[3][x] = (row[x] - ((a + b) >> 1)) & 0xff;
    cand[4][x] = (row[x] - paeth(a, b, c)) & 0xff;
  }
  let best = 0;
  let bestCost = Infinity;
  for (let f = 0; f < 5; f++) {
    let cost = 0;
    const buf = cand[f];
    for (let x = 0; x < stride; x++) {
      const s = buf[x] > 127 ? 256 - buf[x] : buf[x];
      cost += s;
      if (cost >= bestCost) break;
    }
    if (cost < bestCost) {
      bestCost = cost;
      best = f;
    }
  }
  filtered[outPos++] = best;
  cand[best].copy(filtered, outPos);
  outPos += stride;
}

let crcTable = null;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // truecolour RGB
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(filtered, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'entry.png');
writeFileSync(outPath, png);
console.log('wrote ' + outPath + ' ' + png.length + ' bytes ' + W + 'x' + H);
