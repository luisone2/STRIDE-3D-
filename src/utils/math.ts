import { BH } from '../data/flavors';

export function clamp(val: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, val));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeInOutSine(t: number): number {
  const c = clamp(t, 0, 1);
  return -(Math.cos(Math.PI * c) - 1) / 2;
}

/**
 * Solves a CSS cubic-bezier(x1, y1, x2, y2) at progress x in [0, 1].
 */
export function solveCubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x: number
): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const sampleCurveX = (t: number) =>
    ((1 - 3 * x2 + 3 * x1) * t * t * t) +
    ((3 * x2 - 6 * x1) * t * t) +
    (3 * x1 * t);

  const sampleCurveY = (t: number) =>
    ((1 - 3 * y2 + 3 * y1) * t * t * t) +
    ((3 * y2 - 6 * y1) * t * t) +
    (3 * y1 * t);

  const sampleCurveDerivativeX = (t: number) =>
    (3 * (1 - 3 * x2 + 3 * x1) * t * t) +
    (2 * (3 * x2 - 6 * x1) * t) +
    (3 * x1);

  let t2 = x;
  for (let i = 0; i < 8; i++) {
    const xEst = sampleCurveX(t2) - x;
    if (Math.abs(xEst) < 1e-6) break;
    const d = sampleCurveDerivativeX(t2);
    if (Math.abs(d) < 1e-6) break;
    t2 = t2 - xEst / d;
  }
  t2 = clamp(t2, 0, 1);
  return sampleCurveY(t2);
}

/**
 * Computes the Z displacement for a single vertex of the 3D bar wrapper plane
 * with plane UV (u, v) in [0, 1].
 */
export function computeVertexZ(u: number, v: number): number {
  const ex = Math.abs(2 * u - 1);
  const ev = Math.min(v, 1 - v);
  const CR = 0.062;

  if (ev < CR) {
    return 0.006 + 0.006 * Math.abs(Math.sin(u * Math.PI * 34));
  }

  const across = Math.pow(Math.max(0, 1 - Math.pow(ex, 2.6)), 0.62);
  const along = Math.pow(clamp((ev - CR) / 0.11, 0, 1), 0.7);
  return (
    0.012 +
    0.118 * across * along +
    0.004 * Math.sin(23 * u + 31 * v) * across
  );
}

export interface ArcSlot {
  dx: number;
  dy: number;
  h: number;
  rz: number;
  ry: number;
  z: number;
  op: number;
}

const ARC_TABLE = [
  { dx: 0, dy: 0, h: 430, rz: 0, ry: 0 },
  { dx: 245, dy: 24, h: 330, rz: 4, ry: 16 },
  { dx: 452, dy: 44, h: 312, rz: 8, ry: 26 },
  { dx: 660, dy: 80, h: 296, rz: 12, ry: 34 },
  { dx: 860, dy: 118, h: 280, rz: 15, ry: 40 },
];

/**
 * Computes the hero arc state for offset k from the centre.
 */
export function computeArcSlot(k: number, u: number, xSpread = 1): ArcSlot {
  const sign = k < 0 ? -1 : k > 0 ? 1 : 0;
  const absK = Math.min(4, Math.abs(k));
  const i0 = Math.min(3, Math.floor(absK));
  const i1 = i0 + 1;
  const frac = absK - i0;

  const s0 = ARC_TABLE[i0];
  const s1 = ARC_TABLE[i1];

  const dx = lerp(s0.dx, s1.dx, frac) * sign * u * xSpread;
  const dy = lerp(s0.dy, s1.dy, frac) * u;
  const h = lerp(s0.h, s1.h, frac) * u;
  const rz = lerp(s0.rz, s1.rz, frac) * sign;
  const ry = lerp(s0.ry, s1.ry, frac) * sign;
  const z = absK === 0 ? 0 : -absK * 34 * u;

  const rawAbs = Math.abs(k);
  let op = 1;
  if (rawAbs >= 3.9) {
    op = 0;
  } else if (rawAbs > 3.3) {
    op = 1 - (rawAbs - 3.3) / (3.9 - 3.3);
  }

  return { dx, dy, h, rz, ry, z, op };
}

export interface InsideScrollState {
  p: number;
  step: number;
  q: number;
  pinY: number;
  inView: boolean;
}

export function computeInsideScrollState(
  sectionTop: number,
  sectionBottom: number,
  sectionHeight: number,
  vh: number
): InsideScrollState {
  const denom = Math.max(1, sectionHeight - vh);
  const p = clamp(-sectionTop / denom, 0, 1);
  const step = Math.min(3, Math.max(0, Math.floor(Math.min(p, 0.759) / 0.19)));
  const q = clamp((p - 0.76) / 0.24, 0, 1);

  let pinY = 0;
  if (sectionTop > 0) {
    pinY = sectionTop;
  } else if (sectionBottom < vh) {
    pinY = sectionBottom - vh;
  } else {
    pinY = 0;
  }

  const inView = sectionBottom > 0 && sectionTop < vh;
  return { p, step, q, pinY, inView };
}

export interface StormPieceSpec {
  id: number;
  angle: number;
  ph: number;
  spin: number;
  sizeFactor: number;
  useSelectedBit: boolean;
  fallbackBit: number;
}

export function createStormPieceSpecs(): StormPieceSpec[] {
  let seed = 421337;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const pieces: StormPieceSpec[] = [];
  for (let i = 0; i < 20; i++) {
    const baseAngle =
      (i * 2.399963229728653 + (nextRand() - 0.5) * 0.45) % (Math.PI * 2);
    const ph = i / 20 + nextRand() * 0.03;
    const spin = (nextRand() > 0.5 ? 1 : -1) * 360;
    const sizeFactor = 0.7 + nextRand() * 0.7;
    const useSelectedBit = i < 14; // 70% of 20 = 14 pieces
    const fallbackBit = Math.floor(nextRand() * 5);
    pieces.push({
      id: i,
      angle: baseAngle,
      ph,
      spin,
      sizeFactor,
      useSelectedBit,
      fallbackBit,
    });
  }
  return pieces;
}

export interface StormPieceRender {
  visible: boolean;
  x: number;
  y: number;
  size: number;
  rot: number;
  op: number;
}

export function computeStormPieceTransform(
  piece: StormPieceSpec,
  q: number,
  vw: number,
  vh: number
): StormPieceRender {
  if (q <= 0 || q >= 1) {
    return { visible: false, x: 0, y: 0, size: 0, rot: 0, op: 0 };
  }
  const s = clamp((q - 0.45 * piece.ph) / 0.55, 0, 1);
  if (s <= 0 || s >= 1) {
    return { visible: false, x: 0, y: 0, size: 0, rot: 0, op: 0 };
  }
  const R = 0.55 * Math.hypot(vw, vh);
  const baseSize = 0.085 * Math.min(vw, vh) * piece.sizeFactor;
  const radius = (0.06 + Math.pow(s, 1.5) * 0.95) * R;
  const x = vw / 2 + Math.cos(piece.angle) * radius;
  const y = vh / 2 + Math.sin(piece.angle) * radius * 0.8;
  const size = (0.2 + 1.7 * s) * baseSize;
  const rot = piece.spin * s;
  const op = Math.sin(Math.PI * s) * clamp(5 * q, 0, 1) * clamp(6 * (1 - q), 0, 1);
  return { visible: op > 0.005, x, y, size, rot, op };
}

export interface BarScreenState {
  x: number;
  y: number;
  h: number;
  rz: number;
  ry: number;
  rx: number;
  z: number;
  op: number;
  sx: number;
  sy: number;
  shadow: number;
}

export function lerpBarState(
  a: BarScreenState,
  b: BarScreenState,
  t: number
): BarScreenState {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    h: lerp(a.h, b.h, t),
    rz: lerp(a.rz, b.rz, t),
    ry: lerp(a.ry, b.ry, t),
    rx: lerp(a.rx, b.rx, t),
    z: lerp(a.z, b.z, t),
    op: lerp(a.op, b.op, t),
    sx: lerp(a.sx, b.sx, t),
    sy: lerp(a.sy, b.sy, t),
    shadow: lerp(a.shadow, b.shadow, t),
  };
}

/**
 * Mixes a hex color 78% toward #1c1a1f for the nutrition panel ink color.
 */
export function mixWithInk(hex: string, inkWeight = 0.78): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const ir = 0x1c;
  const ig = 0x1a;
  const ib = 0x1f;
  const mr = Math.round(r * (1 - inkWeight) + ir * inkWeight);
  const mg = Math.round(g * (1 - inkWeight) + ig * inkWeight);
  const mb = Math.round(b * (1 - inkWeight) + ib * inkWeight);
  return `rgb(${mr}, ${mg}, ${mb})`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function computeCameraParams(vw: number, vh: number) {
  const D = clamp(1500 * Math.min(vw / 1440, vh / 900), 1000, 2200);
  const fovRad = 2 * Math.atan(vh / 2 / D);
  const fovDeg = (fovRad * 180) / Math.PI;
  return { D, fovDeg, near: 10, far: 4 * D, bh: BH };
}
