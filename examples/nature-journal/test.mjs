import test from 'node:test';
import assert from 'node:assert/strict';
import { articles, byId } from './content.mjs';
import { parseRoute, returnTarget, navigationOrigin, visibleFocusId } from './routing.mjs';
import { makeServer } from './serve.mjs';

test('all three original essays provide continuous long reading and explicit fictional provenance', () => {
  assert.equal(articles.length, 3);
  for (const a of articles) {
    const text = a.sections.flatMap(s => s.paragraphs).join('');
    const count = (text.match(/[\u3400-\u9fff]/g) || []).length;
    assert.ok(count >= 1200 && count <= 1800, `${a.id}: ${count} Chinese characters`);
    assert.ok(a.sections.every(s => s.paragraphs.length >= 3));
    assert.match(a.caption, /AI 概念影像/);
  }
});
test('shareable article and near-view routes survive parsing; unknown routes remain unknown', () => {
  for (const a of articles) {
    assert.deepEqual(parseRoute(`#/article/${a.id}`), { kind:'article', id:a.id, image:false, path:`#/article/${a.id}` });
    assert.equal(parseRoute(`#/article/${a.id}/image`).image, true);
  }
  assert.equal(parseRoute('#/article/tide/anything').kind, 'missing');
  assert.equal(parseRoute('#/article/tide/image/extra').kind, 'missing');
  assert.equal(parseRoute('#/contents').kind, 'contents');
});
test('related reading retains source identity and direct arrival has a stable catalogue exit', () => {
  assert.deepEqual(returnTarget(null, byId), { href:'#/contents', label:'返回本期目录', back:false });
  assert.deepEqual(returnTarget({ from:{ id:'tide', key:'A' }, parentKey:'A' }, byId), { href:'#/article/tide', label:'返回《等潮水把岸还回来》', back:true });
  assert.equal(returnTarget({ from:{ id:'missing', key:'A' }, parentKey:'A' }, byId).href, '#/contents');
  assert.equal(returnTarget({ from:{ id:'tide', key:'A' }, parentKey:'B' }, byId).back, false);
});
test('loopback server delivers relative resources and rejects traversal and mutation', async () => {
  const server = makeServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const root = await fetch(base); assert.equal(root.status, 200); assert.match(await root.text(), /lang="zh-CN"/);
    const module = await fetch(`${base}/app.mjs`); assert.match(module.headers.get('content-type'), /javascript/);
    for (const a of articles) assert.equal((await fetch(`${base}/assets/${a.image}`)).status, 200);
    assert.equal((await fetch(`${base}/%2e%2e%5cserve.mjs`)).status, 403);
    assert.equal((await fetch(base, {method:'POST'})).status, 405);
    assert.equal((await fetch(`${base}/does-not-exist`)).status, 404);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('title and image entrances retain distinct stable source identities', () => {
  const route = parseRoute('#/article/tide');
  const title = navigationOrigin(route, 'tide-history', 'source-article-tide-47');
  const image = navigationOrigin(route, 'tide-history', 'source-article-tide-46');
  assert.equal(title.entry, 'source-article-tide-47');
  assert.notEqual(title.entry, image.entry);
  assert.equal(title.id, 'tide');
  assert.equal(returnTarget({ from:title, parentKey:'tide-history' }, byId).href, '#/article/tide');
});

test('cover and directory in the shared home DOM produce matching return labels and paths', () => {
  const cover = navigationOrigin(parseRoute('#/contents'), 'H', 'cover-tide', 'cover');
  const directory = navigationOrigin(parseRoute('#/'), 'H', 'directory-tide-title', 'contents');
  assert.equal(cover.path, '#/');
  assert.equal(directory.path, '#/contents');
  assert.deepEqual(returnTarget({ from:cover, parentKey:'H' }, byId), { href:'#/', label:'返回本期封面', back:true });
  assert.deepEqual(returnTarget({ from:directory, parentKey:'H' }, byId), { href:'#/contents', label:'返回本期目录', back:true });
  assert.equal(returnTarget({ from:directory, parentKey:'different-history' }, byId).back, false);
});

test('restored focus selects the visible source title, and never an offscreen article heading', () => {
  const rect = (top, height=40) => ({ top, bottom:top+height, left:20, right:500, width:480, height });
  const candidates = [{ id:'article-title', rect:rect(-4078) }, { id:'related-forest-title', rect:rect(420) }, { id:'entry-forest', rect:rect(530) }];
  assert.equal(visibleFocusId('related-forest-title', candidates, {width:1440,height:1000}), 'related-forest-title');
  assert.equal(visibleFocusId('article-title', candidates, {width:1440,height:1000}), 'related-forest-title');
  assert.equal(visibleFocusId('removed-title', candidates, {width:390,height:844}), 'related-forest-title');
  assert.equal(visibleFocusId('article-title', [{id:'article-title',rect:rect(-4078)}], {width:390,height:844}), null);
});
