import test from 'node:test';
import assert from 'node:assert/strict';
import { clamp, chapterAt, influence, springStep, makeParticles, stepParticles, staticParticles } from '../effects/math.mjs';

test('chapter identity is deterministic while reversing and at boundaries', () => {
  assert.deepEqual([0, .32, 1 / 3, .65, 2 / 3, 1, .4, .1].map(chapterAt), [0, 0, 1, 1, 2, 2, 1, 0]);
  assert.equal(clamp(-5), 0); assert.equal(clamp(5), 1);
});
test('surface locality and release converge without resetting velocity', () => {
  assert.equal(influence(0, 0, 0, 0, .8), 1);
  assert.ok(influence(3, 3, 0, 0, .8) < .00001);
  let p = 0, v = 0;
  for (let i = 0; i < 10; i++) [p, v] = springStep(p, v, 1, 1 / 60);
  assert.ok(p > .4 && v > 0);
  const before = p; [p, v] = springStep(p, v, 0, 1 / 60);
  assert.ok(p > before, 'release retains recent positive velocity before braking');
  for (let i = 0; i < 600; i++) [p, v] = springStep(p, v, 0, 1 / 60);
  assert.ok(Math.abs(p) < 1e-6 && Math.abs(v) < 1e-6);
});
test('reversing the surface target remains finite even after a long frame', () => {
  let p = 1, v = 4;
  for (let i = 0; i < 120; i++) [p, v] = springStep(p, v, -1, i === 0 ? 120 : 1 / 60);
  assert.ok(Number.isFinite(p) && Number.isFinite(v)); assert.ok(Math.abs(p + 1) < .001);
});
test('particle seeds are repeatable; input affects a local neighborhood', () => {
  const a = makeParticles(1200), b = makeParticles(1200); assert.deepEqual(a.positions, b.positions);
  const active = { active: true, x: 0, y: 0, vx: 8, vy: -2, swirl: 0 };
  stepParticles(a, active, 1 / 60);
  let near = 0, far = 0, nearCount = 0, farCount = 0;
  for (let i = 0; i < a.rest.length; i += 3) {
    const r = Math.hypot(a.rest[i], a.rest[i + 1]);
    if (r < .7) { near += Math.abs(a.velocities[i]); nearCount++; }
    if (r > 3) { far += Math.abs(a.velocities[i]); farCount++; }
  }
  assert.ok(nearCount > 0 && farCount > 0); assert.ok(near / nearCount > far / farCount * 20);
});
test('particle release dissipates energy and returns to the original field', () => {
  const state = makeParticles(1200), input = { active: true, x: .4, y: -.2, vx: 6, vy: 1, swirl: 8 };
  for (let i = 0; i < 25; i++) stepParticles(state, input, 1 / 60);
  input.active = false;
  const initial = stepParticles(state, input, 1 / 60);
  let energy;
  for (let i = 0; i < 1200; i++) energy = stepParticles(state, input, 1 / 60);
  assert.ok(initial > .1); assert.ok(energy < .00001);
  assert.ok(state.positions.every(Number.isFinite));
});
test('reduced motion still computes a local disturbance and restores exactly', () => {
  const state = makeParticles(1200); staticParticles(state, .2, .3, 1);
  assert.ok(state.positions.some((n, i) => Math.abs(n - state.rest[i]) > .05));
  assert.ok(state.velocities.every(n => n === 0));
  staticParticles(state, .2, .3, 0); assert.deepEqual(state.positions, state.rest);
});
