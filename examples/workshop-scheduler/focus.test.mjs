import test from 'node:test';
import assert from 'node:assert/strict';
import { createDialogReturn, focusVisible } from './app.mjs';

// DOM methods are the external boundary here. These tests verify ownership,
// late node resolution, and focus/scroll order; they do not simulate layout.
function fixture() {
  const result = { active: null, calls: [] };
  const element = (name, properties = {}) => ({
    name, isConnected: true, hidden: false, disabled: false,
    closest: () => null,
    getClientRects: () => [1],
    scrollIntoView(options) { result.calls.push(['scroll', name, options]); },
    focus(options) { result.active = name; result.calls.push(['focus', name, options]); },
    ...properties,
  });
  return { result, element };
}

test('cancel success hands off once to undo after the queued close, never to the removed source', async () => {
  const { result, element } = fixture();
  const oldSource = element('old-cancel');
  const undo = element('undo', { hidden: true });
  let open = true;
  const handoff = createDialogReturn({ isOpen: () => open, moveFocus: focusVisible });
  handoff.begin(() => [oldSource]);
  oldSource.isConnected = false; // acceptResult re-renders the details panel.
  undo.hidden = false; // showNotice publishes the real continuation.
  handoff.to(() => [undo]);
  open = false;
  assert.equal(result.active, null);
  await new Promise(resolve => setTimeout(() => { handoff.closed(); resolve(); }, 0));
  assert.equal(result.active, 'undo');
  assert.equal(handoff.closed(), false);
  assert.equal(result.calls.filter(([kind]) => kind === 'focus').length, 1);
});

test('ordinary form close resolves the replacement of its original entry after redraw', () => {
  const { result, element } = fixture();
  const removedSlot = element('old-slot');
  let currentSlot = removedSlot;
  let open = true;
  const handoff = createDialogReturn({ isOpen: () => open, moveFocus: focusVisible });
  handoff.begin(() => [removedSlot, currentSlot]);
  removedSlot.isConnected = false;
  currentSlot = element('same-slot-new-node');
  open = false;
  handoff.closed();
  assert.equal(result.active, 'same-slot-new-node');
});

test('save success resolves the newly rendered reservation only when close is delivered', () => {
  const { result, element } = fixture();
  let savedButton = null;
  let open = true;
  const handoff = createDialogReturn({ isOpen: () => open, moveFocus: focusVisible });
  handoff.begin(() => [element('new-booking')]);
  handoff.to(() => [savedButton]);
  savedButton = element('restored-reservation');
  open = false;
  handoff.closed();
  assert.equal(result.active, 'restored-reservation');
});

test('undo ignores its now-hidden control and scrolls the recovered reservation before focusing it', () => {
  const { result, element } = fixture();
  result.active = 'undo';
  const hiddenUndo = element('undo', { hidden: true });
  const restored = element('restored-reservation');
  const chosen = focusVisible([hiddenUndo, restored]);
  assert.equal(chosen, restored);
  assert.equal(result.active, 'restored-reservation');
  assert.deepEqual(result.calls, [
    ['scroll', 'restored-reservation', { block: 'nearest', inline: 'nearest', behavior: 'instant' }],
    ['focus', 'restored-reservation', { preventScroll: true }],
  ]);
});

test('unavailable reservation falls back to the same task heading, skipping disabled and hidden ancestors', () => {
  const { result, element } = fixture();
  const stale = element('stale-booking', { isConnected: false });
  const disabled = element('disabled-edit', { disabled: true });
  const hiddenParent = element('hidden-undo', { closest: () => ({ hidden: true }) });
  const noLayout = element('not-rendered', { getClientRects: () => [] });
  const heading = element('schedule-heading');
  assert.equal(focusVisible([stale, disabled, hiddenParent, noLayout, heading]), heading);
  assert.equal(result.active, 'schedule-heading');
  assert.equal(focusVisible([null, stale]), null);
  assert.equal(result.active, 'schedule-heading');
});

test('a queued old close does not steal focus from a reopened dialog', () => {
  const { result, element } = fixture();
  let open = true;
  const handoff = createDialogReturn({ isOpen: () => open, moveFocus: focusVisible });
  handoff.begin(() => [element('first-source')]);
  handoff.to(() => [element('first-result')]);
  handoff.begin(() => [element('second-source')]);
  result.active = 'second-form-input';
  assert.equal(handoff.closed(), false);
  assert.equal(result.active, 'second-form-input');
  open = false;
  handoff.closed();
  assert.equal(result.active, 'second-source');
});
