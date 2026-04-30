/**
 * Wilson lower bound on the upvote share.
 *
 * Returns a number in [0, 1] representing the conservative estimate of the
 * true upvote rate at 95% confidence given the observed (up, down) sample.
 * Used by getCommentTree to rank "best" comments — stable for low-vote
 * threads where simple (up - down) is noisy.
 */
export function wilsonScore(up: number, down: number): number {
  const n = up + down;
  if (n === 0) return 0;
  const z = 1.96;
  const phat = up / n;
  return (
    (phat + (z * z) / (2 * n) -
      z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * n)) / n)) /
    (1 + (z * z) / n)
  );
}
