import { THREE, scope, createStage, captureController, heading, unavailable } from './runtime.mjs';
import { clamp, influence, springStep } from './math.mjs';

export function createEffect({ host, reducedMotion, onAudit }) {
  const life = scope();
  let reduced = reducedMotion, dead = false, failed = false, stage, release = () => {};
  let anchor = { x: 0, y: 0 }, drag = null, offset = { x: 0, y: 0 }, force = 0, inputOwner = 'none';
  host.innerHTML = heading('02 / A surface remembers your hand', 'Move over the mesh, then grab a patch and pull it. Release the patch to let its stored tension settle.') + `<div class="study-layout"><div class="canvas-wrap"><span class="canvas-corner">ELASTIC MEMBRANE / LIVE GEOMETRY</span><div class="canvas-bottom"><span>Hover · Drag · Release</span><span>Arrow keys + Space</span></div></div><aside class="controls" aria-label="Surface controls"><div><h3>Work a single patch</h3><p>The patch under your first press stays in your hand. Change direction as often as you like.</p></div><label class="control"><span>Horizontal point <output data-x>0.0</output></span><input data-anchor-x type="range" min="-2.7" max="2.7" step="0.1" value="0" aria-label="Surface horizontal point"></label><label class="control"><span>Vertical point <output data-y>0.0</output></span><input data-anchor-y type="range" min="-1.5" max="1.5" step="0.1" value="0" aria-label="Surface vertical point"></label><label class="control"><span>Lift <output data-depth>1.0</output></span><input data-lift type="range" min="0.3" max="1.6" step="0.1" value="1" aria-label="Surface lift"></label><div class="control-buttons"><button class="action-button" data-hold aria-pressed="false">Hold a lift</button><button class="quiet-button" data-release>Release patch</button></div><p class="status" role="status">Ready. Choose a point or touch the surface.</p><p class="rule">Touch: drag sideways. Vertical swipes keep page scrolling. Escape releases the patch.</p></aside></div><div class="mechanism-note"><p><strong>Mechanism.</strong> An original, subdivided mesh receives a distance-weighted displacement around the grabbed rest-space point. The same vertices keep their velocity when you release or reverse direction.</p><p><strong>Boundary.</strong> This is an elastic visual model, not a cloth solver. No collisions, fabric stress, physical material claim, textures, or shadow passes. Reduced motion presents the same local lift as a still shape.</p></div>`;
  const wrap = host.querySelector('.canvas-wrap'), status = host.querySelector('.status'), hold = host.querySelector('[data-hold]');
  const xInput = host.querySelector('[data-anchor-x]'), yInput = host.querySelector('[data-anchor-y]'), depthInput = host.querySelector('[data-lift]');
  const geometry = new THREE.PlaneGeometry(7.2, 4.3, 64, 40);
  const positions = geometry.attributes.position.array, rest = positions.slice(), velocities = new Float32Array(positions.length);
  const material = new THREE.MeshStandardMaterial({ color: '#eaa27f', metalness: .22, roughness: .47, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.set(-.38, -.08, -.14);
  const wire = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: '#4c2720', wireframe: true, transparent: true, opacity: .32, depthWrite: false }));
  wire.rotation.copy(mesh.rotation); wire.position.z = .008;
  function setStatus(text) { status.textContent = failed ? 'Live rendering unavailable. Switch study and return to retry.' : text; }
  function syncControls() {
    xInput.value = String(anchor.x); yInput.value = String(anchor.y);
    host.querySelector('[data-x]').textContent = anchor.x.toFixed(1); host.querySelector('[data-y]').textContent = anchor.y.toFixed(1); host.querySelector('[data-depth]').textContent = Number(depthInput.value).toFixed(1);
    hold.setAttribute('aria-pressed', String(force > 0 && !drag));
  }
  function updateGeometry(dt, immediate = false) {
    let energy = 0;
    for (let i = 0; i < positions.length; i += 3) {
      const weight = influence(rest[i], rest[i + 1], anchor.x, anchor.y, .88);
      for (let axis = 0; axis < 3; axis++) {
        const target = rest[i + axis] + weight * (axis === 0 ? offset.x * force : axis === 1 ? offset.y * force : force);
        if (immediate) { positions[i + axis] = target; velocities[i + axis] = 0; }
        else { const result = springStep(positions[i + axis], velocities[i + axis], target, dt); positions[i + axis] = result[0]; velocities[i + axis] = result[1]; }
        energy = Math.max(energy, Math.abs(positions[i + axis] - target), Math.abs(velocities[i + axis]));
      }
    }
    geometry.attributes.position.needsUpdate = true; geometry.computeVertexNormals();
    return energy;
  }
  function apply() { if (dead || failed) return; syncControls(); if (reduced) { updateGeometry(0, true); stage?.render(); } else stage?.wake(); }
  function end(reason = 'explicit-release') {
    const pointerOnly = ['resize', 'pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave', 'canvas-blur'].includes(reason);
    if (pointerOnly && inputOwner !== 'pointer') { stage?.recordInputEvent('surface-intent-preserved', { cause: reason, inputOwner, force }); return; }
    stage?.recordInputEvent('surface-release', { cause: reason, forceBefore: force, draggingBefore: Boolean(drag), inputOwner });
    inputOwner = 'none'; drag = null; force = 0; offset = { x: 0, y: 0 }; syncControls(); setStatus(reduced ? 'Released. The rest shape is shown immediately.' : 'Released. The surface is returning to rest.'); apply();
  }
  try {
    stage = createStage(wrap, life, {
      onAudit,
      onFrame(dt) { const energy = updateGeometry(dt); if (force === 0 && energy < .001) { positions.set(rest); velocities.fill(0); geometry.attributes.position.needsUpdate = true; geometry.computeVertexNormals(); setStatus('At rest. Ready for another gesture.'); return false; } return energy > .001; },
      onSuspend(reason) { release(reason); },
      onResize() { release('resize'); },
      onLost() { failed = true; unavailable(wrap, status); host.querySelectorAll('.controls button,.controls input').forEach(el => el.disabled = true); },
    });
    stage.canvas.setAttribute('aria-label', 'Elastic mesh. Arrow keys choose a patch. Space holds or releases a lift. Escape releases.');
    stage.scene.add(mesh, wire, new THREE.HemisphereLight('#eaf5ed', '#293a48', 2.4));
    const key = new THREE.DirectionalLight('#fff2db', 4); key.position.set(-3, 4, 7); stage.scene.add(key);
    const rim = new THREE.DirectionalLight('#8cbdca', 2.2); rim.position.set(5, -2, 3); stage.scene.add(rim);
    const point = e => { const p = stage.point(e, mesh); return { x: clamp(p.x, -3.4, 3.4), y: clamp(p.y, -2, 2) }; };
    release = captureController(stage.canvas, life, {
      start(event) { const p = point(event); inputOwner = 'pointer'; anchor = p; drag = p; offset = { x: 0, y: 0 }; force = Number(depthInput.value); setStatus('Patch grabbed. Pull sideways or change direction.'); apply(); },
      move(event) { if (!drag) return; const p = point(event); offset = { x: clamp(p.x - drag.x, -1.7, 1.7), y: clamp(p.y - drag.y, -1.3, 1.3) }; force = Number(depthInput.value); apply(); },
      hover(event) { inputOwner = 'pointer'; anchor = point(event); offset = { x: 0, y: 0 }; force = .38; setStatus('A light local pressure follows your pointer.'); apply(); },
      end,
    });
    life.on(stage.canvas, 'keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) return;
      event.preventDefault(); if (event.repeat && event.key === ' ') return;
      if (event.key === ' ') force = force > 0 ? 0 : Number(depthInput.value);
      else { anchor.x = clamp(anchor.x + (event.key === 'ArrowRight' ? .3 : event.key === 'ArrowLeft' ? -.3 : 0), -2.7, 2.7); anchor.y = clamp(anchor.y + (event.key === 'ArrowUp' ? .3 : event.key === 'ArrowDown' ? -.3 : 0), -1.5, 1.5); force = Number(depthInput.value); }
      inputOwner = force ? 'keyboard' : 'none'; drag = null; offset = { x: 0, y: 0 }; setStatus(force ? 'Holding a local lift at the selected point.' : 'Released.'); apply();
    });
    stage.render();
  } catch {
    failed = true; geometry.dispose(); material.dispose(); wire.material.dispose(); unavailable(wrap, status);
    host.querySelectorAll('.controls button,.controls input').forEach(el => el.disabled = true);
  }
  for (const input of [xInput, yInput, depthInput]) life.on(input, 'input', () => { const x = Number(xInput.value), y = Number(yInput.value); release('control-change'); inputOwner = 'dom'; anchor = { x, y }; force = Number(depthInput.value); setStatus('Holding a local lift at the selected point.'); apply(); });
  life.on(hold, 'click', () => { const held = force > 0 && (inputOwner === 'dom' || inputOwner === 'keyboard'); release('hold-button-start'); if (held) return; inputOwner = 'dom'; anchor = { x: Number(xInput.value), y: Number(yInput.value) }; force = Number(depthInput.value); stage?.recordInputEvent('hold-applied', { force, inputOwner }); setStatus('Holding a local lift. Change point or release.'); apply(); });
  life.on(host.querySelector('[data-release]'), 'click', () => release());
  function reset() { if (dead) return; release(); anchor = { x: 0, y: 0 }; depthInput.value = '1'; positions.set(rest); velocities.fill(0); geometry.attributes.position.needsUpdate = true; geometry.computeVertexNormals(); syncControls(); stage?.render(); setStatus('Reset to the original rest shape.'); }
  life.on(host.querySelector('[data-reset]'), 'click', reset);
  return { reset, setReducedMotion(value) { if (dead) return; const wasForce = force, wasOwner = inputOwner; release('motion-preference'); reduced = value; if (wasOwner === 'dom' || wasOwner === 'keyboard') { force = wasForce; inputOwner = wasOwner; } apply(); }, destroy() { if (dead) return; dead = true; life.destroy(); if (!stage) { geometry.dispose(); material.dispose(); wire.material.dispose(); } host.replaceChildren(); } };
}
