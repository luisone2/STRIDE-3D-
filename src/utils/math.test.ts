import test from 'node:test';
import assert from 'node:assert/strict';
import { FLAVORS, BITS, BH, getSpriteCrop, mod5 } from '../data/flavors';
import {
  computeVertexZ,
  computeArcSlot,
  computeInsideScrollState,
  createStormPieceSpecs,
  computeStormPieceTransform,
  solveCubicBezier,
  computeCameraParams,
  mixWithInk,
} from './math';

test('FLAVORS and BITS match exact specification', () => {
  assert.equal(FLAVORS.length, 5);
  assert.equal(FLAVORS[0].name, 'Peanut Cocoa');
  assert.equal(FLAVORS[1].name, 'Berry Oat');
  assert.equal(FLAVORS[1].color, '#ab9ac4');
  assert.equal(FLAVORS[2].name, 'Salted Caramel');
  assert.equal(FLAVORS[3].name, 'Mint Chip');
  assert.equal(FLAVORS[4].name, 'Strawberry');
  assert.equal(BITS.length, 5);
  assert.ok(Math.abs(BH - 857 / 411) < 1e-6);
});

test('mod5 wraps negative and positive indices into 0..4', () => {
  assert.equal(mod5(0), 0);
  assert.equal(mod5(1), 1);
  assert.equal(mod5(5), 0);
  assert.equal(mod5(-1), 4);
  assert.equal(mod5(-6), 4);
});

test('getSpriteCrop applies padding for wrappers and zero padding for bits', () => {
  const wrapperCrop = getSpriteCrop(FLAVORS[0].box, 4);
  assert.ok(wrapperCrop.backgroundSize.includes('654.0146%'));
  const bitCrop = getSpriteCrop(BITS[0], 0);
  assert.ok(bitCrop.backgroundSize.includes('790.5882%'));
});

test('computeVertexZ differentiates crimp band vs pillow body', () => {
  const zCrimp = computeVertexZ(0.5, 0.02);
  assert.ok(zCrimp >= 0.006 && zCrimp <= 0.012);

  const zCenter = computeVertexZ(0.5, 0.5);
  assert.ok(zCenter > 0.12 && zCenter < 0.14);

  const zEdge = computeVertexZ(0, 0.5);
  assert.ok(Math.abs(zEdge - 0.012) < 1e-6);
});

test('computeArcSlot interpolates slot positions, angles, depth, and opacity fade', () => {
  const s0 = computeArcSlot(0, 1, 1);
  assert.equal(s0.dx, 0);
  assert.equal(s0.dy, 0);
  assert.equal(s0.h, 430);
  assert.equal(s0.rz, 0);
  assert.equal(s0.ry, 0);
  assert.equal(s0.z, 0);
  assert.equal(s0.op, 1);

  const s1 = computeArcSlot(1, 1, 1);
  assert.equal(s1.dx, 245);
  assert.equal(s1.dy, 24);
  assert.equal(s1.h, 330);
  assert.equal(s1.rz, 4);
  assert.equal(s1.ry, 16);
  assert.equal(s1.z, -34);

  const sNeg1 = computeArcSlot(-1, 1, 1);
  assert.equal(sNeg1.dx, -245);
  assert.equal(sNeg1.rz, -4);
  assert.equal(sNeg1.ry, -16);

  const sFadeMid = computeArcSlot(3.6, 1, 1);
  assert.ok(Math.abs(sFadeMid.op - 0.5) < 1e-6);

  const sFadeOut = computeArcSlot(4.0, 1, 1);
  assert.equal(sFadeOut.op, 0);
});

test('computeInsideScrollState maps scroll progress p to steps 0..3 and storm q', () => {
  const vh = 900;
  const sh = 4500;
  const st0 = computeInsideScrollState(0, 4500, sh, vh);
  assert.equal(st0.p, 0);
  assert.equal(st0.step, 0);
  assert.equal(st0.q, 0);
  assert.equal(st0.pinY, 0);

  const st1 = computeInsideScrollState(-900, 3600, sh, vh);
  assert.equal(st1.p, 0.25);
  assert.equal(st1.step, 1);
  assert.equal(st1.q, 0);

  const stStorm = computeInsideScrollState(-3168, 4500 - 3168, sh, vh);
  assert.ok(Math.abs(stStorm.p - 0.88) < 1e-5);
  assert.equal(stStorm.step, 3);
  assert.ok(Math.abs(stStorm.q - 0.5) < 1e-5);
});

test('storm pieces has 70% selected bit and flies out in a single wave', () => {
  const specs = createStormPieceSpecs();
  assert.equal(specs.length, 20);
  assert.equal(specs.filter((s) => s.useSelectedBit).length, 14);

  const hiddenStart = computeStormPieceTransform(specs[0], 0, 1440, 900);
  assert.equal(hiddenStart.visible, false);

  const midWave = computeStormPieceTransform(specs[0], 0.3, 1440, 900);
  assert.equal(midWave.visible, true);
  assert.ok(midWave.op > 0);

  const hiddenEnd = computeStormPieceTransform(specs[0], 1, 1440, 900);
  assert.equal(hiddenEnd.visible, false);
});

test('solveCubicBezier and computeCameraParams work accurately', () => {
  assert.equal(solveCubicBezier(0.25, 0.75, 0.2, 1, 0), 0);
  assert.equal(solveCubicBezier(0.25, 0.75, 0.2, 1, 1), 1);
  const mid = solveCubicBezier(0.25, 0.75, 0.2, 1, 0.2);
  assert.ok(mid > 0.45, 'Fast start reaches half distance around 20% time');

  const cam = computeCameraParams(1440, 900);
  assert.equal(cam.D, 1500);
  assert.ok(cam.fovDeg > 30 && cam.fovDeg < 35);
  assert.equal(mixWithInk('#ab9ac4', 0.78), 'rgb(59, 54, 67)');
});
