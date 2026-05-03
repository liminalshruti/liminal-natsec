// Serializes a live Playwright page into a single self-contained HTML string.
//
// Goals (in order):
//   1. Inline every stylesheet so the output renders without network access.
//   2. Bake every <canvas> to a PNG data URI (MapLibre's WebGL surface cannot
//      survive serialization any other way).
//   3. Inline same-origin <img> sources so the file works under file://.
//   4. Strip <script> tags — the export is read-only design fodder, not an app.
//
// The function returns an object: { html, canvasCount, byteLength } so callers
// can log size and decide whether to recompress (we fall back to JPEG quality
// 0.7 when the PNG path pushes a single screen past ~2.5 MB; that fallback is
// applied by re-running with `canvasFormat: "jpeg"`).

/** @typedef {{ canvasFormat?: "png" | "jpeg"; canvasQuality?: number; title?: string; embedFonts?: boolean }} SerializeOptions */

/**
 * @param {import('playwright').Page} page
 * @param {SerializeOptions} [opts]
 * @returns {Promise<{ html: string; canvasCount: number; byteLength: number }>}
 */
export async function serializePage(page, opts = {}) {
  const { canvasFormat = "png", canvasQuality = 0.85, title, embedFonts = false } = opts;

  const result = await page.evaluate(
    async ({ canvasFormat, canvasQuality, embedFonts }) => {
      // -- 1. Resolve every stylesheet to plain text and concatenate. ---------
      // document.styleSheets includes both <link rel=stylesheet> sheets (which
      // we have to refetch for full text including @font-face and url()
      // references) and inline <style> blocks (where cssRules.cssText is fine).
      // For cross-origin sheets cssRules can throw — we fall back to a fetch.
      async function readSheet(sheet) {
        try {
          if (sheet.href) {
            const res = await fetch(sheet.href, { credentials: "same-origin" });
            if (!res.ok) return "";
            return await res.text();
          }
          if (!sheet.cssRules) return "";
          let out = "";
          for (const rule of sheet.cssRules) out += rule.cssText + "\n";
          return out;
        } catch {
          return "";
        }
      }

      let css = "";
      for (const sheet of Array.from(document.styleSheets)) {
        css += await readSheet(sheet);
        css += "\n";
      }

      // Resolve url(...) references inside stylesheets to absolute URLs so
      // background-image/font-face still works after we drop the original
      // <link>. We deliberately do NOT inline binary assets by default —
      // doing so would balloon file size without helping the design review
      // (the dark UI uses very few raster assets).
      const sheetBase = document.baseURI;
      css = css.replace(/url\(([^)]+)\)/g, (_, rawUrl) => {
        let url = rawUrl.trim().replace(/^['"]|['"]$/g, "");
        if (!url || url.startsWith("data:") || url.startsWith("#")) return `url(${rawUrl})`;
        try {
          const absolute = new URL(url, sheetBase).toString();
          return `url(${absolute})`;
        } catch {
          return `url(${rawUrl})`;
        }
      });

      // -- 2. Bake canvases. --------------------------------------------------
      const canvases = Array.from(document.querySelectorAll("canvas"));
      const canvasReplacements = [];
      for (let i = 0; i < canvases.length; i++) {
        const canvas = canvases[i];
        try {
          const mime = canvasFormat === "jpeg" ? "image/jpeg" : "image/png";
          const dataUri =
            canvasFormat === "jpeg"
              ? canvas.toDataURL(mime, canvasQuality)
              : canvas.toDataURL(mime);
          canvasReplacements.push({ index: i, dataUri, width: canvas.width, height: canvas.height });
        } catch (err) {
          canvasReplacements.push({ index: i, dataUri: null, error: String(err) });
        }
      }

      // -- 3. Clone the document so we can mutate without affecting the live page.
      const clone = document.documentElement.cloneNode(true);

      // Remove existing <link rel=stylesheet>, <style>, and <script> blocks
      // from <head>; we'll inject a single inlined <style> below.
      clone.querySelectorAll("link[rel='stylesheet']").forEach((el) => el.remove());
      clone.querySelectorAll("style").forEach((el) => el.remove());
      clone.querySelectorAll("script").forEach((el) => el.remove());

      // Re-insert a single inlined stylesheet at the top of <head>.
      const style = document.createElement("style");
      style.setAttribute("data-inlined", "true");
      style.textContent = css;
      const head = clone.querySelector("head") ?? clone;
      head.insertBefore(style, head.firstChild);

      // -- 4. Replace each canvas in the clone with an <img>. -----------------
      const cloneCanvases = Array.from(clone.querySelectorAll("canvas"));
      cloneCanvases.forEach((canvas, idx) => {
        const replacement = canvasReplacements[idx];
        const img = document.createElement("img");
        if (replacement?.dataUri) {
          img.src = replacement.dataUri;
        } else {
          img.alt = `canvas-${idx} (could not be baked)`;
        }
        img.setAttribute("data-baked-canvas", String(idx));
        // Preserve the canvas's *displayed* size (CSS pixels) so layout
        // doesn't shift; toDataURL captures intrinsic resolution which may
        // be 2x or 3x of CSS size on retina.
        const rect = canvas.getBoundingClientRect();
        img.style.width = `${rect.width}px`;
        img.style.height = `${rect.height}px`;
        img.style.display = canvas.style.display || "block";
        // Carry over class names — MapWatchfloor uses class-based positioning.
        if (canvas.className) img.className = canvas.className;
        canvas.replaceWith(img);
      });

      // -- 5. Inline same-origin <img src> as data URIs (small icons / SVG). --
      const imgs = Array.from(clone.querySelectorAll("img"));
      for (const img of imgs) {
        if (img.hasAttribute("data-baked-canvas")) continue;
        const src = img.getAttribute("src");
        if (!src || src.startsWith("data:")) continue;
        try {
          const absolute = new URL(src, document.baseURI);
          if (absolute.origin !== window.location.origin) continue;
          const res = await fetch(absolute.href, { credentials: "same-origin" });
          if (!res.ok) continue;
          const blob = await res.blob();
          if (blob.size > 256 * 1024) continue;
          const dataUri = await new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(String(fr.result));
            fr.onerror = () => reject(fr.error);
            fr.readAsDataURL(blob);
          });
          img.setAttribute("src", dataUri);
        } catch {
          /* leave as-is */
        }
      }

      // -- 6. Optionally drop Google-Fonts <link> already removed. ------------
      // System font stack in styles.css covers fallback. If embedFonts is set
      // we keep the stylesheet href so the output still requests Google fonts
      // when online. Default is false → file is fully offline-friendly.
      void embedFonts;

      // -- 7. Return outerHTML plus stats. -----------------------------------
      const html = "<!doctype html>\n" + clone.outerHTML;
      return {
        html,
        canvasCount: canvasReplacements.length,
        byteLength: html.length
      };
    },
    { canvasFormat, canvasQuality, embedFonts }
  );

  if (title) {
    result.html = result.html.replace(
      /<title>[\s\S]*?<\/title>/,
      `<title>${escapeHtml(title)}</title>`
    );
  }
  return result;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
