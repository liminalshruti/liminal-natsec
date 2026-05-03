// Drives the running Vite dev server through every scripted demo beat and
// writes a self-contained HTML snapshot of each screen.
//
// Run via scripts/export-html/run.mjs — that wrapper boots the dev server, then
// invokes this script. You can also run this directly if the dev server is
// already up on :5173.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import { serializePage } from "./serialize.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "..", "export", "html", "screens");

const SCREENS = [
  { file: "screen-01-cold-open.html", title: "Phase 1 — Cold open", phase: 1 },
  { file: "screen-02-dark-gap.html", title: "Phase 2 — Dark gap", phase: 2 },
  { file: "screen-03-mmsi-churn.html", title: "Phase 3 — MMSI churn", phase: 3 },
  { file: "screen-04-signal-integrity.html", title: "Phase 4 — Signal Integrity contested", phase: 4 },
  { file: "screen-05-intent-refused.html", title: "Phase 5 — Intent REFUSED", phase: 5 },
  { file: "screen-06-doctrine-applied.html", title: "Phase 6 — Doctrine applied", phase: 6 },
  { file: "screen-idle-case-open.html", title: "Idle — case open at phase 1", phase: 1, openCase: true }
];

const BASE_URL = process.env.SNAPSHOT_BASE_URL ?? "http://localhost:5173";
const VIEWPORT = { width: 1680, height: 1024 };

async function main() {
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  for (const screen of SCREENS) {
    process.stdout.write(`  ${screen.file} … `);
    try {
      await driveAndSnapshot(page, screen);
      // Screens always include the WebGL canvas → use JPEG to keep file size
      // friendly for upload. Components don't have a canvas, so they use PNG.
      const { html, canvasCount, byteLength } = await serializePage(page, {
        title: `Liminal Custody — ${screen.title}`,
        canvasFormat: "jpeg",
        canvasQuality: 0.78
      });
      await writeFile(join(outDir, screen.file), html, "utf8");
      process.stdout.write(`ok (${canvasCount} canvas, ${(byteLength / 1024).toFixed(0)} KB)\n`);
    } catch (err) {
      process.stdout.write(`FAIL\n    ${err instanceof Error ? err.stack : String(err)}\n`);
    }
  }

  await browser.close();
}

async function driveAndSnapshot(page, screen) {
  // Cold-load every time so we don't carry localStorage rule state from a
  // previous beat — phase 6 in particular depends on whether the operator
  // wrote a rule at phase 5. The snapshot script is a stateless walk; if you
  // want "after rule fired" specifically, that's screen-06.
  await page.goto(BASE_URL, { waitUntil: "load" });
  // The replay controls render disabled until scenarioState is handed up by
  // MapWatchfloor, so we wait on the *enabled* Next button rather than just
  // any .replay-controls__btn — the disabled bouncer flickers visibility
  // briefly and produces flake at default state="visible".
  await page.waitForSelector("button[aria-label='Next beat']:not([disabled])", { timeout: 30_000 });

  // The Replay buttons live next to the command line. Click "Next beat"
  // (phase - 1) times to walk to the target phase. ReplayControls writes the
  // beat-anchored ISO timestamp into scenario state, which is what the map's
  // `phaseAllows()` gating reads.
  const advances = screen.phase - 1;
  for (let i = 0; i < advances; i++) {
    await page.click("button[aria-label='Next beat']");
    await page.waitForTimeout(120); // small debounce so React re-renders before next click
  }

  if (screen.openCase) {
    // Click the first alert in the Substrate panel to open a case.
    const firstAlert = await page.$(".panel--substrate [data-alert-id], .panel--substrate button[type='button'], .substrate-panel__row button");
    if (firstAlert) {
      await firstAlert.click();
    } else {
      // Fallback: any button inside the substrate panel.
      const anyBtn = await page.$(".panel--substrate button");
      if (anyBtn) await anyBtn.click();
    }
    await page.waitForTimeout(200);
  }

  // Hide the DemoPrompt overlay for screens 2-6 so the underlying watchfloor
  // surface is visible. Phase 1 is the cold-open and the prompt is part of
  // the design; later phases overlay it on the case panel and a designer
  // would want to see what's underneath. Press Escape — DemoPrompt listens
  // for it (DemoPrompt.tsx:93-100).
  if (screen.phase > 1) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
  }

  // Wait for the map to settle: maplibre fires an `idle` event when all
  // tile/feature work is done. We hop into the map instance via the global
  // canvas → MapWatchfloor stores its map reference on the canvas's parent.
  // If we can't find one (component variants without a map), proceed.
  await page.evaluate(async () => {
    const canvas = document.querySelector("canvas.maplibregl-canvas");
    if (!canvas) return;
    const map = canvas?.["_mapInstance"] ?? canvas?.parentElement?.["_mapInstance"];
    if (!map || typeof map.once !== "function") return;
    if (!map.loaded || !map.loaded()) {
      await new Promise((resolve) => map.once("load", resolve));
    }
    if (!map.isStyleLoaded || !map.isStyleLoaded()) {
      await new Promise((resolve) => map.once("idle", resolve));
    }
  });

  // Final settle for any CSS transitions (zone1 verb keyframe, dragon-fold).
  await page.waitForTimeout(600);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
