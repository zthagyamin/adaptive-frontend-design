import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Unit-test the real audit functions without loading a browser or creating a
// WebGL context. These mocks test arithmetic/source/ordering contracts only.
const url = new URL('../effects/runtime.mjs', import.meta.url);
const source = (await readFile(url, 'utf8'))
  .replace("import * as THREE from '/vendor/three.module.js';", 'const THREE = {};')
  .replace("from './lifecycle.mjs'", `from '${new URL('../effects/lifecycle.mjs', import.meta.url).href}'`);
const { summarizeSamples, createRendererAudit, disposeOwnedResources } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

function fixture() {
  const renderer = { info: { memory: { geometries: 7, textures: 3 }, render: { calls: 4, triangles: 5120, points: 4200 } }, domElement: { width: 1200, height: 800 }, getPixelRatio: () => 1.5 };
  let now = 0;
  const audit = createRendererAudit(renderer, { clock: () => now, capacity: 3 });
  return { renderer, audit, clock: value => { now = value; } };
}

test('empty timing windows are explicitly not sampled', () => {
  assert.equal(summarizeSamples([]), null);
  const { audit } = fixture();
  assert.equal(audit.snapshot().interval, null);
  assert.equal(audit.snapshot().cpu, null);
  assert.equal(audit.snapshot().totalSampledFrames, 0);
});
test('resource and draw values are read from the current renderer.info', () => {
  const { renderer, audit } = fixture();
  const first = audit.snapshot();
  assert.equal(first.geometries, 7); assert.equal(first.lastRenderPoints, 4200);
  renderer.info.memory.geometries = 2;
  renderer.info.memory.textures = 0;
  renderer.info.render.calls = 9;
  renderer.domElement.width = 600;
  const second = audit.snapshot();
  assert.equal(second.geometries, 2); assert.equal(second.textures, 0); assert.equal(second.lastRenderCalls, 9);
  assert.equal(second.drawingBufferWidth, 600); assert.equal(first.geometries, 7, 'earlier snapshot remains immutable');
});
test('raw frame intervals retain a long frame and omit idle/re-entry gaps', () => {
  const { audit, clock } = fixture();
  clock(10); audit.beginFrame(100); clock(13); audit.finishFrame();
  clock(20); audit.beginFrame(160); clock(25); audit.finishFrame();
  assert.equal(audit.snapshot().interval.meanMs, 60, 'not replaced by capped simulation dt');
  audit.breakSequence();
  clock(500); audit.beginFrame(60000); clock(502); audit.finishFrame();
  const result = audit.snapshot();
  assert.equal(result.interval.samples, 1); assert.equal(result.interval.maxMs, 60);
  assert.equal(result.cpu.samples, 3); assert.equal(result.cpu.maxMs, 5);
  assert.equal(result.totalSampledFrames, 3);
});
test('sample windows stay bounded and statistics use the retained values', () => {
  const { audit, clock } = fixture();
  for (let i = 0; i < 5; i++) { clock(i * 10); audit.beginFrame(i * 16); clock(i * 10 + i + 1); audit.finishFrame(); }
  const result = audit.snapshot();
  assert.equal(result.cpu.samples, 3); assert.equal(result.cpu.meanMs, 4); assert.equal(result.cpu.p95Ms, 5);
  assert.equal(result.totalSampledFrames, 5); assert.equal(result.interval.samples, 3);
});
test('disposal deduplicates shared geometry and finishes before final inspection', () => {
  const calls = [];
  const geometry = { dispose() { calls.push('geometry'); } };
  const material = { dispose() { calls.push('material'); } };
  const scene = { traverse(fn) { fn({ geometry, material }); fn({ geometry, material: [material] }); } };
  const renderer = { dispose() { calls.push('renderer'); }, forceContextLoss() { calls.push('context'); } };
  disposeOwnedResources(scene, renderer);
  calls.push('inspect renderer.info');
  assert.deepEqual(calls, ['geometry', 'material', 'renderer', 'context', 'inspect renderer.info']);
});
