import test from 'node:test';
import assert from 'node:assert/strict';
import { createFrameLoop, scope } from '../effects/lifecycle.mjs';

function harness() {
  const callbacks = new Map(), frames = []; let id = 0, visible = true;
  const loop = createFrameLoop({ request: fn => { callbacks.set(++id, fn); return id; }, cancel: id => callbacks.delete(id), allowed: () => visible, step: dt => { frames.push(dt); return true; }, render: () => {} });
  return { loop, callbacks, frames, visible(value) { visible = value; }, tick(now) { const [key, fn] = callbacks.entries().next().value; callbacks.delete(key); fn(now); } };
}
test('a study has one loop; repeated wake does not duplicate work', () => {
  const h = harness(); h.loop.wake(); h.loop.wake(); h.loop.wake(); assert.equal(h.callbacks.size, 1);
  h.tick(0); assert.equal(h.callbacks.size, 1); h.tick(16); assert.equal(h.frames.length, 2);
  h.loop.destroy(); assert.equal(h.callbacks.size, 0); h.loop.wake(); assert.equal(h.callbacks.size, 0);
});
test('suspend and re-enter reset the clock rather than integrating hidden time', () => {
  const h = harness(); h.loop.wake(); h.tick(0); h.tick(16); h.loop.stop(); h.visible(false); h.loop.wake(); assert.equal(h.callbacks.size, 0);
  h.visible(true); h.loop.wake(); h.tick(60000); assert.equal(h.frames.at(-1), 1 / 60);
  h.tick(120000); assert.equal(h.frames.at(-1), 1 / 30); h.loop.destroy();
});
test('destroy releases listeners once; a new instance receives only new input', () => {
  const target = new EventTarget(), calls = [], first = scope(); let releases = 0;
  first.on(target, 'input', () => calls.push('first')); first.add(() => releases++);
  target.dispatchEvent(new Event('input')); first.destroy(); first.destroy(); target.dispatchEvent(new Event('input'));
  const second = scope(); second.on(target, 'input', () => calls.push('second')); target.dispatchEvent(new Event('input')); second.destroy();
  assert.deepEqual(calls, ['first', 'second']); assert.equal(releases, 1);
});
