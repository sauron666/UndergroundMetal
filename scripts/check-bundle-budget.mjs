#!/usr/bin/env node
/**
 * Bundle size budget guard.
 *
 * Reads .next/build-manifest.json and computes the on-disk size of the
 * shared client bundle (the chunks every page loads). Fails when it
 * exceeds SHARED_BUDGET_KB.
 *
 * Per-route precise budgeting requires parsing Next's runtime First Load JS
 * calculation; we don't redo that here. Inspect the `next build` table for
 * outliers manually, or wire a Next plugin like `@next/bundle-analyzer`.
 *
 * Usage:
 *   pnpm build && node scripts/check-bundle-budget.mjs
 */

import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

// On-disk uncompressed; gzipped equivalent is ~30-35% of this. Calibrated
// to current Next 15 runtime. Tighten if you can.
const SHARED_BUDGET_KB = 360;

const cwd = process.cwd();

async function main() {
  const buildManifestPath = resolve(cwd, ".next", "build-manifest.json");
  let buildManifest;
  try {
    buildManifest = JSON.parse(await readFile(buildManifestPath, "utf8"));
  } catch (e) {
    console.error("Could not read .next/build-manifest.json — run `pnpm build` first.");
    process.exit(2);
  }

  const shared =
    buildManifest.pages?.["/_app"] ??
    buildManifest.rootMainFiles ??
    [];
  if (!Array.isArray(shared) || shared.length === 0) {
    console.warn("No shared chunks found in build-manifest.json.");
    process.exit(0);
  }

  let total = 0;
  for (const c of shared) {
    try {
      const s = await stat(resolve(cwd, ".next", c));
      total += s.size;
    } catch {
      // skip missing
    }
  }
  const kb = total / 1024;
  console.log(`shared first-load chunks (uncompressed on disk): ${kb.toFixed(1)} kB`);
  console.log(`budget: ${SHARED_BUDGET_KB} kB`);
  if (kb > SHARED_BUDGET_KB) {
    console.error(`\nFAIL: shared bundle exceeds budget`);
    process.exit(1);
  }
  console.log("Bundle budget OK.");
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
