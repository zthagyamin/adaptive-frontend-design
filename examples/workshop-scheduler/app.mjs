import { time } from './data.mjs';

// A dialog's native close event is queued. Its one scoped handoff must run there,
// after the old controls have been replaced, rather than race a second focus call.
export function createDialogReturn({ isOpen, moveFocus }) {
  let source = null;
  let destination = null;
  return {
    begin(resolveSource) { source = resolveSource; destination = null; },
    to(resolveDestination) { destination = resolveDestination; },
    closed() {
      if (isOpen() || !source) return false;
      const resolve = destination || source;
      source = destination = null;
      return moveFocus(resolve());
    },
  };
}

export function focusVisible(candidates) {
  const target = candidates.find(element => element?.isConnected && !element.disabled && !element.hidden && !element.closest('[hidden], [inert]') && element.getClientRects().length);
  if (!target) return null;
  target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  target.focus({ preventScroll: true });
  return target;
}

async function startScheduler() {
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const state = { date: '2026-10-26', filter: 'all', dates: [], devices: [], reservations: [], selected: null, loaded: false, form: null, canceled: null, saving: false, canceling: false, undoing: false };
const duration = minutes => `${minutes / 60} 小时`;
const dateText = date => `${Number(date.slice(5, 7))} 月 ${Number(date.slice(8))} 日`;
const dayText = date => `${weekdays[state.dates.indexOf(date)]}，${dateText(date)}`;
const device = id => state.devices.find(item => item.id === id);
const visibleDevices = () => state.devices.filter(item => state.filter === 'all' || item.id === state.filter);
const visibleRows = () => state.reservations.filter(item => item.date === state.date && (state.filter === 'all' || item.deviceId === state.filter)).sort((a, b) => a.start - b.start || a.deviceId.localeCompare(b.deviceId));
const chosen = () => visibleRows().find(item => item.id === state.selected);
const key = () => crypto.randomUUID();
const bookingButton = id => [...$('#schedule').querySelectorAll('[data-booking]')].find(item => item.dataset.booking === id);
const slotButton = row => row?.date === state.date ? [...$('#schedule').querySelectorAll('[data-slot]')].find(item => item.dataset.device === row.deviceId && Number(item.dataset.slot) === row.start) : null;
const bookingReturn = id => [bookingButton(id), chosen()?.id === id ? $('#edit-booking') : null, $('#schedule-heading')];
function sourceReturn(opener, row) {
  // Keep identity as well as the node: a conflict refresh may replace the node.
  const identity = { id: opener?.id, bookingId: opener?.dataset.booking, slot: opener?.dataset.slot, deviceId: opener?.dataset.device, date: state.date, reservationId: row?.id };
  return () => {
    let replacement = null;
    if (identity.bookingId) replacement = bookingButton(identity.bookingId);
    else if (identity.slot) replacement = slotButton({ date: identity.date, deviceId: identity.deviceId, start: Number(identity.slot) });
    else if (identity.id && (!identity.reservationId || chosen()?.id === identity.reservationId)) replacement = $(`#${identity.id}`);
    return [opener, replacement, identity.reservationId ? bookingButton(identity.reservationId) : null, $('#schedule-heading')];
  };
}

async function request(path = '', data, requestId) {
  let response;
  try {
    response = await fetch(`./api/reservations${path}`, data === undefined ? { cache: 'no-store' } : { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': requestId }, body: JSON.stringify(data) });
  } catch {
    const error = new Error('无法连接演示服务。输入已保留，请检查服务后重试。');
    error.code = 'NETWORK';
    throw error;
  }
  const result = await response.json();
  if (!response.ok) { const error = new Error(result.message || '操作失败，请重试。'); error.code = result.code; throw error; }
  return result;
}

function connected(ok) {
  $('#connection-dot').className = ok ? 'connected' : 'failed';
  $('#connection-text').textContent = ok ? '演示服务已连接' : '连接中断 · 当前显示上次数据';
}

async function refresh({ initial = false } = {}) {
  try {
    const result = await request();
    state.dates = result.dates;
    state.devices = result.devices;
    state.reservations = result.reservations;
    if (!state.loaded) {
      $('#device-filter').innerHTML = '<option value="all">全部设备</option>' + state.devices.map(item => `<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('');
      state.selected = visibleRows()[0]?.id || null;
    }
    state.loaded = true;
    $('#global-error').hidden = true;
    connected(true);
    render();
    return true;
  } catch (error) {
    connected(false);
    $('#global-error').hidden = false;
    $('#global-error').innerHTML = `${esc(error.message)} <button id="retry-load">重新连接</button>`;
    $('#retry-load').addEventListener('click', () => refresh({ initial: !state.loaded }));
    if (initial) {
      $('#day-summary').textContent = '排班尚未读取，连接后可操作';
      $('#schedule').innerHTML = '<p class="loading">暂时无法读取排班。请使用上方「重新连接」。</p>';
      $('#schedule').setAttribute('aria-busy', 'false');
      $('#details').innerHTML = '<div class="empty-detail"><strong>等待排班数据</strong>成功连接后可查看并预约设备。</div>';
    }
    return false;
  }
}

function renderDates() {
  $('#date-tabs').innerHTML = state.dates.map((date, index) => {
    const descriptionId = `date-description-${date}`;
    const count = state.reservations.filter(row => row.date === date).length;
    return `<button class="date-tab" data-date="${date}" aria-pressed="${date === state.date}" aria-describedby="${descriptionId}"><span>${weekdays[index]}</span><strong>${Number(date.slice(8))}</strong><i class="date-dot" aria-hidden="true"></i></button><span id="${descriptionId}" class="sr-only">${date.slice(0, 4)} 年 ${dateText(date)}，${count} 条预约</span>`;
  }).join('');
  $('#date-tabs').querySelectorAll('[data-date]').forEach(button => button.addEventListener('click', () => {
    state.date = button.dataset.date;
    state.selected = null;
    render();
    $(`[data-date="${state.date}"]`).focus({ preventScroll: true });
  }));
}

function renderSchedule() {
  const shownDevices = visibleDevices();
  const rows = visibleRows();
  $('#schedule-heading').textContent = dayText(state.date);
  const occupied = rows.reduce((sum, row) => sum + row.end - row.start, 0);
  $('#day-summary').textContent = `${rows.length} 条预约 · 合计空闲 ${duration(540 * shownDevices.length - occupied)}`;
  const schedule = $('#schedule');
  schedule.className = `schedule${shownDevices.length === 1 ? ' single' : ''}`;
  schedule.style.setProperty('--columns', shownDevices.length);
  schedule.setAttribute('aria-busy', 'false');
  schedule.innerHTML = '<div class="time-heading">时间</div>' + shownDevices.map(item => {
    const busy = rows.filter(row => row.deviceId === item.id).reduce((sum, row) => sum + row.end - row.start, 0);
    return `<div class="device-heading"><div class="device-heading-top"><span class="device-code">${item.tag}</span><h3>${item.name}</h3></div><small>${item.model}</small><span class="device-capacity">空闲 ${duration(540 - busy)}</span></div>`;
  }).join('') + `<div class="time-column" aria-hidden="true">${Array.from({ length: 18 }, (_, index) => `<div class="time-tick${index % 2 ? ' half' : ''}">${time(540 + index * 30)}</div>`).join('')}</div>` + shownDevices.map(item => {
    const booked = rows.filter(row => row.deviceId === item.id);
    const slots = Array.from({ length: 18 }, (_, index) => {
      const start = 540 + index * 30;
      if (booked.some(row => row.start < start + 30 && start < row.end)) return '';
      return `<button class="slot" data-slot="${start}" data-device="${item.id}" style="top:${index * 40}px" aria-label="预约${esc(item.name)}，${dateText(state.date)} ${time(start)} 至 ${time(start + 30)}，空闲"></button>`;
    }).join('');
    return `<div class="device-column" role="group" aria-label="${esc(item.name)}的当日排班">${slots}${booked.map(row => `<button class="booking ${item.kind}${row.id === state.selected ? ' selected' : ''}${row.end - row.start === 30 ? ' short' : ''}" data-booking="${esc(row.id)}" style="top:${(row.start - 540) / 30 * 40 + 2}px;height:${(row.end - row.start) / 30 * 40 - 4}px" aria-label="${esc(row.title)}，${esc(row.booker)}，${time(row.start)} 至 ${time(row.end)}，查看详情" aria-pressed="${row.id === state.selected}"><span class="booking-time">${time(row.start)}–${time(row.end)}</span><strong>${esc(row.title)}</strong><span class="booking-person">${esc(row.booker)}</span></button>`).join('')}</div>`;
  }).join('');
  schedule.querySelectorAll('[data-booking]').forEach(button => button.addEventListener('click', () => selectBooking(button.dataset.booking)));
  schedule.querySelectorAll('[data-slot]').forEach(button => button.addEventListener('click', () => {
    const start = Number(button.dataset.slot);
    openForm({ deviceId: button.dataset.device, start, end: start + 30 });
  }));
}

function selectBooking(id) {
  state.selected = id;
  $('#schedule').querySelectorAll('[data-booking]').forEach(button => {
    const selected = button.dataset.booking === id;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  renderDetails();
}

function renderDetails() {
  const row = chosen();
  const dayRows = visibleRows();
  if (!row) {
    $('#details').innerHTML = `<div class="empty-detail"><div class="empty-symbol" aria-hidden="true">⌑</div><strong>${dayRows.length ? '选一条预约，查看详情' : '这一天，留给新作品'}</strong>${dayRows.length ? '点击时间轴中的预约，可查看使用人、备注，或调整时段。' : '当前筛选下没有预约。点击空闲格，或使用「新建预约」。'}</div><div class="daily-list"><h3>${dayRows.length ? '当日预约 · 快速选择' : '设备均有空闲时段'}</h3>${dayRows.map(item => `<button class="agenda-button" data-agenda="${esc(item.id)}"><span><strong>${esc(item.title)}</strong>${esc(device(item.deviceId).name)} · ${esc(item.booker)}</span><span>${time(item.start)}</span></button>`).join('')}</div>`;
    $('#details').querySelectorAll('[data-agenda]').forEach(button => button.addEventListener('click', () => {
      selectBooking(button.dataset.agenda);
      const event = [...$('#schedule').querySelectorAll('[data-booking]')].find(item => item.dataset.booking === state.selected);
      event?.focus({ preventScroll: true });
      event?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }));
    return;
  }
  const item = device(row.deviceId);
  $('#details').innerHTML = `<div class="details-body"><div class="detail-device"><i class="color-dot ${item.kind}"></i>${esc(item.name)} · ${item.tag}</div><h3>${esc(row.title)}</h3><span class="confirmed">已确认预约</span><dl class="detail-list"><dt>时间</dt><dd><span class="detail-time">${time(row.start)}–${time(row.end)}</span><span class="duration">${dateText(row.date)} · ${duration(row.end - row.start)}</span></dd><dt>使用人</dt><dd>${esc(row.booker)}</dd><dt>位置</dt><dd>${esc(item.area)}</dd></dl><div class="note-area"><h4>交接备注</h4><p>${esc(row.note || '暂无备注')}</p></div><div class="detail-actions"><button id="edit-booking" class="secondary">调整预约</button><button id="cancel-booking" class="cancel-link">取消预约</button></div><p class="record-id">${esc(row.id)} · v${row.revision}</p></div>`;
  $('#edit-booking').addEventListener('click', () => openForm(row));
  $('#cancel-booking').addEventListener('click', () => openCancel(row));
}

function render() { renderDates(); renderSchedule(); renderDetails(); }

function showNotice(text, undo = false) {
  $('#notice-text').textContent = text;
  $('#undo').hidden = !undo;
  $('#notice').hidden = false;
}

function acceptResult(result) {
  const row = result.reservation;
  state.reservations = state.reservations.filter(item => item.id !== row.id);
  if (row.status === 'active') {
    state.reservations.push(row);
    state.date = row.date;
    if (state.filter !== 'all' && state.filter !== row.deviceId) {
      state.filter = row.deviceId;
      $('#device-filter').value = state.filter;
    }
    state.selected = row.id;
  } else state.selected = null;
  connected(true);
  render();
}

const dialog = $('#booking-dialog');
const form = $('#booking-form');
const formReturn = createDialogReturn({ isOpen: () => dialog.open, moveFocus: focusVisible });
function openForm(initial = {}) {
  if (!state.loaded) { showNotice('请先连接服务并读取排班。'); return; }
  formReturn.begin(sourceReturn(document.activeElement, initial));
  form.reset();
  state.form = { initial: { ...initial }, requestId: key() };
  $('#form-title').textContent = initial.id ? '调整预约' : '新建预约';
  $('#save-booking').textContent = initial.id ? '保存调整' : '保存预约';
  $('#form-error').hidden = true;
  $('#save-state').textContent = '';
  form.elements.deviceId.innerHTML = state.devices.map(item => `<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('');
  form.elements.date.innerHTML = state.dates.map(date => `<option value="${date}">${dayText(date)}</option>`).join('');
  form.elements.start.innerHTML = Array.from({ length: 18 }, (_, i) => 540 + i * 30).map(value => `<option value="${value}">${time(value)}</option>`).join('');
  form.elements.end.innerHTML = Array.from({ length: 18 }, (_, i) => 570 + i * 30).map(value => `<option value="${value}">${time(value)}</option>`).join('');
  const values = { title: '', booker: '', note: '', date: state.date, deviceId: state.filter === 'all' ? state.devices[0].id : state.filter, start: 540, end: 600, ...initial };
  for (const name of ['title', 'booker', 'note', 'date', 'deviceId', 'start', 'end']) form.elements[name].value = values[name];
  dialog.showModal();
  form.elements.title.focus();
}

function closeForm() { if (!state.saving) dialog.close(); }
dialog.addEventListener('cancel', event => { if (state.saving) event.preventDefault(); });
dialog.addEventListener('close', () => formReturn.closed());
$('#close-form').addEventListener('click', closeForm);
$('#leave-form').addEventListener('click', closeForm);
form.addEventListener('input', () => { if (state.form) state.form.requestId = key(); });
form.elements.start.addEventListener('change', () => {
  if (Number(form.elements.end.value) <= Number(form.elements.start.value)) form.elements.end.value = Number(form.elements.start.value) + 30;
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (state.saving || !form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form));
  data.start = Number(data.start); data.end = Number(data.end);
  if (data.end <= data.start) {
    $('#form-error').hidden = false;
    $('#form-error').textContent = '结束时间须晚于开始时间。输入已保留。';
    form.elements.end.focus();
    return;
  }
  const initial = state.form.initial;
  if (initial.id) { data.id = initial.id; data.expectedRevision = initial.revision; }
  state.saving = true;
  $('#form-fields').disabled = true;
  for (const name of ['save-booking', 'close-form', 'leave-form']) $(`#${name}`).disabled = true;
  $('#form-error').hidden = true;
  $('#save-state').textContent = '正在等待服务确认，请稍候…';
  $('#save-booking').textContent = '正在保存…';
  try {
    const result = await request(initial.id ? '/update' : '/create', data, state.form.requestId);
    acceptResult(result);
    formReturn.to(() => bookingReturn(result.reservation.id));
    dialog.close();
    showNotice(initial.id ? '预约调整已保存。' : '预约已保存，时段已为你保留。');
  } catch (error) {
    if (['CONFLICT', 'STALE'].includes(error.code)) await refresh();
    $('#form-error').hidden = false;
    $('#form-error').textContent = `${error.message}${['CONFLICT', 'STALE'].includes(error.code) ? ' 你的输入仍在表单中。' : ''}`;
    $('#form-error').focus();
    if (error.code === 'NETWORK') connected(false);
  } finally {
    state.saving = false;
    $('#form-fields').disabled = false;
    for (const name of ['save-booking', 'close-form', 'leave-form']) $(`#${name}`).disabled = false;
    $('#save-state').textContent = '';
    $('#save-booking').textContent = initial.id ? '保存调整' : '保存预约';
  }
});

let cancelTarget;
let cancelKey;
const cancelDialog = $('#cancel-dialog');
const cancelReturn = createDialogReturn({ isOpen: () => cancelDialog.open, moveFocus: focusVisible });
function openCancel(row) {
  cancelTarget = { ...row }; cancelKey = key();
  cancelReturn.begin(sourceReturn(document.activeElement, row));
  $('#cancel-summary').textContent = `${row.title} · ${dateText(row.date)} ${time(row.start)}–${time(row.end)}`;
  $('#cancel-error').hidden = true;
  $('#cancel-state').textContent = '';
  cancelDialog.showModal();
  $('#keep-booking').focus();
}
function closeCancel() { if (!state.canceling) cancelDialog.close(); }
for (const name of ['keep-booking', 'close-cancel']) $(`#${name}`).addEventListener('click', closeCancel);
cancelDialog.addEventListener('cancel', event => { if (state.canceling) event.preventDefault(); });
cancelDialog.addEventListener('close', () => cancelReturn.closed());
$('#confirm-cancel').addEventListener('click', async () => {
  if (state.canceling) return;
  state.canceling = true;
  for (const name of ['confirm-cancel', 'keep-booking', 'close-cancel']) $(`#${name}`).disabled = true;
  $('#cancel-error').hidden = true;
  $('#cancel-state').textContent = '正在等待服务确认…';
  try {
    const result = await request('/cancel', { id: cancelTarget.id, expectedRevision: cancelTarget.revision }, cancelKey);
    acceptResult(result);
    state.canceled = { row: result.reservation, requestId: key() };
    showNotice(`已取消「${cancelTarget.title}」。`, true);
    cancelReturn.to(() => [$('#undo'), slotButton(result.reservation), $('#schedule-heading')]);
    cancelDialog.close();
  } catch (error) {
    if (error.code === 'STALE') await refresh();
    $('#cancel-error').hidden = false;
    $('#cancel-error').textContent = error.message;
  } finally {
    state.canceling = false;
    for (const name of ['confirm-cancel', 'keep-booking', 'close-cancel']) $(`#${name}`).disabled = false;
    $('#cancel-state').textContent = '';
  }
});

$('#undo').addEventListener('click', async () => {
  if (!state.canceled || state.undoing) return;
  state.undoing = true;
  $('#undo').disabled = true;
  $('#undo').textContent = '正在恢复…';
  try {
    const { row, requestId } = state.canceled;
    const result = await request('/restore', { id: row.id, expectedRevision: row.revision }, requestId);
    acceptResult(result);
    state.canceled = null;
    showNotice('已恢复预约，原时段重新保留。');
    focusVisible(bookingReturn(row.id));
  } catch (error) {
    if (['CONFLICT', 'STALE'].includes(error.code)) await refresh();
    showNotice(`未能恢复：${error.message}`, true);
  } finally { state.undoing = false; $('#undo').disabled = false; $('#undo').textContent = '撤销取消'; }
});
$('#dismiss-notice').addEventListener('click', () => { if (!state.undoing) { $('#notice').hidden = true; focusVisible(state.selected ? bookingReturn(state.selected) : [$('#schedule-heading')]); } });
$('#device-filter').addEventListener('change', event => {
  state.filter = event.target.value; state.selected = null; render();
});
$('#new-booking').addEventListener('click', () => openForm());
await refresh({ initial: true });
}

if (typeof document !== 'undefined') await startScheduler();
