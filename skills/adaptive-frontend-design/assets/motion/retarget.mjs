/** Small optional scalar follower. No DOM, scheduling, or semantic state. */
function finite(...values) {
  if (!values.every(Number.isFinite)) throw new RangeError('Expected finite numbers');
}

/** Exact critically damped integration for a fixed target over dt seconds. */
export function criticalStep(state, target, dt, omega) {
  const { position, velocity } = state;
  finite(position, velocity, target, dt, omega);
  if (dt < 0 || omega <= 0) throw new RangeError('dt must be non-negative and omega positive');
  if (dt === 0) return { position, velocity };
  const offset = position - target;
  const term = (velocity + omega * offset) * dt;
  const decay = Math.exp(-omega * dt);
  return {
    position: target + (offset + term) * decay,
    velocity: (velocity - omega * term) * decay,
  };
}

/**
 * Optional retarget braking. Position is untouched; velocity is deliberately
 * constrained near a new target. This is not a claim of velocity continuity.
 * Compatible motion stays below omega * distance to avoid target overshoot.
 */
export function brakeForTarget(velocity, distance, omega) {
  finite(velocity, distance, omega);
  if (omega <= 0) throw new RangeError('omega must be positive');
  const compatible = Math.sign(velocity) === Math.sign(distance);
  const limit = omega * Math.abs(distance) * (compatible ? .9 : .65);
  return Math.sign(velocity) * Math.min(Math.abs(velocity), limit);
}
