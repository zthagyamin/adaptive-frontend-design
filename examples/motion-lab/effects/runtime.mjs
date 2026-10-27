import * as THREE from '/vendor/three.module.js';
import { scope, createFrameLoop } from './lifecycle.mjs';
export { THREE };
export { scope };

export function summarizeSamples(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return { samples: values.length, meanMs: values.reduce((a, b) => a + b, 0) / values.length, p95Ms: sorted[Math.ceil(sorted.length * .95) - 1], maxMs: sorted.at(-1) };
}

// Read counters owned by Three.js, never synthetic allocation totals. The clock
// samples CPU simulation + render submission, not GPU completion or display time.
export function createRendererAudit(renderer, { clock = () => performance.now(), capacity = 240 } = {}) {
  const intervals = [], cpu = [];
  const events = [];
  let previous = null, started = null, totalFrames = 0;
  const append = (list, value) => { list.push(value); if (list.length > capacity) list.shift(); };
  return {
    event(reason, detail = {}) { events.push({ reason, atMs: clock(), ...detail }); if (events.length > 16) events.shift(); },
    beginFrame(timestamp) {
      if (previous !== null) append(intervals, Math.max(0, timestamp - previous));
      previous = timestamp; started = clock();
    },
    finishFrame() { if (started !== null) { append(cpu, Math.max(0, clock() - started)); totalFrames++; started = null; } },
    breakSequence() { previous = null; },
    snapshot(phase = 'active') {
      return {
        phase,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        lastRenderCalls: renderer.info.render.calls,
        lastRenderTriangles: renderer.info.render.triangles,
        lastRenderPoints: renderer.info.render.points,
        drawingBufferWidth: renderer.domElement.width,
        drawingBufferHeight: renderer.domElement.height,
        pixelRatio: renderer.getPixelRatio(),
        totalSampledFrames: totalFrames,
        interval: summarizeSamples(intervals),
        cpu: summarizeSamples(cpu),
        sampleWindowLimit: capacity,
        recentEvents: events.map(event => ({ ...event })),
      };
    },
  };
}

export function disposeOwnedResources(scene, renderer) {
  const resources = new Set();
  scene.traverse(object => {
    if (object.geometry) resources.add(object.geometry);
    if (Array.isArray(object.material)) object.material.forEach(material => resources.add(material));
    else if (object.material) resources.add(object.material);
  });
  for (const resource of resources) resource.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
}

export function createStage(wrap, life, { onFrame, onSuspend, onResize, onLost, onAudit, dpr = 1.6 }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#10181f');
  const camera = new THREE.PerspectiveCamera(37, 1, .1, 50);
  camera.position.set(0, 0, 10);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, dpr));
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  wrap.prepend(canvas);
  const audit = createRendererAudit(renderer);
  let disposed = false, active = true, intersecting = true, contextLost = false, focused = true;
  function canRun() { return !disposed && !document.hidden && intersecting && active && !contextLost && focused; }
  function render() { if (!disposed && !contextLost) { renderer.render(scene, camera); audit.finishFrame(); } }
  const loop = createFrameLoop({
    request: callback => requestAnimationFrame(timestamp => { if (canRun()) audit.beginFrame(timestamp); callback(timestamp); }),
    cancel: cancelAnimationFrame,
    allowed: canRun,
    step: dt => { const again = onFrame(dt); if (!again) audit.breakSequence(); return again; },
    render,
  });
  function wake() { loop.wake(); }
  function suspend(reason = 'suspend') { loop.stop(); audit.breakSequence(); audit.event(reason); onSuspend?.(reason); }
  function resize() {
    if (disposed) return;
    const { width, height } = wrap.getBoundingClientRect();
    audit.event('resize', { width, height });
    renderer.setSize(Math.max(1, width), Math.max(1, height), false);
    camera.aspect = width / Math.max(1, height);
    camera.position.z = camera.aspect < 1.1 ? 12.8 : 10;
    camera.updateProjectionMatrix();
    onResize?.(); render();
  }
  const observer = new ResizeObserver(resize); observer.observe(wrap);
  const intersection = new IntersectionObserver(entries => { intersecting = entries[0].isIntersecting; if (intersecting) wake(); else suspend('offscreen'); });
  intersection.observe(wrap);
  life.on(document, 'visibilitychange', () => { if (document.hidden) suspend('document-hidden'); else wake(); });
  life.on(window, 'blur', () => { focused = false; suspend('window-blur'); });
  life.on(window, 'focus', () => { focused = true; wake(); });
  life.on(canvas, 'webglcontextlost', event => { event.preventDefault(); contextLost = true; suspend('context-lost'); onLost?.(); onAudit?.({ phase: 'context-lost', snapshot: audit.snapshot('context-lost') }); });
  // Re-entering the study creates fresh renderer resources after a context loss.
  life.add(() => {
    disposed = true; loop.destroy(); audit.breakSequence(); onSuspend?.('destroy'); observer.disconnect(); intersection.disconnect();
    disposeOwnedResources(scene, renderer);
    // Geometry dispose listeners synchronously update renderer.info.memory.
    // Preserve the actual final info after all owned resource disposal completes.
    onAudit?.({ phase: 'disposed', snapshot: audit.snapshot('disposed') });
    canvas.remove();
  });
  resize();
  onAudit?.({ phase: 'ready', read: () => audit.snapshot(contextLost ? 'context-lost' : disposed ? 'disposed' : 'active') });
  const raycaster = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();
  return {
    scene, camera, renderer, canvas, wake, render, resize, recordInputEvent: (reason, detail) => audit.event(reason, detail),
    setActive(value) { active = value; if (value) wake(); else suspend('inactive'); },
    point(event, object) {
      const bounds = canvas.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1), camera);
      if (object) {
        object.updateMatrixWorld();
        plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1).applyQuaternion(object.quaternion), object.position);
      } else plane.set(new THREE.Vector3(0, 0, 1), 0);
      raycaster.ray.intersectPlane(plane, hit);
      if (object) object.worldToLocal(hit);
      return { x: hit.x, y: hit.y };
    },
  };
}

export function heading(title, text, tools = '') {
  return `<div class="effect-heading"><div><h2>${title}</h2><p>${text}</p></div><div class="effect-tools">${tools}<button class="quiet-button" data-reset>Reset study ↺</button></div></div>`;
}
export function unavailable(wrap, status) {
  wrap.querySelector('canvas')?.setAttribute('aria-hidden', 'true');
  const panel = document.createElement('div'); panel.className = 'failure';
  panel.innerHTML = '<h3>The live study is unavailable.</h3><p>WebGL could not be started or its context was lost. The written mechanism and controls remain here. Choose another study and return to retry with a fresh renderer.</p>';
  wrap.append(panel); status.textContent = 'Live rendering unavailable. Switch study and return to retry.';
}

export function captureController(canvas, life, { start, move, end, hover }) {
  let pointerId = null;
  function release(reason = 'explicit-release') {
    const old = pointerId; pointerId = null;
    if (old !== null && canvas.hasPointerCapture(old)) canvas.releasePointerCapture(old);
    end(reason);
  }
  life.on(canvas, 'pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || pointerId !== null) return;
    pointerId = event.pointerId; canvas.setPointerCapture(pointerId); canvas.focus({ preventScroll: true }); start(event);
  });
  life.on(canvas, 'pointermove', event => { if (pointerId === event.pointerId) move(event); else if (pointerId === null && event.pointerType === 'mouse') hover?.(event); });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) life.on(canvas, name, event => { if (pointerId === event.pointerId) release(name); });
  life.on(canvas, 'pointerleave', () => { if (pointerId === null) end('pointerleave'); });
  life.on(window, 'blur', () => release('window-blur'));
  life.on(canvas, 'blur', () => release('canvas-blur'));
  life.on(canvas, 'keydown', event => { if (event.key === 'Escape') { event.preventDefault(); release('escape'); } });
  life.add(() => release('destroy'));
  return release;
}
