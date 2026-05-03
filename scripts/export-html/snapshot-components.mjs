// Drives the snapshot.html harness route for each registered component and
// writes a self-contained HTML snapshot of its isolated render.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import { serializePage } from "./serialize.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "..", "export", "html", "components");

const BASE_URL = process.env.SNAPSHOT_BASE_URL ?? "http://localhost:5173";

async function main() {
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  // Discover the registry from the harness itself — it exposes a static list
  // via window.__SNAPSHOT_REGISTRY__ when ?registry=1 is in the URL.
  await page.goto(`${BASE_URL}/snapshot.html?registry=1`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector("[data-snapshot-frame], ul"), {
    timeout: 15_000
  });
  // The Catalog renders a list of <a href="?component=X"> links — scrape names.
  const names = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll("a[href*='?component=']"));
    return links
      .map((a) => {
        const url = new URL(a.getAttribute("href") ?? "", window.location.href);
        return url.searchParams.get("component");
      })
      .filter(Boolean);
  });

  if (names.length === 0) {
    throw new Error("Harness catalog returned 0 components — registry likely failed to load.");
  }

  for (const name of names) {
    process.stdout.write(`  ${name}.html … `);
    try {
      await page.goto(`${BASE_URL}/snapshot.html?component=${encodeURIComponent(name)}`, {
        waitUntil: "domcontentloaded"
      });
      // Wait for the harness <Frame> to appear, which means scenario fixtures
      // have loaded and the component has rendered at least once.
      await page.waitForSelector("[data-snapshot-target]", { timeout: 15_000 });
      // Tiny settle for any useEffect-driven state.
      await page.waitForTimeout(250);

      const { html, byteLength, canvasCount } = await serializePage(page, {
        title: `Liminal Custody — ${name}`,
        canvasFormat: "png"
      });
      await writeFile(join(outDir, `${name}.html`), html, "utf8");
      process.stdout.write(`ok (${(byteLength / 1024).toFixed(0)} KB${canvasCount ? `, ${canvasCount} canvas` : ""})\n`);
    } catch (err) {
      process.stdout.write(`FAIL\n    ${err instanceof Error ? err.stack : String(err)}\n`);
    }
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
