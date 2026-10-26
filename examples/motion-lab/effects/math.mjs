export const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));
export const smooth = n => { const p = clamp(n); return p * p * (3 - 2 * p); };
export const chapterAt = progress => Math.min(2, Math.floor(clamp(progress) * 3));
export const influence = (x, y, anchorX, anchorY, radius) => Math.exp(-((x - anchorX) ** 2 + (y - anchorY) ** 2) / (2 * radius ** 2));
export function springStep(position, velocity, target, dt, stiffness = 95, damping = 19) {
  const step = Math.min(Math.max(dt, 0), 1 / 30);
  // Substeps bound explicit integration at both quality levels.
  for (let i = 0; i < 3; i++) { velocity += ((target - position) * stiffness - velocity * damping) * step / 3; position += velocity * step / 3; }
  return [position, velocity];
}
export function seededRandom(seed = 37) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
export function makeParticles(count) {
  const random = seededRandom();
  const positions = new Float32Array(count * 3), rest = new Float32Array(count * 3), velocities = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const a = random() * Math.PI * 2, r = Math.sqrt(random());
    rest[i * 3] = Math.cos(a) * r * 3.7;
    rest[i * 3 + 1] = Math.sin(a) * r * 2.3;
    rest[i * 3 + 2] = (random() - .5) * .28;
  }
  positions.set(rest);
  return { positions, rest, velocities };
}
export function stepParticles(state, input, dt) {
  const h = Math.min(Math.max(dt, 0), 1 / 30), damping = Math.exp(-3.4 * h);
  let energy = 0;
  for (let i = 0; i < state.positions.length; i += 3) {
    const x = state.positions[i], y = state.positions[i + 1];
    const weight = input.active ? influence(x, y, input.x, input.y, .9) : 0;
    const dx = x - input.x, dy = y - input.y;
    const force = [input.vx * 2.8 - dy * input.swirl, input.vy * 2.8 + dx * input.swirl, .6 * input.swirl];
    for (let axis = 0; axis < 3; axis++) {
      const j = i + axis;
      state.velocities[j] = (state.velocities[j] + ((state.rest[j] - state.positions[j]) * 2.8 + weight * force[axis]) * h) * damping;
      state.positions[j] += state.velocities[j] * h;
      energy = Math.max(energy, Math.abs(state.velocities[j]), Math.abs(state.positions[j] - state.rest[j]));
    }
  }
  return energy;
}
export function staticParticles(state, x, y, strength = 1) {
  state.velocities.fill(0);
  for (let i = 0; i < state.positions.length; i += 3) {
    const dx = state.rest[i] - x, dy = state.rest[i + 1] - y;
    const w = influence(state.rest[i], state.rest[i + 1], x, y, 1.1) * strength;
    state.positions[i] = state.rest[i] - dy * w * .65;
    state.positions[i + 1] = state.rest[i + 1] + dx * w * .65;
    state.positions[i + 2] = state.rest[i + 2] + w * .25;
  }
}
