import test from 'node:test';
import assert from 'node:assert/strict';
import { createService } from './service.mjs';

const slot = (extra = {}) => ({ title: '木盒打样', booker: '林青', deviceId: 'laser', date: '2026-10-26', start: 600, end: 660, note: '', ...extra });
const fresh = () => createService({ reservations: [], latency: 0 });
const save = (service, key, data = slot()) => service.mutate('create', data, key);

test('half-hour intervals allow adjacency and reject overlap on the same device only', async () => {
  const service = fresh();
  await save(service, 'a');
  await save(service, 'b', slot({ start: 660, end: 690 }));
  await save(service, 'c', slot({ deviceId: 'printer' }));
  await assert.rejects(save(service, 'd', slot({ start: 630, end: 690 })), error => error.code === 'CONFLICT');
  assert.equal((await service.list()).reservations.length, 3);
});

test('invalid dates, off-grid times, closing-time overflow, and unknown devices are rejected without writes', async () => {
  const service = fresh();
  for (const data of [slot({ date: '2026-11-02' }), slot({ date: '2026-02-31' }), slot({ start: 615 }), slot({ end: 1110 }), slot({ end: 600 }), slot({ deviceId: 'unknown' }), slot({ booker: ' ' })]) {
    await assert.rejects(save(service, JSON.stringify(data), data), error => error.code === 'VALIDATION');
  }
  assert.equal((await service.list()).reservations.length, 0);
});

test('concurrent and repeated requests with one key create exactly one reservation', async () => {
  const service = fresh();
  const results = await Promise.all([save(service, 'same'), save(service, 'same')]);
  assert.equal(results[0].reservation.id, results[1].reservation.id);
  assert.deepEqual(await save(service, 'same'), results[0]);
  assert.equal((await service.list()).reservations.length, 1);
  await assert.rejects(save(service, 'same', slot({ title: '不同请求' })), error => error.code === 'KEY_REUSED');
});

test('failed save preserves service data and the same request may retry successfully', async () => {
  const service = fresh();
  service.control({ mode: 'fail' });
  await assert.rejects(save(service, 'retry'), error => error.code === 'UNAVAILABLE');
  assert.equal((await service.list()).reservations.length, 0);
  await save(service, 'retry');
  assert.equal((await service.list()).reservations.length, 1);
});

test('delayed mutations remain pending and do not publish an optimistic reservation', async () => {
  const service = fresh();
  service.control({ mode: 'delay', delayMs: 45 });
  let settled = false;
  const pending = save(service, 'slow').then(value => { settled = true; return value; });
  assert.equal(settled, false);
  assert.equal((await service.list()).reservations.length, 0);
  await pending;
  assert.equal(settled, true);
  assert.equal((await service.list()).reservations.length, 1);
});

test('updates use revisions and reject stale or conflicting changes without losing the prior booking', async () => {
  const service = fresh();
  const { reservation: a } = await save(service, 'a');
  await save(service, 'b', slot({ start: 720, end: 780 }));
  const { reservation: edited } = await service.mutate('update', { ...a, start: 660, end: 720, expectedRevision: 1 }, 'edit');
  assert.equal(edited.revision, 2);
  await assert.rejects(service.mutate('update', { ...a, title: '旧版本', expectedRevision: 1 }, 'stale'), error => error.code === 'STALE');
  await assert.rejects(service.mutate('update', { ...edited, start: 750, end: 810, expectedRevision: 2 }, 'overlap'), error => error.code === 'CONFLICT');
  assert.equal((await service.list()).reservations.find(row => row.id === a.id).start, 660);
});

test('cancel and undo retain identity; undo cannot overwrite a replacement booking', async () => {
  const service = fresh();
  const { reservation } = await save(service, 'a');
  const canceled = await service.mutate('cancel', { id: reservation.id, expectedRevision: 1 }, 'cancel');
  assert.equal((await service.list()).reservations.length, 0);
  const restored = await service.mutate('restore', { id: reservation.id, expectedRevision: canceled.reservation.revision }, 'undo');
  assert.equal(restored.reservation.id, reservation.id);
  assert.equal(restored.reservation.revision, 3);
  const canceledAgain = await service.mutate('cancel', { id: reservation.id, expectedRevision: 3 }, 'cancel-2');
  await save(service, 'replacement');
  await assert.rejects(service.mutate('restore', { id: reservation.id, expectedRevision: canceledAgain.reservation.revision }, 'undo-2'), error => error.code === 'CONFLICT');
  assert.equal((await service.list()).reservations.length, 1);
});

test('controlled conflict publishes a competing booking and rejects this request', async () => {
  const service = fresh();
  service.control({ mode: 'conflict' });
  await assert.rejects(save(service, 'racing'), error => error.code === 'CONFLICT');
  const rows = (await service.list()).reservations;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].booker, '演示同事');
  assert.equal(rows[0].start, 600);
});

test('simulating a conflict on an unchanged existing window never creates double-booked data', async () => {
  const service = fresh();
  const { reservation } = await save(service, 'original');
  service.control({ mode: 'conflict' });
  await assert.rejects(service.mutate('update', { ...reservation, title: '修改标题', expectedRevision: 1 }, 'race-edit'), error => error.code === 'STALE');
  const rows = (await service.list()).reservations;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].revision, 2);
  assert.equal(rows[0].title, reservation.title);
});
