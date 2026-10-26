import { createEffect as scroll } from './effects/scroll.mjs';
import { createEffect as surface } from './effects/surface.mjs';
import { createEffect as particles } from './effects/particles.mjs';

const factories = { scroll, surface, particles };
const host = document.querySelector('#effect-host');
const tabs = [...document.querySelectorAll('[data-effect]')];
const preference = document.querySelector('#reduce-motion');
const media = matchMedia('(prefers-reduced-motion: reduce)');
preference.checked = media.matches;
let effect, selected = 'scroll';
let instance = 0, currentAudit = null;
const disposedAudits = [];
const measurements = document.createElement('details');
measurements.id = 'developer-measurements';
measurements.className = 'developer-measurements';
measurements.innerHTML = `<summary>Developer measurements</summary><div class="measurement-content"><p>Read renderer-owned counters and the latest 240 active-frame intervals and CPU samples. Switch between studies ten times, then take a snapshot to compare the current baseline with disposed instances. Changing quality changes the particle baseline.</p><button class="quiet-button" id="snapshot-measurements">Snapshot measurements</button><p id="measurement-status">Not sampled. Press Snapshot measurements after interacting.</p><section aria-label="Active renderer measurements"><h3>Current instance</h3><dl id="measurement-active"><dt>Measurement</dt><dd>not sampled</dd></dl></section><section aria-label="Disposed renderer measurements"><h3>Recently disposed instances <span>(latest 20)</span></h3><div class="measurement-table-wrap"><table id="measurement-disposed"><thead><tr><th>Instance</th><th>Geometries after disposal</th><th>Textures after disposal</th><th>Last render calls</th><th>Interval / CPU samples</th><th>Frame interval p95</th><th>CPU p95</th></tr></thead><tbody><tr><td colspan="7">not sampled</td></tr></tbody></table></div></section><p class="measurement-boundary">Resource values come from Three.js renderer.info.memory; calls, points and triangles come from the last actual render. Disposal counts are read after owned resources and the renderer are disposed. Frame intervals use raw animation-frame timestamps, before the simulation delta cap. CPU time covers simulation and render submission; it excludes GPU completion. Idle and hidden gaps are excluded. These observations do not prove smoothness or rule out driver/GPU leaks.</p></div>`;
document.querySelector('#experiments').after(measurements);
const activeOutput = measurements.querySelector('#measurement-active');
const historyOutput = measurements.querySelector('#measurement-disposed tbody');
const statusOutput = measurements.querySelector('#measurement-status');
const ms = value => `${value.toFixed(2)} ms`;
function formatTiming(sample) { return sample ? `${sample.samples} samples · mean ${ms(sample.meanMs)} · p95 ${ms(sample.p95Ms)} · max ${ms(sample.maxMs)}` : 'not sampled'; }
function showActive(rows) {
  activeOutput.replaceChildren();
  for (const [name, value] of rows) { const term = document.createElement('dt'), definition = document.createElement('dd'); term.textContent = name; definition.textContent = String(value); activeOutput.append(term, definition); }
}
measurements.querySelector('#snapshot-measurements').addEventListener('click', () => {
  const snapshot = currentAudit?.read?.();
  if (snapshot) {
    showActive([
      ['Instance', `${currentAudit.name} #${currentAudit.id}`], ['State', snapshot.phase],
      ['Geometries', snapshot.geometries], ['Textures', snapshot.textures], ['Last render calls', snapshot.lastRenderCalls],
      ['Last render triangles', snapshot.lastRenderTriangles], ['Last render points', snapshot.lastRenderPoints],
      ['Drawing buffer', `${snapshot.drawingBufferWidth} × ${snapshot.drawingBufferHeight}`], ['Pixel ratio', snapshot.pixelRatio],
      ['Sampled frames', snapshot.totalSampledFrames], ['Frame intervals', formatTiming(snapshot.interval)], ['CPU simulation + submission', formatTiming(snapshot.cpu)],
      ['Recent input / lifecycle events', snapshot.recentEvents?.length ? snapshot.recentEvents.map(event => JSON.stringify(event)).join('\n') : 'not sampled'],
    ]);
  } else showActive([['Study', selected], ['Renderer', 'not sampled — this study has no active WebGL renderer']]);
  historyOutput.replaceChildren();
  if (!disposedAudits.length) { const row = historyOutput.insertRow(); const cell = row.insertCell(); cell.colSpan = 7; cell.textContent = 'not sampled — no disposed renderer recorded'; }
  for (const entry of [...disposedAudits].reverse()) {
    const snapshot = entry.snapshot, row = historyOutput.insertRow();
    row.dataset.instance = String(entry.id);
    for (const value of [`${entry.name} #${entry.id}`, snapshot.geometries, snapshot.textures, snapshot.lastRenderCalls, `${snapshot.interval?.samples ?? 0} / ${snapshot.cpu?.samples ?? 0}`, snapshot.interval ? ms(snapshot.interval.p95Ms) : 'not sampled', snapshot.cpu ? ms(snapshot.cpu.p95Ms) : 'not sampled']) row.insertCell().textContent = String(value);
  }
  statusOutput.textContent = `Snapshot captured. ${disposedAudits.length} disposed renderer record${disposedAudits.length === 1 ? '' : 's'} retained. Values update only when this button is pressed.`;
});
function mount(name, { focus = false } = {}) {
  effect?.destroy();
  currentAudit = null;
  const owner = { id: ++instance, name };
  selected = name;
  for (const tab of tabs) { const active = tab.dataset.effect === name; tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1; }
  host.setAttribute('aria-labelledby', `tab-${name}`);
  effect = factories[name]({ host, reducedMotion: preference.checked, onAudit(event) {
    if (event.phase === 'ready') currentAudit = { ...owner, read: event.read };
    if (event.phase === 'disposed') {
      disposedAudits.push({ ...owner, snapshot: event.snapshot });
      if (disposedAudits.length > 20) disposedAudits.shift();
      if (currentAudit?.id === owner.id) currentAudit = null;
    }
  } });
  if (focus) tabs.find(tab => tab.dataset.effect === name).focus({ preventScroll: true });
}
for (const tab of tabs) {
  tab.addEventListener('click', () => { if (tab.dataset.effect !== selected) mount(tab.dataset.effect); });
  tab.addEventListener('keydown', e => {
    const index = tabs.indexOf(tab);
    const next = e.key === 'ArrowRight' ? (index + 1) % 3 : e.key === 'ArrowLeft' ? (index + 2) % 3 : e.key === 'Home' ? 0 : e.key === 'End' ? 2 : -1;
    if (next >= 0) { e.preventDefault(); mount(tabs[next].dataset.effect, { focus: true }); }
  });
}
preference.addEventListener('change', () => effect.setReducedMotion(preference.checked));
media.addEventListener('change', e => { preference.checked = e.matches; effect.setReducedMotion(e.matches); });
mount(selected);
window.addEventListener('pagehide', () => effect?.destroy());
