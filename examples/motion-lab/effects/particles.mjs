import { THREE, scope, createStage, captureController, heading, unavailable } from './runtime.mjs';
import { clamp, makeParticles, stepParticles, staticParticles } from './math.mjs';

export function createEffect({ host, reducedMotion, onAudit }) {
  const life = scope();
  let reduced = reducedMotion, dead = false, failed = false, stage, release = () => {}, state;
  let geometry = new THREE.BufferGeometry(), points, pulse = 0, sampleTime = 0, grabbing = false, inputOwner = 'none';
  const input = { active: false, x: 0, y: 0, vx: 0, vy: 0, swirl: 0 };
  host.innerHTML = heading('03 / A little momentum goes a long way', 'Brush through the field. Your movement transfers velocity to nearby particles; the rest of the field stays undisturbed.', '<label class="tool-label">Quality <select data-quality aria-label="Particle quality"><option value="high">High · 4,200 points</option><option value="low">Low · 1,200 points</option></select></label>') + `<div class="study-layout"><div class="canvas-wrap"><span class="canvas-corner">LOCAL FLOW / VELOCITY FIELD</span><div class="canvas-bottom"><span>Brush · Stir · Let go</span><span data-count>4,200 POINTS</span></div></div><aside class="controls" aria-label="Particle controls"><div><h3>Disturb a small region</h3><p>A quick brush gives a stronger push. A held gesture stirs the same local region.</p></div><label class="control"><span>Horizontal point <output data-x>0.0</output></span><input data-anchor-x type="range" min="-2.8" max="2.8" step="0.1" value="0" aria-label="Field horizontal point"></label><label class="control"><span>Vertical point <output data-y>0.0</output></span><input data-anchor-y type="range" min="-1.6" max="1.6" step="0.1" value="0" aria-label="Field vertical point"></label><label class="control"><span>Strength <output data-strength-value>1.0</output></span><input data-strength type="range" min="0.3" max="2" step="0.1" value="1" aria-label="Field input strength"></label><div class="control-buttons"><button class="action-button" data-push>Push right →</button><button class="quiet-button" data-swirl>Stir left ↶</button><button class="quiet-button" data-let-go>Let go</button></div><p class="status" role="status">At rest. Brush the field or send a local pulse.</p><p class="rule">Canvas keyboard: arrows choose a point. Space sends a pulse; Escape lets go. Touch: drag sideways, swipe vertically to scroll.</p></aside></div><div class="mechanism-note"><p><strong>Mechanism.</strong> Seeded particles carry individual positions and velocities. Local input adds a signed push and curl; damping removes energy after release while a weak restoring force brings the field home.</p><p><strong>Cost & limit.</strong> One point draw call, CPU integration, no post-processing or fluid solver. Low quality cuts the population and pixel ratio. Reduced motion shows the chosen local disturbance without continuous simulation.</p></div>`;
  const wrap = host.querySelector('.canvas-wrap'), status = host.querySelector('.status');
  const quality = host.querySelector('[data-quality]'), xInput = host.querySelector('[data-anchor-x]'), yInput = host.querySelector('[data-anchor-y]'), strengthInput = host.querySelector('[data-strength]');
  const material = new THREE.PointsMaterial({ size: .035, vertexColors: true, transparent: true, opacity: .92, depthWrite: false, sizeAttenuation: true });
  const ringMaterial = new THREE.MeshBasicMaterial({ color: '#f7b18c', transparent: true, opacity: .8, side: THREE.DoubleSide, depthTest: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(.065, .082, 32), ringMaterial);
  ring.position.z = .5;
  function setStatus(text) { status.textContent = failed ? 'Live rendering unavailable. Switch study and return to retry.' : text; }
  function syncControls() {
    xInput.value = String(input.x); yInput.value = String(input.y);
    host.querySelector('[data-x]').textContent = input.x.toFixed(1); host.querySelector('[data-y]').textContent = input.y.toFixed(1); host.querySelector('[data-strength-value]').textContent = Number(strengthInput.value).toFixed(1);
    ring.position.x = input.x; ring.position.y = input.y;
  }
  function apply() {
    if (dead || failed) return;
    syncControls();
    if (reduced) { staticParticles(state, input.x, input.y, input.active ? Number(strengthInput.value) : 0); geometry.attributes.position.needsUpdate = true; stage?.render(); }
    else stage?.wake();
  }
  function end(reason = 'explicit-release') {
    const pointerOnly = ['resize', 'pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave', 'canvas-blur'].includes(reason);
    if (pointerOnly && inputOwner !== 'pointer') { stage?.recordInputEvent('particle-intent-preserved', { cause: reason, inputOwner, active: input.active, pulseSeconds: pulse }); return; }
    stage?.recordInputEvent('particle-release', { cause: reason, inputOwner, activeBefore: input.active });
    inputOwner = 'none'; grabbing = false; input.active = false; input.vx = input.vy = input.swirl = 0; pulse = 0; setStatus(reduced ? 'Released. The still field is restored.' : 'Released. Momentum is decaying.'); if (state) apply();
  }
  function rebuild() {
    release();
    state = makeParticles(quality.value === 'high' ? 4200 : 1200);
    const next = new THREE.BufferGeometry();
    next.setAttribute('position', new THREE.BufferAttribute(state.positions, 3).setUsage(THREE.DynamicDrawUsage));
    const colors = new Float32Array(state.positions.length), warm = new THREE.Color('#f1ad83'), cool = new THREE.Color('#9abcc6');
    for (let i = 0; i < state.positions.length / 3; i++) (i % 6 === 0 ? warm : cool).toArray(colors, i * 3);
    next.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.dispose(); geometry = next;
    if (points) points.geometry = geometry;
    host.querySelector('[data-count]').textContent = `${state.positions.length / 3 === 4200 ? '4,200' : '1,200'} POINTS`;
    if (stage) { stage.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, quality.value === 'high' ? 1.6 : 1)); stage.resize(); }
    setStatus('Field rebuilt at rest. Ready for a new gesture.'); apply();
  }
  function sendPulse(kind, owner = 'dom') {
    release('new-pulse'); inputOwner = owner; input.x = Number(xInput.value); input.y = Number(yInput.value); input.active = true;
    const strength = Number(strengthInput.value); input.vx = kind === 'push' ? 5 * strength : 0; input.vy = 0; input.swirl = kind === 'push' ? 0 : -12 * strength;
    pulse = .32; sampleTime = performance.now(); stage?.recordInputEvent('pulse-applied', { inputOwner, kind, pulseSeconds: pulse }); setStatus(reduced ? 'Still disturbance shown at the selected point. Let go restores the field.' : 'Local pulse sent. The field will settle on its own.'); apply();
  }
  try {
    rebuild(); points = new THREE.Points(geometry, material); points.frustumCulled = false;
    stage = createStage(wrap, life, {
      onAudit,
      onFrame(dt) {
        if (reduced) return false;
        if (pulse > 0) { pulse -= dt; if (pulse <= 0) { inputOwner = 'none'; input.active = false; input.vx = input.vy = input.swirl = 0; } }
        else if (!grabbing && performance.now() - sampleTime > 100) { inputOwner = 'none'; input.active = false; input.vx = input.vy = input.swirl = 0; }
        const energy = stepParticles(state, input, dt); geometry.attributes.position.needsUpdate = true;
        if (!input.active && energy < .001) { state.positions.set(state.rest); state.velocities.fill(0); setStatus('At rest. Ready for another gesture.'); return false; }
        return true;
      },
      onSuspend(reason) { release(reason); }, onResize() { release('resize'); },
      onLost() { failed = true; unavailable(wrap, status); host.querySelectorAll('.controls button,.controls input,select').forEach(el => el.disabled = true); },
    });
    stage.canvas.setAttribute('aria-label', 'Interactive particle field. Arrow keys choose a point. Space sends a local pulse. Escape lets go.');
    stage.scene.add(points, ring);
    function brush(event, held) {
      const p = stage.point(event), now = performance.now(), elapsed = Math.max(.008, Math.min(.06, (now - sampleTime) / 1000));
      const nextX = clamp(p.x, -3.7, 3.7), nextY = clamp(p.y, -2.3, 2.3), strength = Number(strengthInput.value);
      input.vx = sampleTime && now - sampleTime < 120 ? clamp((nextX - input.x) / elapsed, -14, 14) * strength : 0;
      input.vy = sampleTime && now - sampleTime < 120 ? clamp((nextY - input.y) / elapsed, -14, 14) * strength : 0;
      inputOwner = 'pointer'; input.x = nextX; input.y = nextY; input.active = true; input.swirl = (held ? 8 : 2) * strength; pulse = 0; sampleTime = now;
      setStatus(reduced ? 'Still local disturbance follows the chosen point.' : held ? 'Stirring locally. Release to remove the force.' : 'Your brush transfers velocity to nearby points.'); apply();
    }
    release = captureController(stage.canvas, life, {
      start(event) { grabbing = true; brush(event, true); }, move(event) { brush(event, true); }, hover(event) { brush(event, false); }, end,
    });
    life.on(stage.canvas, 'keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) return;
      event.preventDefault(); if (event.key === ' ') { if (!event.repeat) sendPulse('push', 'keyboard'); return; }
      release(); input.x = clamp(input.x + (event.key === 'ArrowRight' ? .3 : event.key === 'ArrowLeft' ? -.3 : 0), -2.8, 2.8); input.y = clamp(input.y + (event.key === 'ArrowUp' ? .3 : event.key === 'ArrowDown' ? -.3 : 0), -1.6, 1.6); syncControls(); stage.render(); setStatus('Point selected. Press Space to send a pulse.');
    });
    stage.render();
  } catch {
    failed = true; geometry.dispose(); material.dispose(); ring.geometry.dispose(); ringMaterial.dispose(); unavailable(wrap, status);
    host.querySelectorAll('.controls button,.controls input,select').forEach(el => el.disabled = true);
  }
  for (const el of [xInput, yInput, strengthInput]) life.on(el, 'input', () => { const x = Number(xInput.value), y = Number(yInput.value); release(); input.x = x; input.y = y; syncControls(); stage?.render(); setStatus('Point selected. Send a pulse to disturb the field.'); });
  life.on(quality, 'change', rebuild);
  life.on(host.querySelector('[data-push]'), 'click', () => sendPulse('push'));
  life.on(host.querySelector('[data-swirl]'), 'click', () => sendPulse('swirl'));
  life.on(host.querySelector('[data-let-go]'), 'click', () => release());
  function reset() { if (dead) return; release(); input.x = input.y = 0; strengthInput.value = '1'; if (state) { state.positions.set(state.rest); state.velocities.fill(0); geometry.attributes.position.needsUpdate = true; } syncControls(); stage?.render(); setStatus('Reset. The original field is at rest.'); }
  life.on(host.querySelector('[data-reset]'), 'click', reset);
  return { reset, setReducedMotion(value) { if (dead) return; release(); reduced = value; if (state) { state.positions.set(state.rest); state.velocities.fill(0); } apply(); }, destroy() { if (dead) return; dead = true; life.destroy(); if (!stage) { geometry.dispose(); material.dispose(); ring.geometry.dispose(); ringMaterial.dispose(); } host.replaceChildren(); } };
}
