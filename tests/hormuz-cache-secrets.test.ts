import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { repoUrl } from "./helpers/optional.ts";

const liveCacheDir = repoUrl("fixtures/maritime/live-cache/");
const fixturesDir = repoUrl("fixtures/maritime/");

const RAW_CRED_VALUE_PATTERNS: { name: string; re: RegExp }[] = [
  { name: "access_token value", re: /"access[_-]?token"\s*:\s*"[^"]+"/i },
  { name: "refresh_token value", re: /"refresh[_-]?token"\s*:\s*"[^"]+"/i },
  { name: "id_token value", re: /"id[_-]?token"\s*:\s*"[^"]+"/i },
  { name: "api_key value", re: /"api[_-]?key"\s*:\s*"[^"]+"/i },
  { name: "client_secret value", re: /"client[_-]?secret"\s*:\s*"[^"]+"/i },
  { name: "password value", re: /"password"\s*:\s*"[^"]+"/i },
  { name: "authorization header", re: /"authorization"\s*:\s*"[^"]+"/i },
  { name: "bearer token", re: /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}/ },
  {
    name: "unredacted credential URL parameter",
    re: /[?&](?:api[_-]?key|access[_-]?token|client[_-]?secret|password)=(?!<redacted>|%3Credacted%3E)[^&"<>\s]{6,}/i
  }
];

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const CREDENTIAL_FILE_RE = /(?:-auth|-api-info|-credential-check)\.json$|^manifest(?:-[\w-]+)?\.json$/;

const KNOWN_LEAK_STRINGS = ["M3mb3r$4L!f3"];

function listScannableFiles(dir: URL): string[] {
  return readdirSync(dir).filter((name) => /\.(json|html)$/.test(name));
}

function readText(dir: URL, name: string): string {
  return readFileSync(new URL(name, dir), "utf8");
}

describe("Hormuz cache hygiene — no credential leakage", () => {
  it("raw live-cache files contain no credential values or known leaks", () => {
    const files = listScannableFiles(liveCacheDir);
    assert.ok(files.length > 0, "expected live-cache files to scan");

    for (const name of files) {
      const text = readText(liveCacheDir, name);
      for (const { name: patternName, re } of RAW_CRED_VALUE_PATTERNS) {
        assert.doesNotMatch(text, re, `${name}: ${patternName}`);
      }
      for (const leak of KNOWN_LEAK_STRINGS) {
        assert.ok(
          !text.includes(leak),
          `${name}: must not contain known leak string`
        );
      }
    }
  });

  it("credential-check and manifest files contain no email addresses", () => {
    const files = readdirSync(liveCacheDir).filter((name) =>
      CREDENTIAL_FILE_RE.test(name)
    );
    assert.ok(
      files.length > 0,
      "expected at least one auth/manifest/credential-check file"
    );

    for (const name of files) {
      const text = readText(liveCacheDir, name);
      assert.doesNotMatch(text, EMAIL_RE, `${name}: must not contain email`);
    }
  });

  it("normalized hormuz-* fixtures contain no credential values", () => {
    const files = readdirSync(fixturesDir).filter(
      (name) => name.startsWith("hormuz-") && name.endsWith(".json")
    );
    assert.ok(files.length > 0, "expected normalized hormuz-* fixtures");

    for (const name of files) {
      const text = readText(fixturesDir, name);
      for (const { name: patternName, re } of RAW_CRED_VALUE_PATTERNS) {
        assert.doesNotMatch(text, re, `${name}: ${patternName}`);
      }
      for (const leak of KNOWN_LEAK_STRINGS) {
        assert.ok(
          !text.includes(leak),
          `${name}: must not contain known leak string`
        );
      }
    }
  });
});
