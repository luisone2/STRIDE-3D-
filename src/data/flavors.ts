export const SHEET_URL =
  'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261116_132032_30242d8c-5062-4d60-8a3d-238f0a2ff788.png&w=2200&q=85';

export const INTRO_VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261116_131908_b6239896-c077-450c-ad91-575153973fcf.mp4';

export const SW = 2688;
export const SH = 1520;
export const BH = (849 + 8) / (403 + 8); // ~2.085158

export type Box = [number, number, number, number];

export interface Flavor {
  index: number;
  name: string;
  lines: [string, string];
  box: Box;
  color: string;
  bit: number;
  ingredients: string;
}

export const FLAVORS: Flavor[] = [
  {
    index: 0,
    name: 'Peanut Cocoa',
    lines: ['PEANUT', 'COCOA'],
    box: [98, 145, 403, 849],
    color: '#b79474',
    bit: 1,
    ingredients: 'Peanuts, oats, dates, cocoa, pea protein, sea salt.',
  },
  {
    index: 1,
    name: 'Berry Oat',
    lines: ['BERRY', 'OAT'],
    box: [620, 145, 402, 849],
    color: '#ab9ac4',
    bit: 0,
    ingredients: 'Oats, blueberries, raspberries, dates, pea protein, almonds.',
  },
  {
    index: 2,
    name: 'Salted Caramel',
    lines: ['SALTED', 'CARAMEL'],
    box: [1137, 145, 402, 849],
    color: '#d1ad6c',
    bit: 2,
    ingredients: 'Dates, cashews, oats, pea protein, sea salt, vanilla.',
  },
  {
    index: 3,
    name: 'Mint Chip',
    lines: ['MINT', 'CHIP'],
    box: [1661, 145, 402, 849],
    color: '#94bdb4',
    bit: 3,
    ingredients: 'Oats, dark chocolate, almonds, pea protein, peppermint oil.',
  },
  {
    index: 4,
    name: 'Strawberry',
    lines: ['STRAW', 'BERRY'],
    box: [2184, 145, 403, 849],
    color: '#d396a7',
    bit: 4,
    ingredients: 'Oats, strawberries, dates, cashews, pea protein, lemon.',
  },
];

export const BITS: Box[] = [
  [650, 1090, 340, 305], // 0: blueberries and raspberry
  [110, 1125, 280, 255], // 1: chocolate chunks and peanuts
  [1175, 1110, 320, 285], // 2: salted caramel cube
  [1680, 1085, 380, 305], // 3: mint leaves and dark chocolate
  [2280, 1095, 250, 295], // 4: half strawberry
];

export interface HeroBitSpec {
  x: number;
  y: number;
  size: number;
  rot: number;
  bit: number;
  hideOnPhone?: boolean;
}

export const HERO_BITS: HeroBitSpec[] = [
  { x: 0.12, y: 0.2, size: 120, rot: -18, bit: 0 },
  { x: 0.86, y: 0.18, size: 96, rot: 22, bit: 2, hideOnPhone: true },
  { x: 0.07, y: 0.74, size: 84, rot: 12, bit: 3 },
  { x: 0.655, y: 0.15, size: 78, rot: -10, bit: 4, hideOnPhone: true },
  { x: 0.205, y: 0.885, size: 70, rot: 30, bit: 1, hideOnPhone: true },
];

export interface InsideStepSpec {
  num: string;
  headLines: string[];
  captionLines: [string, string];
  ry: number;
}

export const INSIDE_STEPS: InsideStepSpec[] = [
  {
    num: '01',
    headLines: ['REAL FOOD,', 'FIRST'],
    captionLines: ['Oats, nuts, fruit.', "Nothing you can't say."],
    ry: 0,
  },
  {
    num: '02',
    headLines: ['PRESSED,', 'NOT BAKED'],
    captionLines: ['Real ingredients.', 'Clean energy.'],
    ry: 180,
  },
  {
    num: '03',
    headLines: ['WRAPPED', 'SAME DAY'],
    captionLines: ['Cold-pressed at dawn.', 'Sealed by noon.'],
    ry: 360,
  },
  {
    num: '04',
    headLines: [], // filled dynamically from selected flavour's name, one word per line
    captionLines: ['12g plant protein.', 'No crash.'],
    ry: 720,
  },
];

export function mod5(n: number): number {
  return ((n % 5) + 5) % 5;
}

export function getSpriteCrop(box: Box, pad = 0): { backgroundSize: string; backgroundPosition: string } {
  const x = box[0] - pad;
  const y = box[1] - pad;
  const w = box[2] + 2 * pad;
  const h = box[3] + 2 * pad;
  const bgSizeX = (SW / w) * 100;
  const bgSizeY = (SH / h) * 100;
  const bgPosX = (x / (SW - w)) * 100;
  const bgPosY = (y / (SH - h)) * 100;
  return {
    backgroundSize: `${bgSizeX.toFixed(4)}% ${bgSizeY.toFixed(4)}%`,
    backgroundPosition: `${bgPosX.toFixed(4)}% ${bgPosY.toFixed(4)}%`,
  };
}
