import { randomUUID } from 'node:crypto';
import { dates, devices, seedReservations } from './data.mjs';

export class ServiceError extends Error {
  constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; }
}
const fail = (code, message, status) => { throw new ServiceError(code, message, status); };
const copy = value => structuredClone(value);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export function createService({ reservations = seedReservations, latency = 260 } = {}) {
  const rows = new Map(copy(reservations).map(row => [row.id, row]));
  const receipts = new Map();
  let next = { mode: 'success' };
  const validate = data => {
    if (!dates.includes(data.date) || !devices.some(device => device.id === data.deviceId)) fail('VALIDATION', '请选择本周日期和有效设备。');
    if (![data.start, data.end].every(value => Number.isInteger(value) && value % 30 === 0) || data.start < 540 || data.end > 1080 || data.end <= data.start) fail('VALIDATION', '预约须在 09:00–18:00 内，以半小时为单位，结束晚于开始。');
    if (typeof data.title !== 'string' || !data.title.trim() || data.title.trim().length > 40 || typeof data.booker !== 'string' || !data.booker.trim() || data.booker.trim().length > 20 || (data.note != null && (typeof data.note !== 'string' || data.note.length > 240))) fail('VALIDATION', '请填写预约名称（最多 40 字）和使用人（最多 20 字）；备注最多 240 字。');
    return { title: data.title.trim(), booker: data.booker.trim(), note: data.note?.trim() || '', deviceId: data.deviceId, date: data.date, start: data.start, end: data.end };
  };
  const overlap = data => [...rows.values()].find(row => row.status === 'active' && row.id !== data.id && row.deviceId === data.deviceId && row.date === data.date && row.start < data.end && data.start < row.end);
  const available = data => { if (overlap(data)) fail('CONFLICT', '这个时段刚被占用。请查看更新后的排班，并调整时间。', 409); };
  const current = (data, status) => {
    const row = rows.get(data.id);
    if (!row || row.status !== status) fail('STALE', '这条预约已被修改或取消，请刷新后重新打开。', 409);
    if (row.revision !== data.expectedRevision) fail('STALE', '这条预约已有新版本，请刷新后重新打开。', 409);
    return row;
  };
  const execute = (operation, data, scenario) => {
    if (!['create', 'update', 'cancel', 'restore'].includes(operation)) fail('VALIDATION', '未知操作。');
    if (scenario.mode === 'fail') fail('UNAVAILABLE', '演示服务暂时未能保存。输入已保留，请重试。', 503);
    let row;
    if (operation === 'create' || operation === 'update') {
      const fields = validate(data);
      const old = operation === 'update' ? current(data, 'active') : null;
      row = { ...fields, id: old?.id || `BK-${randomUUID().slice(0, 8)}`, revision: (old?.revision || 0) + 1, status: 'active' };
    } else {
      const old = current(data, operation === 'cancel' ? 'active' : 'canceled');
      row = { ...old, revision: old.revision + 1, status: operation === 'cancel' ? 'canceled' : 'active' };
    }
    if (row.status === 'active') {
      if (scenario.mode === 'conflict' && !overlap(row)) {
        const previous = rows.get(row.id);
        if (previous?.status === 'active' && previous.deviceId === row.deviceId && previous.date === row.date && previous.start < row.end && row.start < previous.end) {
          rows.set(previous.id, { ...previous, revision: previous.revision + 1 });
          fail('STALE', '演示同事刚更新了这条预约。请刷新后重新打开。', 409);
        }
        const competitor = { ...row, id: `BK-${randomUUID().slice(0, 8)}`, title: '同事刚刚预约', booker: '演示同事', revision: 1 };
        rows.set(competitor.id, competitor);
      }
      available(row);
    }
    rows.set(row.id, row);
    return { reservation: copy(row), operation };
  };
  return {
    async list() { return { dates: copy(dates), devices: copy(devices), reservations: copy([...rows.values()].filter(row => row.status === 'active')) }; },
    control(config = {}) {
      if (!['success', 'delay', 'fail', 'conflict'].includes(config.mode)) fail('VALIDATION', '未知演示场景。');
      next = { mode: config.mode, delayMs: Math.max(0, Math.min(10000, Number(config.delayMs) || 2200)) };
      return copy(next);
    },
    mutate(operation, data, key) {
      if (typeof key !== 'string' || !key || key.length > 160) return Promise.reject(new ServiceError('VALIDATION', '缺少有效请求标识。'));
      const signature = JSON.stringify({ operation, data });
      const existing = receipts.get(key);
      if (existing) return existing.signature === signature ? existing.promise.then(copy) : Promise.reject(new ServiceError('KEY_REUSED', '请求标识已用于其他操作，请重新打开表单。', 409));
      const scenario = next;
      next = { mode: 'success' };
      const promise = (async () => {
        await wait(scenario.mode === 'delay' ? scenario.delayMs : latency);
        return execute(operation, data, scenario);
      })();
      receipts.set(key, { signature, promise });
      promise.catch(() => { if (receipts.get(key)?.promise === promise) receipts.delete(key); });
      return promise.then(copy);
    },
  };
}
