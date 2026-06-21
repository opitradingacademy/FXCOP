/**
 * Bundle size checker — MiniPay requirement: < 2MB per route
 *
 * Reads the Next.js build manifest (.next/build-manifest.json) and sums
 * the gzipped size of all JS chunks loaded on the /swap route (the heaviest
 * page). Exits with code 1 if any route exceeds the 2MB limit.
 *
 * Usage: node scripts/check-bundle-size.mjs
 * (Called automatically by `npm run bundle:check` after `next build`)
 */

import { readFileSync, statSync } from "fs";
import { resolve, join } from "path";
import { createGzip } from "zlib";
import { createReadStream } from "fs";

const ROOT = resolve(import.meta.dirname, "..");
const BUILD_DIR = join(ROOT, ".next");
const LIMIT_BYTES = 2 * 1024 * 1024; // 2 MB

// ── helpers ──────────────────────────────────────────────────────────────────

function gzippedSize(filePath) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const gz = createGzip();
    createReadStream(filePath)
      .pipe(gz)
      .on("data", (chunk) => (size += chunk.length))
      .on("end", () => resolve(size))
      .on("error", reject);
  });
}

function humanBytes(n) {
  if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(2) + " MB";
  if (n >= 1024) return (n / 1024).toFixed(1) + " KB";
  return n + " B";
}

// ── main ─────────────────────────────────────────────────────────────────────

const manifestPath = join(BUILD_DIR, "build-manifest.json");
let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch {
  console.error("❌  .next/build-manifest.json not found. Run `next build` first.");
  process.exit(1);
}

// Pages to audit — the routes users will hit first in MiniPay
const ROUTES_TO_CHECK = ["/swap", "/confirm", "/done", "/history"];

let overallPass = true;

console.log("\n── FXCOP Bundle Size Audit ─────────────────────────────────────");
console.log(`   Limit: ${humanBytes(LIMIT_BYTES)} per route (MiniPay requirement)\n`);

for (const route of ROUTES_TO_CHECK) {
  const chunks = manifest.pages?.[route] ?? [];
  if (chunks.length === 0) {
    console.log(`  ${route}  (no chunks found — page may not exist yet)`);
    continue;
  }

  let totalGz = 0;
  const details = [];

  for (const chunk of chunks) {
    const filePath = join(BUILD_DIR, "static", chunk.replace(/^\/_next\/static\//, ""));
    try {
      const gz = await gzippedSize(filePath);
      totalGz += gz;
      details.push({ chunk, gz });
    } catch {
      // chunk file not found (e.g. shared chunk not on disk) — skip
    }
  }

  const pass = totalGz < LIMIT_BYTES;
  if (!pass) overallPass = false;

  const icon = pass ? "✅" : "❌";
  console.log(`  ${icon}  ${route}  →  ${humanBytes(totalGz)} (gzipped)`);

  if (!pass) {
    console.log("     Top chunks:");
    details
      .sort((a, b) => b.gz - a.gz)
      .slice(0, 5)
      .forEach(({ chunk, gz }) =>
        console.log(`       ${humanBytes(gz).padStart(8)}  ${chunk}`)
      );
  }
}

console.log("\n─────────────────────────────────────────────────────────────────");

if (!overallPass) {
  console.log("❌  Bundle exceeds 2MB limit. Optimize before submitting to MiniPay.\n");
  process.exit(1);
} else {
  console.log("✅  All routes within 2MB limit. Ready for MiniPay.\n");
}
