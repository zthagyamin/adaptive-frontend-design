import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const entry = new URL('../app.mjs', import.meta.url);
async function staticGraph(url, visited = new Set()) {
  if (visited.has(url.href)) return visited;
  visited.add(url.href);
  const source = await readFile(url, 'utf8');
  for (const match of source.matchAll(/^import\s+[^\n]*?from\s+['"]([^'"]+)['"]/gm)) {
    const specifier = match[1];
    assert.ok(!specifier.includes('/vendor/'), 'initial DOM entry must not depend on the vendor engine');
    if (specifier.startsWith('.')) await staticGraph(new URL(specifier, url), visited);
  }
  return visited;
}
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
async function setup() {
  const { createStudyController } = await import(entry.href);
  const events = [], requests = [], host = { rendered: null };
  let reduced = false;
  const factory = name => options => { events.push(`create:${name}:${options.reducedMotion}`); host.rendered = name; return { destroy() { events.push(`destroy:${name}`); }, setReducedMotion(value) { events.push(`motion:${name}:${value}`); } }; };
  const controller = createStudyController({
    host, scrollFactory: factory('scroll'), getReducedMotion: () => reduced,
    loadStudy(name) { const request = deferred(); requests.push({ name, ...request }); return request.promise; },
    onState(state) { events.push(`state:${state.name}:${state.phase}`); if (state.phase === 'loading' || state.phase === 'error') host.rendered = state.phase; },
  });
  return { controller, events, requests, factory, host, reduce(value) { reduced = value; controller.setReducedMotion(value); } };
}

test('scroll initial import graph does not load Three.js', async () => {
  const graph = await staticGraph(entry);
  assert.ok([...graph].some(path => path.endsWith('/effects/scroll.mjs')));
});
test('scroll mounts immediately without requesting a 3D module', async () => {
  const h = await setup(); const pending = h.controller.select('scroll');
  assert.equal(h.host.rendered, 'scroll'); assert.equal(h.requests.length, 0); await pending; h.controller.suspend();
});
test('late import success cannot construct an obsolete renderer or overwrite the latest study', async () => {
  const h = await setup(); const first = h.controller.select('surface'), second = h.controller.select('particles');
  h.requests[1].resolve({ createEffect: h.factory('particles') }); await second;
  h.requests[0].resolve({ createEffect: h.factory('surface') }); await first;
  assert.equal(h.host.rendered, 'particles'); assert.ok(!h.events.some(event => event.startsWith('create:surface:'))); h.controller.suspend();
});
test('returning to scroll supersedes pending import and its later failure', async () => {
  const h = await setup(); const pending = h.controller.select('surface'); await h.controller.select('scroll');
  h.requests[0].reject(new Error('vendor unavailable')); await pending;
  assert.equal(h.host.rendered, 'scroll'); assert.ok(!h.events.includes('state:surface:error')); h.controller.suspend();
});
test('reselecting the same pending module creates only the newest instance', async () => {
  const h = await setup(); const first = h.controller.select('surface'); await h.controller.select('scroll'); const latest = h.controller.select('surface');
  const module = { createEffect: h.factory('surface') };
  h.requests[0].resolve(module); await first;
  assert.ok(!h.events.some(event => event.startsWith('create:surface:')));
  h.requests[1].resolve(module); await latest;
  assert.equal(h.events.filter(event => event.startsWith('create:surface:')).length, 1);
  assert.ok(h.events.includes('destroy:scroll')); h.controller.suspend();
});
test('a pending module reads the latest reduced-motion preference at construction', async () => {
  const h = await setup(); const pending = h.controller.select('surface'); h.reduce(true);
  h.requests[0].resolve({ createEffect: h.factory('surface') }); await pending;
  assert.ok(h.events.includes('create:surface:true')); h.reduce(false); assert.ok(h.events.includes('motion:surface:false')); h.controller.suspend();
});
test('current import failure has a readable error state and does not disable other studies', async () => {
  const h = await setup(); const pending = h.controller.select('surface'); h.requests[0].reject(new Error('bad MIME')); await pending;
  assert.equal(h.host.rendered, 'error'); assert.ok(h.events.includes('state:surface:error'));
  await h.controller.select('scroll'); assert.equal(h.host.rendered, 'scroll'); h.controller.suspend();
});
test('pagehide invalidates pending work; only a real persisted pageshow rebuilds selection', async () => {
  const h = await setup(); const pending = h.controller.select('particles'); h.controller.suspend();
  h.requests[0].resolve({ createEffect: h.factory('particles') }); await pending;
  assert.ok(!h.events.some(event => event.startsWith('create:particles:')));
  await h.controller.resume({ persisted: false }); assert.equal(h.requests.length, 1);
  const resumed = h.controller.resume({ persisted: true }); assert.equal(h.requests.length, 2);
  h.requests[1].resolve({ createEffect: h.factory('particles') }); await resumed;
  assert.equal(h.host.rendered, 'particles'); h.controller.suspend(); assert.ok(h.events.includes('destroy:particles'));
});
