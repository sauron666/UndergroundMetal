/**
 * Vector helpers used by the similar-bands and embeddings code.
 *
 * Pure functions — no DB, no fetches — so they're easy to unit test.
 */

export function jaccard<T>(a: T[], b: T[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Dot product. For unit-length vectors this equals cosine similarity.
 * Returns 0 on length mismatch — defensive against mixed-dimension vectors
 * stored over time (e.g. after switching embedding providers).
 */
export function dot(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/**
 * L2-normalise to unit length. Returns the original array (zero-vector case)
 * to avoid NaN propagation.
 */
export function normalise(vec: number[]): number[] {
  const mag = Math.sqrt(vec.reduce((s, x) => s + x * x, 0));
  if (mag === 0) return vec;
  return vec.map((x) => x / mag);
}
