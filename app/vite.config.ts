import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const fixturesRoot = join(repoRoot, "fixtures");
const serverTarget = process.env.SEAFORGE_SERVER_URL ?? "http://localhost:8787";
const proxiedPaths = [
  "/scenario",
  "/stream",
  "/anomalies",
  "/actions",
  "/provenance",
  "/replay",
  "/real",
  "/ingest",
  "/health"
];

const MIME: Record<string, string> = {
  ".json": "application/json; charset=utf-8",
  ".geojson": "application/geo+json; charset=utf-8",
  ".jsonl": "application/x-ndjson; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

function fixtureMiddleware(): Plugin {
  return {
    name: "seaforge-fixture-middleware",
    configureServer(server) {
      server.middlewares.use("/fixtures", (req, res, next) => {
        if (!req.url) return next();
        const requested = decodeURIComponent(req.url.split("?")[0]);
        const absolute = normalize(join(fixturesRoot, requested));
        if (!absolute.startsWith(fixturesRoot)) {
          res.statusCode = 403;
          res.end("forbidden");
          return;
        }
        if (!existsSync(absolute) || !statSync(absolute).isFile()) {
          return next();
        }
        const mime = MIME[extname(absolute).toLowerCase()] ?? "application/octet-stream";
        res.setHeader("content-type", mime);
        res.setHeader("cache-control", "no-store");
        createReadStream(absolute).pipe(res);
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), fixtureMiddleware()],
  resolve: {
    alias: {
      "@app": fileURLToPath(new URL("./src", import.meta.url)),
      "@server": `${repoRoot}/server/src`,
      "@shared": `${repoRoot}/shared`,
      "@graph-spine": `${repoRoot}/graph-spine`,
      "@fixtures": `${repoRoot}/fixtures`
    }
  },
  server: {
    port: 5173,
    host: "0.0.0.0",
    fs: { allow: [repoRoot] },
    proxy: Object.fromEntries(
      proxiedPaths.map((path) => [path, { target: serverTarget, changeOrigin: true }])
    )
  }
});
