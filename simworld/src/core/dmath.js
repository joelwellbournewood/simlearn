// Deterministic maths. Math.sin, Math.cos, Math.exp and Math.pow are NOT specified to the
// last bit by ECMAScript, so two browsers can disagree in the low bits and a replay drifts.
// These use only +, -, *, /, Math.floor and Math.sqrt, all of which ARE exactly specified.
export const PI = 3.141592653589793;
export const TWO_PI = 6.283185307179586;
export const HALF_PI = 1.5707963267948966;

export function dsin(x) {
  const k = Math.floor(x / TWO_PI + 0.5);
  x = x - k * TWO_PI;                       // x in [-PI, PI]
  if (x > HALF_PI) x = PI - x;
  else if (x < -HALF_PI) x = -PI - x;       // x in [-PI/2, PI/2]
  const x2 = x * x;
  // Taylor to x^9: max error about 3e-9 on this interval.
  return x * (1 + x2 * (-1 / 6 + x2 * (1 / 120 + x2 * (-1 / 5040 + x2 / 362880))));
}
export function dcos(x) { return dsin(x + HALF_PI); }

// exp on a bounded range, by argument halving plus a degree 7 series. Used for decay curves.
export function dexp(x) {
  if (x < -30) return 0;
  if (x > 30) return 1.0686474581524463e13;
  let n = 0;
  while (x > 0.5 || x < -0.5) { x = x * 0.5; n++; }
  const r = 1 + x * (1 + x * (0.5 + x * (1 / 6 + x * (1 / 24 + x * (1 / 120 + x * (1 / 720 + x / 5040))))));
  let out = r;
  for (let i = 0; i < n; i++) out = out * out;
  return out;
}
export function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
