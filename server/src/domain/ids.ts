import { createHash } from "node:crypto";

export function stableId(prefix: string, ...parts: string[]): string {
  const raw = [prefix, ...parts.map((part) => part.trim().toLowerCase()).filter(Boolean)].join(
    "|"
  );
  return `${prefix}:${createHash("sha1").update(raw).digest("hex").slice(0, 12)}`;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortJson(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortJson(nested)])
    );
  }

  return value;
}

export function sha256Json(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}
