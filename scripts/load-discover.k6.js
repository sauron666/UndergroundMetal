/**
 * k6 load test for the discovery endpoint.
 *
 * Usage:
 *   k6 run -e BASE_URL=https://undergroundmetal.example scripts/load-discover.k6.js
 *
 * What it exercises:
 *   - /api/discover (cached + uncached)
 *   - /api/health
 *   - /api/bands/search
 *
 * Targets: at 50 RPS sustained, p95 < 800ms for discovery cache-hits and
 * p95 < 200ms for /api/health. Discovery cold misses depend on Anthropic
 * latency and are tracked separately.
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

const discoverHit = new Trend("discover_cache_hit_ms");
const healthMs = new Trend("health_ms");

export const options = {
  scenarios: {
    smoke: {
      executor: "constant-vus",
      vus: 5,
      duration: "30s",
      exec: "smoke",
    },
    ramp: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 20 },
        { duration: "1m", target: 50 },
        { duration: "30s", target: 0 },
      ],
      exec: "ramp",
      startTime: "35s",
    },
  },
  thresholds: {
    "http_req_failed{scenario:smoke}": ["rate<0.01"],
    "health_ms": ["p(95)<200"],
    "discover_cache_hit_ms": ["p(95)<800"],
  },
};

const QUERIES = [
  "atmospheric black metal",
  "doom from oregon",
  "bulgarian thrash",
  "post-metal slowcore",
  "dungeon synth winter",
];

export function smoke() {
  const r = http.get(`${BASE_URL}/api/health`);
  healthMs.add(r.timings.duration);
  check(r, { "health 200": (res) => res.status === 200 });
  sleep(1);
}

export function ramp() {
  const q = QUERIES[Math.floor(Math.random() * QUERIES.length)];
  const r = http.post(
    `${BASE_URL}/api/discover`,
    JSON.stringify({ query: q, limit: 8 }),
    { headers: { "content-type": "application/json" } }
  );
  // The first request per query primes the cache; subsequent are hits.
  if (r.json("cached") === true) {
    discoverHit.add(r.timings.duration);
  }
  check(r, {
    "discover ok": (res) => res.status === 200,
    "has tiers": (res) => {
      const body = res.json();
      return body && Array.isArray(body.mainstream) && Array.isArray(body.underground);
    },
  });
  sleep(Math.random() * 2);
}
