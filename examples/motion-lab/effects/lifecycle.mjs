export function scope() {
  const abort = new AbortController();
  const cleanups = [];
  return {
    on(target, type, callback, options = {}) { target.addEventListener(type, callback, { ...options, signal: abort.signal }); },
    add(cleanup) { cleanups.push(cleanup); },
    destroy() { abort.abort(); for (const fn of cleanups.splice(0).reverse()) fn(); },
  };
}

export function createFrameLoop({ request, cancel, allowed, step, render }) {
  let handle = null, previous = null, dead = false;
  function tick(now) {
    handle = null;
    if (dead || !allowed()) { previous = null; return; }
    const dt = previous === null ? 1 / 60 : Math.min(Math.max(0, (now - previous) / 1000), 1 / 30);
    previous = now;
    const again = step(dt);
    if (dead) return;
    render();
    if (again && allowed()) handle = request(tick); else previous = null;
  }
  return {
    wake() { if (!dead && allowed() && handle === null) handle = request(tick); },
    stop() { if (handle !== null) cancel(handle); handle = null; previous = null; },
    destroy() { dead = true; this.stop(); },
  };
}
