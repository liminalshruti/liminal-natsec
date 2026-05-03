// Builds export/html/index.html — a static landing page linking to every
// generated screen and component snapshot. Reads the actual files on disk so
// the index reflects whatever made it through (failures don't get linked).

import { readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "export", "html");

async function listHtml(subdir) {
  try {
    const entries = await readdir(join(root, subdir));
    return entries.filter((entry) => entry.endsWith(".html")).sort();
  } catch {
    return [];
  }
}

function listItem(href, label) {
  return `      <li><a href="${href}">${escape(label)}</a></li>`;
}

function escape(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function main() {
  const screens = await listHtml("screens");
  const components = await listHtml("components");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Liminal Custody — UI/UX export</title>
    <style>
      :root { color-scheme: dark; }
      body {
        margin: 0;
        padding: 48px 64px;
        background: #0c1116;
        color: #e6edf3;
        font-family: 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 13px;
        line-height: 1.6;
      }
      h1 { font-size: 18px; letter-spacing: 0.16em; text-transform: uppercase; margin: 0 0 4px; }
      h2 { font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase; color: #7d8b97; margin: 32px 0 8px; }
      p  { color: #7d8b97; max-width: 720px; }
      ul { list-style: none; padding: 0; columns: 2; column-gap: 48px; max-width: 1100px; }
      li { break-inside: avoid; margin: 4px 0; }
      a  { color: #5fa8d3; text-decoration: none; }
      a:hover { text-decoration: underline; }
      code { color: #e6edf3; background: #1a2129; padding: 1px 6px; border-radius: 3px; }
    </style>
  </head>
  <body>
    <h1>Liminal Custody — UI/UX export</h1>
    <p>
      Self-contained HTML snapshots of every scripted demo beat (full screens) and every
      reviewable component in isolation. Open any file directly in a browser; no server
      required. WebGL surfaces (the MapLibre watchfloor) have been baked to a static
      raster image, so the map is frozen at the captured moment.
    </p>
    <h2>Scripted demo screens</h2>
    <ul>
${screens.map((file) => listItem(`screens/${file}`, file.replace(/\.html$/, ""))).join("\n")}
    </ul>
    <h2>Components — isolated renders</h2>
    <ul>
${components.map((file) => listItem(`components/${file}`, file.replace(/\.html$/, ""))).join("\n")}
    </ul>
  </body>
</html>
`;

  await writeFile(join(root, "index.html"), html, "utf8");
  process.stdout.write(`  index.html ok (${screens.length} screens, ${components.length} components)\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
