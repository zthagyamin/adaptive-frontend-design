import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../serve.mjs';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import http from 'node:http';

test('loopback serves complete study assets and only the explicit vendor mapping', async t => {
  const server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const root = `http://127.0.0.1:${server.address().port}`;
  for (const resource of ['/', '/app.mjs', '/style.css', '/effects/scroll.mjs', '/effects/surface.mjs', '/effects/particles.mjs', '/effects/runtime.mjs', '/effects/math.mjs', '/effects/lifecycle.mjs', '/assets/contour.svg', '/assets/section.svg', '/assets/field.svg', '/vendor/THREE-LICENSE.txt']) {
    const response = await fetch(root + resource); assert.equal(response.status, 200, resource); assert.ok((await response.text()).length > 20);
  }
  const vendorResponse = await fetch(root + '/vendor/three.module.js');
  assert.match(vendorResponse.headers.get('content-type'), /(?:text|application)\/javascript/, 'module MIME must allow browser execution with nosniff');
  const vendor = await vendorResponse.text(); assert.match(vendor, /const REVISION = '160'/);
  const original = await readFile(new URL('../../migration-field-guide/vendor/three.module.js', import.meta.url), 'utf8');
  assert.equal(createHash('sha256').update(vendor).digest('hex'), createHash('sha256').update(original).digest('hex'));
  assert.equal((await fetch(root + '/vendor/nope.js')).status, 404);
  assert.equal((await fetch(root + '/README.md', { method: 'POST' })).status, 405);
  const escaped = await new Promise(resolve => { http.get(root + '/%2e%2e%5cmigration-field-guide%5capp.js', response => { response.resume(); resolve(response.statusCode); }); });
  assert.equal(escaped, 403);
});
