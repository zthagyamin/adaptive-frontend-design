import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// CPU geometry and event-state regression. No browser, WebGL, or visual claim.
const engine = new URL('../../migration-field-guide/vendor/three.module.js', import.meta.url).href;
const lifecycle = new URL('../effects/lifecycle.mjs', import.meta.url).href;
const stubSource = `
export * as THREE from '${engine}';
export { scope } from '${lifecycle}';
export const harness = {};
export function heading() { return ''; }
export function unavailable() { throw Error('Unexpected WebGL fallback in CPU state test'); }
export function createStage(wrap, life, options) { harness.options = options; life.add(() => harness.disposed = true); return harness.stage; }
export function captureController(canvas, life, handlers) { harness.handlers = handlers; return reason => handlers.end(reason); }
`;
const stubURL = 'data:text/javascript;base64,' + Buffer.from(stubSource).toString('base64');
const { harness, THREE } = await import(stubURL);
const source = (await readFile(new URL('../effects/surface.mjs', import.meta.url), 'utf8'))
  .replace("from './runtime.mjs'", `from '${stubURL}'`)
  .replace("from './math.mjs'", `from '${new URL('../effects/math.mjs', import.meta.url).href}'`);
const { createEffect } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const particleSource = (await readFile(new URL('../effects/particles.mjs', import.meta.url), 'utf8'))
  .replace("from './runtime.mjs'", `from '${stubURL}'`)
  .replace("from './math.mjs'", `from '${new URL('../effects/math.mjs', import.meta.url).href}'`);
const { createEffect: createParticles } = await import('data:text/javascript;base64,' + Buffer.from(particleSource).toString('base64'));
class Element extends EventTarget {
  constructor(value = '') { super(); this.value = value; this.attributes = new Map(); this.textContent = ''; }
  setAttribute(name, value) { this.attributes.set(name, value); }
  getAttribute(name) { return this.attributes.get(name); }
}
function setup(kind = 'surface') {
  const nodes = new Map();
  for (const selector of ['.canvas-wrap', '.status', '[data-hold]', '[data-anchor-x]', '[data-anchor-y]', '[data-lift]', '[data-x]', '[data-y]', '[data-depth]', '[data-release]', '[data-reset]', '[data-quality]', '[data-strength]', '[data-strength-value]', '[data-count]', '[data-push]', '[data-swirl]', '[data-let-go]']) nodes.set(selector, new Element());
  nodes.get('[data-anchor-x]').value = nodes.get('[data-anchor-y]').value = '0'; nodes.get('[data-lift]').value = '1';
  nodes.get('[data-quality]').value = 'high'; nodes.get('[data-strength]').value = '1';
  const host = { set innerHTML(value) {}, querySelector: selector => nodes.get(selector), querySelectorAll: () => [], replaceChildren() {} };
  const events = [];
  harness.stage = { scene: new THREE.Scene(), canvas: new Element(), renderer: { setPixelRatio() {} }, render() {}, resize() {}, wake() {}, recordInputEvent(reason, detail) { events.push({ reason, ...detail }); }, point: () => ({ x: .2, y: .3 }) };
  const effect = (kind === 'surface' ? createEffect : createParticles)({ host, reducedMotion: false });
  return { nodes, effect, stage: harness.stage, options: harness.options, handlers: harness.handlers, events };
}
test('DOM Hold remains held after a canvas resize notification', () => {
  const h = setup();
  h.nodes.get('[data-hold]').dispatchEvent(new Event('click'));
  assert.equal(h.nodes.get('[data-hold]').getAttribute('aria-pressed'), 'true');
  h.options.onResize();
  assert.equal(h.nodes.get('[data-hold]').getAttribute('aria-pressed'), 'true', 'layout resize must not revoke DOM hold intent');
  for (let i = 0; i < 60; i++) h.options.onFrame(1 / 60);
  const position = h.stage.scene.children[0].geometry.attributes.position;
  assert.ok(Array.from(position.array).some((value, i) => i % 3 === 2 && value > .5), 'the actual CPU mesh target remains lifted');
  h.effect.destroy();
});
function key(target, value) { const event = new Event('keydown', { cancelable: true }); Object.defineProperty(event, 'key', { value }); target.dispatchEvent(event); }
test('keyboard surface hold survives resize, while window blur still cancels it', () => {
  const h = setup(); key(h.stage.canvas, 'ArrowRight'); h.options.onResize(); h.handlers.end('pointerleave');
  assert.equal(h.nodes.get('[data-hold]').getAttribute('aria-pressed'), 'true');
  h.options.onSuspend('window-blur');
  assert.equal(h.nodes.get('[data-hold]').getAttribute('aria-pressed'), 'false'); h.effect.destroy();
});
test('a real pointer gesture is cancelled by resize and DOM hold by offscreen', () => {
  const h = setup(); h.handlers.start({}); h.options.onResize();
  assert.match(h.nodes.get('.status').textContent, /^Released/);
  assert.equal(h.events.at(-1).inputOwner, 'pointer');
  h.nodes.get('[data-hold]').dispatchEvent(new Event('click')); h.options.onSuspend('offscreen');
  assert.equal(h.nodes.get('[data-hold]').getAttribute('aria-pressed'), 'false'); h.effect.destroy();
});
test('particle DOM and keyboard pulses retain the same numerical trajectory through resize', () => {
  for (const owner of ['dom', 'keyboard']) {
    const uninterrupted = setup('particles');
    if (owner === 'dom') uninterrupted.nodes.get('[data-push]').dispatchEvent(new Event('click')); else key(uninterrupted.stage.canvas, ' ');
    for (let i = 0; i < 10; i++) uninterrupted.options.onFrame(1 / 60);
    const expected = uninterrupted.stage.scene.children[0].geometry.attributes.position.array.slice(); uninterrupted.effect.destroy();
    const resized = setup('particles');
    if (owner === 'dom') resized.nodes.get('[data-push]').dispatchEvent(new Event('click')); else key(resized.stage.canvas, ' ');
    for (let i = 0; i < 10; i++) { if (i === 2) resized.options.onResize(); resized.options.onFrame(1 / 60); }
    assert.deepEqual(resized.stage.scene.children[0].geometry.attributes.position.array, expected, owner);
    assert.match(resized.nodes.get('.status').textContent, /^Local pulse/); resized.effect.destroy();
  }
});
test('particle pointer input still cancels on resize, and DOM pulse on blur', () => {
  const h = setup('particles'); h.handlers.start({}); h.options.onResize();
  assert.match(h.nodes.get('.status').textContent, /^Released/);
  h.nodes.get('[data-push]').dispatchEvent(new Event('click')); h.options.onSuspend('window-blur');
  assert.match(h.nodes.get('.status').textContent, /^Released/); h.effect.destroy();
});
test('particle strength control drives the distinct readout and the pulse magnitude', () => {
  assert.match(particleSource, /<output data-strength-value>/);
  assert.equal((particleSource.match(/<[^>]+data-strength(?:\s|>)/g) || []).length, 1, 'only the input owns data-strength');
  const weak = setup('particles'); weak.nodes.get('[data-strength]').value = '.3'; weak.nodes.get('[data-strength]').dispatchEvent(new Event('input')); weak.nodes.get('[data-push]').dispatchEvent(new Event('click')); weak.options.onFrame(1 / 60);
  const weakPositions = weak.stage.scene.children[0].geometry.attributes.position.array.slice(); weak.effect.destroy();
  const strong = setup('particles'); strong.nodes.get('[data-strength]').value = '2'; strong.nodes.get('[data-strength]').dispatchEvent(new Event('input'));
  assert.equal(strong.nodes.get('[data-strength-value]').textContent, '2.0');
  strong.nodes.get('[data-push]').dispatchEvent(new Event('click')); strong.options.onFrame(1 / 60);
  assert.notDeepEqual(strong.stage.scene.children[0].geometry.attributes.position.array, weakPositions); strong.effect.destroy();
});
